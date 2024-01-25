import { defineAntDbCommand } from './index';
import { resolve } from 'pathe';
import { splitByCase } from 'scule';
import { bgRed, bgYellow, bold } from 'colorette';
import { loadDatabaseConfig } from '../utils/load-database-config';
import { validateDatabaseName, validateHasTenantId } from '../utils/validate';
import {
  MultiConnectionClient,
  SingleConnectionClient,
  Client,
  SingleConnectionDatabaseConfiguration,
  MultiConnectionDatabaseConfiguration,
  makeMigrationState,
} from '@antify/database';
import * as dotenv from 'dotenv';

export default defineAntDbCommand({
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
    const databaseConfig = loadDatabaseConfig(databaseName, projectRootDir);

    if (!databaseConfig) {
      return;
    }

    let client: SingleConnectionClient | MultiConnectionClient;

    if (databaseConfig.isSingleConnection === true) {
      client = await SingleConnectionClient.getInstance(
        databaseConfig
      ).connect();
    } else {
      const tenants = await databaseConfig.fetchTenants();

      if (tenantId === null) {
        client = MultiConnectionClient.getInstance(databaseConfig);

        for (const tenant of tenants) {
          await client.connect(tenant.id);
          await printState(
            client,
            databaseConfig,
            projectRootDir,
            databaseName,
            tenant.id
          );

          console.log('\n');
        }

        return;
      }

      if (!validateHasTenantId(tenants, tenantId)) {
        return;
      }

      client = await MultiConnectionClient.getInstance(databaseConfig).connect(
        tenantId
      );
    }

    await printState(
      client,
      databaseConfig,
      projectRootDir,
      databaseName,
      tenantId
    );
  },
});

const printState = async (
  client: Client,
  databaseConfig:
    | SingleConnectionDatabaseConfiguration
    | MultiConnectionDatabaseConfiguration,
  projectRootDir: string,
  databaseName: string,
  tenantId: string | null
) => {
  const migrationState = await makeMigrationState(
    client,
    projectRootDir,
    databaseConfig
  );

  let infoObj: Object = {
    ConnectionType: databaseConfig.isSingleConnection
      ? 'SingleConnection'
      : 'MultiConnection',
    MigrationsDirectory: databaseConfig.migrationDir,
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

  if (!databaseConfig.isSingleConnection && tenantId) {
    infoObj = { TenantId: tenantId, ...infoObj };
  }

  infoObj = { Name: databaseName, ...infoObj };

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
