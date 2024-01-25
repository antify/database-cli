import consola from 'consola';
import { defineDbCommand } from './index';
import { resolve } from 'pathe';
import {
  LoadFixtureExecutionResult,
  SingleConnectionClient,
  MultiConnectionLoadFixtureCallbacks,
  MultiConnectionClient,
  loadFixtures,
  loadFixturesMulticonnection,
  truncateAllCollections,
  migrateUpToEnd,
  Migrator,
  Client,
  DatabaseConfiguration,
} from '@antify/database';
import { loadDatabaseConfig } from '../utils/load-database-config';
import { bold } from 'colorette';
import { validateDatabaseName, validateHasTenantId } from '../utils/validate';
import * as dotenv from 'dotenv';

export default defineDbCommand({
  meta: {
    name: 'load-fixtures',
    usage: 'db load-fixtures [databaseName] [--tenant]',
    description: 'Truncate database, load migrations and load fixtures',
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

    if (
      databaseConfig.isSingleConnection === false &&
      tenantId &&
      !validateHasTenantId(await databaseConfig.fetchTenants(), tenantId)
    ) {
      return;
    }

    const callbacks: MultiConnectionLoadFixtureCallbacks = {
      onLoadFixtureFinished: (executionResult: LoadFixtureExecutionResult) => {
        if (executionResult.error) {
          return consola.error(executionResult.error.message);
        }

        if (executionResult.info) {
          return consola.info(executionResult.info);
        }

        consola.success(
          `Loaded fixture (took ${executionResult.executionTimeInMs} ms) `
        );
      },
      beforeLoadFixture: (fixtureName: string) => {
        consola.info(`Loading fixture ${fixtureName}`);
      },
      beforeLoadFixtureTenant: (tenantId, tenantName) => {
        consola.info(
          `Load fixture for tenant ${bold(tenantId)} (${tenantName})`
        );
      },
      onTenantLoadFixturesFinished() {
        consola.log('\n');
      },
    };

    /**
     * User want to load fixtures for only a specific tenant
     */
    if (databaseConfig.isSingleConnection === false && tenantId) {
      const client = await MultiConnectionClient.getInstance(
        databaseConfig
      ).connect(tenantId);

      if (
        !(await resetSingleDatabase(
          client,
          databaseConfig,
          projectRootDir,
          databaseName,
          tenantId
        ))
      ) {
        return;
      }

      return await loadFixtures(
        databaseConfig,
        projectRootDir,
        client,
        callbacks
      );
    }

    /**
     * User want to load fixtures for a single connection
     */
    if (databaseConfig.isSingleConnection === true) {
      const client = await SingleConnectionClient.getInstance(
        databaseConfig
      ).connect();

      if (
        !(await resetSingleDatabase(
          client,
          databaseConfig,
          projectRootDir,
          databaseName,
          tenantId
        ))
      ) {
        return;
      }

      return await loadFixtures(
        databaseConfig,
        projectRootDir,
        client,
        callbacks
      );
    }

    /**
     * User want to load fixtures for a multi connection
     */
    if (databaseConfig.isSingleConnection === false) {
      const tenants = await databaseConfig.fetchTenants();

      /**
       * TODO:: Its not a nice dx that first all tenants databases get truncated and after that, all fixtures loaded for each tenant.
       * Truncate, migrate and load fixtures for each database one by one.
       */
      for (const tenant of tenants) {
        const client = await MultiConnectionClient.getInstance(
          databaseConfig
        ).connect(tenant.id);

        if (
          !(await resetSingleDatabase(
            client,
            databaseConfig,
            projectRootDir,
            databaseName,
            tenant.id
          ))
        ) {
          return;
        }
      }

      return await loadFixturesMulticonnection(
        databaseConfig,
        projectRootDir,
        callbacks
      );
    }

    throw new Error('Unhandled combination of parameters');
  },
});

const resetSingleDatabase = async (
  client: Client,
  databaseConfig: DatabaseConfiguration,
  projectRootDir: string,
  databaseName: string,
  tenantId: string | null
): Promise<boolean> => {
  consola.info(
    `Truncate database ${databaseName}` +
      (tenantId ? ` ${bold(tenantId)}` : '')
  );

  await truncateAllCollections(client.getConnection());

  consola.success(`Database truncated`);
  consola.info(`Load migrations`);

  const results = await migrateUpToEnd(
    new Migrator(client, databaseConfig, projectRootDir)
  );
  const errorResult = results.find((result) => result.error);

  if (errorResult) {
    consola.error(`Error while loading migrations: ${errorResult.error}`);
    return false;
  }

  consola.success(`Migrations loaded\n`);
  return true;
};
