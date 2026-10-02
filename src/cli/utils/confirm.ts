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

/**
 * Returns "scheme://host[:port]" of a connection url. Credentials, path and query are dropped,
 * so the result is safe to print.
 */
export const maskDatabaseUrl = (url: string): string => {
  const match = /^([a-z][a-z0-9+.-]*):\/\/(?:[^/?#]*@)?([^/?#]*)/i.exec(url.trim());

  return match ? `${match[1]}://${match[2]}` : '<unparsable url>';
};

type DatabaseConfig = DatabaseConfigurations[string];

/**
 * Describes what a command is going to hit, without credentials.
 */
export const describeDatabaseTarget = async (
  databaseName: string,
  config: DatabaseConfig,
  tenantId: string | null
): Promise<string> => {
  const host = maskDatabaseUrl(config.databaseUrl);

  if (config.isSingleConnection) {
    return `database "${databaseName}" (single connection) on ${host}`;
  }

  if (tenantId) {
    return `database "${databaseName}", tenant "${tenantId}" only, on ${host}`;
  }

  const tenants = await config.fetchTenants();
  const names = tenants.map((tenant) => tenant.id).join(', ');

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
