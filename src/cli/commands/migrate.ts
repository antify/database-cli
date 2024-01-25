import consola from 'consola';
import { defineDbCommand } from './index';
import { resolve } from 'pathe';
import {
  MigrationExecutionResult,
  SingleConnectionClient,
  migrateUpToEnd,
  migrateUpTo,
  Migrator,
  MultiConnectionMigrationCallbacks,
  migrateTenantsUpTo,
  migrateTenantsUpToEnd,
  MultiConnectionClient,
  MigrationCallbacks,
} from '@antify/database';
import { loadDatabaseConfig } from '../utils/load-database-config';
import { bold } from 'colorette';
import { validateDatabaseName, validateHasTenantId } from '../utils/validate';
import * as dotenv from 'dotenv';

export default defineDbCommand({
  meta: {
    name: 'migrate',
    usage: 'db migrate [databaseName] [--migration] [--tenant] [--down]',
    description: 'Executes migrations',
  },
  async invoke(args) {
    dotenv.config();

    const migrationDirection = args['down'] ? 'down' : 'up';
    const databaseName = args._[0]?.trim();
    let migrationName = args['migration'] || null;
    let tenantId = args['tenant'] || null;

    if (args['migration']) {
      migrationName = `${migrationName}`.trim();
    }

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

    if (migrationDirection === 'down' && !migrationName) {
      return consola.error(
        `Missing required property "migration" to execute down migration`
      );
    }

    if (databaseConfig.isSingleConnection === true && tenantId) {
      return consola.error(
        `Can not migrate a single connection to a specific tenant`
      );
    }

    if (
      databaseConfig.isSingleConnection === false &&
      tenantId &&
      !validateHasTenantId(await databaseConfig.fetchTenants(), tenantId)
    ) {
      return;
    }

    const callbacks: MultiConnectionMigrationCallbacks = {
      onMigrationFinished: (executionResult: MigrationExecutionResult) => {
        if (executionResult.error) {
          return consola.error(executionResult.error.message);
        }

        if (executionResult.warning) {
          return consola.warn(executionResult.warning);
        }

        if (executionResult.info) {
          return consola.info(executionResult.info);
        }

        consola.success(
          `Migrated (took ${executionResult.executionTimeInMs} ms) `
        );
      },
      beforeMigrate: (migrationName: string) => {
        consola.info(`Migrating ${migrationName}`);
      },
      beforeMigrateTenant: (tenantId, tenantName) => {
        consola.info(
          `Execute migrations for tenant ${bold(tenantId)} (${tenantName})`
        );
      },
      onTenantMigrationsFinished(migrateTenantResult) {
        consola.log('\n');
      },
    };

    /**
     * User want to migrate only a specific tenant
     */
    if (databaseConfig.isSingleConnection === false && tenantId) {
      const client = await MultiConnectionClient.getInstance(
        databaseConfig
      ).connect(tenantId);

      return await migrateOneDatabase(
        new Migrator(client, databaseConfig, projectRootDir),
        migrationDirection,
        migrationName,
        callbacks
      );
    }

    /**
     * User want to migrate a single connection
     */
    if (databaseConfig.isSingleConnection === true) {
      const client = await SingleConnectionClient.getInstance(
        databaseConfig
      ).connect();

      return await migrateOneDatabase(
        new Migrator(client, databaseConfig, projectRootDir),
        migrationDirection,
        migrationName,
        callbacks
      );
    }

    /**
     * User want to migrate a multi connection
     */
    if (databaseConfig.isSingleConnection === false) {
      if (migrationDirection === 'up') {
        if (migrationName) {
          return await migrateTenantsUpTo(
            migrationName,
            databaseConfig,
            projectRootDir,
            callbacks
          );
        } else {
          return await migrateTenantsUpToEnd(
            databaseConfig,
            projectRootDir,
            callbacks
          );
        }
      } else {
        if (migrationName) {
          // TODO:: implement down migration
          return;
        } else {
          // TODO:: implement down migration
          return;
        }
      }
    }

    throw new Error('Unhandled combination of parameters');
  },
});

const migrateOneDatabase = async (
  migrator: Migrator,
  migrationDirection: string,
  migrationName: string | null,
  callbacks: MigrationCallbacks
): Promise<void> => {
  if (migrationDirection === 'up') {
    if (migrationName) {
      await migrateUpTo(migrationName, migrator, callbacks);
    } else {
      await migrateUpToEnd(migrator, callbacks);
    }
  } else {
    if (migrationName) {
      // TODO:: implement down migration
      return;
    } else {
      // TODO:: implement down migration
      return;
    }
  }
};
