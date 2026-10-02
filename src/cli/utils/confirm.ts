import {createInterface} from 'node:readline/promises';
import consola from 'consola';
import {bold, red} from 'colorette';
import type {DatabaseConfigurations} from '@antify/database';

export type ConfirmationDecision = 'proceed' | 'ask' | 'refuse-non-interactive' | 'declined';

/**
 * Pure decision logic for destructive commands.
 *
 * - `--yes` always proceeds.
 * - Without `--yes` and without a TTY the command must refuse.
 * - With a TTY the user is asked first; only an explicit "y"/"yes" proceeds (default is no).
 */
export const decideConfirmation = (input: {
  yes: boolean;
  isTTY: boolean;
  answer?: string;
}): ConfirmationDecision => {
  if (input.yes) {
    return 'proceed';
  }

  if (!input.isTTY) {
    return 'refuse-non-interactive';
  }

  if (input.answer === undefined) {
    return 'ask';
  }

  return /^y(es)?$/i.test(input.answer.trim()) ? 'proceed' : 'declined';
};

const URL_SCHEME = /^([a-z][a-z0-9+.-]*):\/\//i;
// host list: hostnames, IPv4/IPv6, ports, commas for replica sets, optional unix socket is not supported
const STRICT_HOSTS = /^[a-z0-9._,[\]%-]+(:\d+)?(,[a-z0-9._[\]%-]+(:\d+)?)*$/i;
const URL_HOSTS = /^([a-z0-9._:,[\]%-]+)(?=[/?#]|$)/i;

/**
 * Splits a connection url into scheme, hosts and the part after the hosts, without ever returning credentials.
 * Credentials end at the last "@" before the first "/", "?" or "#" (so a "@" in path, query or fragment is not
 * mistaken for the credentials end). A password may also contain a raw "/", "?" or "#"; that reading (last "@"
 * of the whole url) is only used when the part before the first delimiter can not be a host list.
 * Where both readings are plausible and differ, the url is not split (null), never a part of the credentials.
 */
const splitDatabaseUrl = (url: string): {scheme: string; hosts: string; rest: string} | null => {
  const trimmed = url.trim();
  const scheme = URL_SCHEME.exec(trimmed);

  if (!scheme) {
    return null;
  }

  const afterScheme = trimmed.slice(scheme[0].length);
  const prefixEnd = afterScheme.search(/[/?#]/);
  const prefix = prefixEnd === -1 ? afterScheme : afterScheme.slice(0, prefixEnd);
  const atPrefix = prefix.lastIndexOf('@');
  const atLast = afterScheme.lastIndexOf('@');
  let at = atPrefix;

  if (atPrefix !== atLast) {
    // readings differ: only trust the whole-url reading if the prefix can not be a host list (e.g. "user:pa" of "user:pa/ss@host")
    if (atPrefix !== -1 || STRICT_HOSTS.test(prefix)) {
      return null;
    }

    at = atLast;
  }

  const afterCredentials = at === -1 ? afterScheme : afterScheme.slice(at + 1);
  const hosts = URL_HOSTS.exec(afterCredentials);

  if (!hosts) {
    return null;
  }

  return {scheme: scheme[1], hosts: hosts[1], rest: afterCredentials.slice(hosts[1].length)};
};

/**
 * Returns "scheme://host[:port]" of a connection url. Credentials, path and query are dropped,
 * so the result is safe to print. Unsafe to split urls give "<unparsable url>".
 */
export const maskDatabaseUrl = (url: string): string => {
  const parts = splitDatabaseUrl(url);

  return parts ? `${parts.scheme}://${parts.hosts}` : '<unparsable url>';
};

/**
 * Returns the database name from the path of a connection url (null if there is none or the url is unparsable).
 */
export const getDatabaseNameFromUrl = (url: string): string | null => {
  const parts = splitDatabaseUrl(url);

  if (!parts) {
    return null;
  }

  const match = /^\/([^/?#]*)/.exec(parts.rest);

  return match && match[1] ? match[1] : null;
};

/**
 * Name of the database of a tenant. Same rule as `MultiConnectionClient.connect` in @antify/database:
 * `databasePrefix` (default "tenant_") plus tenant id.
 */
export const getTenantDatabaseName = (config: {databasePrefix?: string}, tenantId: string): string =>
  `${config.databasePrefix || 'tenant_'}${tenantId}`;

type DatabaseConfig = DatabaseConfigurations[string];

/**
 * Describes what a command is going to hit (config key, real database name, host), without credentials.
 */
export const describeDatabaseTarget = async (
  databaseName: string,
  config: DatabaseConfig,
  tenantId: string | null
): Promise<string> => {
  const host = maskDatabaseUrl(config.databaseUrl);

  if (config.isSingleConnection) {
    const realName = getDatabaseNameFromUrl(config.databaseUrl);

    return `database "${databaseName}" (single connection, real database name: ${realName ? `"${realName}"` : `none in url, driver default "test"`}) on ${host}`;
  }

  if (tenantId) {
    return `database "${databaseName}", tenant "${tenantId}" only (real database name: "${getTenantDatabaseName(config, tenantId)}"), on ${host}`;
  }

  const tenants = await config.fetchTenants();
  const names = tenants.map((tenant) => `${tenant.id} -> "${getTenantDatabaseName(config, tenant.id)}"`).join(', ');

  return `database "${databaseName}", ALL tenants (${tenants.length}${names ? ': ' + names : ''}), on ${host}`;
};

/**
 * Prints what is affected and asks for confirmation. Returns true if the command may proceed.
 * When it returns false, nothing must be changed and the command should return 'error' (exit code 1).
 */
export const confirmDestructive = async (
  args: {yes?: boolean; y?: boolean},
  action: string,
  targets: string[]
): Promise<boolean> => {
  consola.warn(`${bold(action)} will affect:`);

  for (const target of targets) {
    consola.log(`  - ${target}`);
  }

  const yes = Boolean(args.yes || args.y);
  const isTTY = Boolean(process.stdin.isTTY);
  let decision = decideConfirmation({yes, isTTY});

  if (decision === 'ask') {
    const rl = createInterface({input: process.stdin, output: process.stdout});
    let answer: string;

    try {
      answer = await rl.question('Continue? This cannot be undone. [y/N] ');
    } catch (error) {
      if ((error as {name?: string}).name !== 'AbortError') {
        throw error;
      }

      // Ctrl-C / Ctrl-D (AbortError): treat as "no"
      consola.error('Aborted.');

      return false;
    } finally {
      rl.close();
    }

    decision = decideConfirmation({yes, isTTY, answer});
  }

  if (decision === 'refuse-non-interactive') {
    consola.error(red('refusing to run a destructive command without --yes in a non-interactive shell'));

    return false;
  }

  if (decision === 'declined') {
    consola.error('Aborted, nothing was changed.');

    return false;
  }

  return true;
};
