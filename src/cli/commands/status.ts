import {defineDbCommand} from './index';
import {resolve} from 'pathe';
import {splitByCase} from 'scule';
import {bgRed, bgYellow} from 'colorette';
import {validateDatabaseName, validateHasTenantId} from '../utils/validate';
import {
  MultiConnectionClient,
  SingleConnectionClient,
  makeMigrationState,
  getDatabaseClient
} from '@antify/database';
import * as dotenv from 'dotenv';

export default defineDbCommand({
  meta: {
    name: 'status',
    usage: 'db status [databaseName] [--tenant]',
    description: 'Show the migration status of the given database',
  },
  async invoke(args) {
    dotenv.config();

    const databaseName = args._[0]?.trim();
    let tenantId = args['tenant'] || null;

    if (args['tenantId']) {
      tenantId = `${tenantId}`.trim();
    }

    if (!validateDatabaseName(databaseName)) {
      return;
    }

    const projectRootDir = resolve(args.cwd || '.');
    const client = await getDatabaseClient(databaseName, projectRootDir);

    if (client instanceof SingleConnectionClient) {
      await client.connect();
    } else {
      const tenants = await client.getConfiguration().fetchTenants();

      if (tenantId === null) {
        for (const tenant of tenants) {
          await client.connect(tenant.id);
          await printState(client, projectRootDir, databaseName, tenant.id);

          console.log('\n');
        }

        return;
      }

      if (!validateHasTenantId(tenants, tenantId)) {
        return;
      }

      await client.connect(tenantId);
    }

    await printState(client, projectRootDir, databaseName, tenantId);
  },
});

const printState = async (
  client: SingleConnectionClient | MultiConnectionClient,
  projectRootDir: string,
  databaseName: string,
  tenantId: string | null
) => {
  const migrationState = await makeMigrationState(client, projectRootDir);

  let infoObj: Object = {
    ConnectionType: client.getConfiguration().isSingleConnection
      ? 'SingleConnection'
      : 'MultiConnection',
    MigrationsDirectory: client.getConfiguration().migrationDir,
    PreviousVersion: migrationState.prevVersion || '-',
    CurrentVersion: migrationState.currentVersion || '-',
    NextVersion: migrationState.nextVersion || '-',
    LatestVersion: migrationState.latestVersion || '-',
    ExecutedMigrations: migrationState.executed.length,
    ExecutedUnavailableMigrations:
      migrationState.missing.length > 0
        ? bgRed(migrationState.missing.length)
        : 0,
    AvailableMigrations: migrationState.available.length,
    NotExecutedMigrations:
      migrationState.notExecuted.length > 0
        ? bgYellow(migrationState.notExecuted.length)
        : 0,
  };

  if (client instanceof MultiConnectionClient && tenantId) {
    infoObj = {TenantId: tenantId, ...infoObj};
  }

  infoObj = {Name: databaseName, ...infoObj};

  let maxLength = 0;
  let infoStr = '';

  const entries = Object.entries(infoObj).map(([key, val]) => {
    const label = splitByCase(key).join(' ');
    if (label.length > maxLength) {
      maxLength = label.length;
    }
    return [label, val || '-'];
  });

  for (const [label, value] of entries) {
    infoStr +=
      '- ' + (label + ': ').padEnd(maxLength + 2) + ('`' + value + '`') + '\n';
  }

  const splitter = '-------------------------------------------------------';

  console.log(`Ant Database info: \n\n${splitter}\n${infoStr}${splitter}\n`);
};
