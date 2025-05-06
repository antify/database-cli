import {resolve} from 'pathe';
import consola from 'consola';
import {bold} from 'colorette';
import * as dotenv from 'dotenv';
import {defineDbCommand} from './index';
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
  getDatabaseClient,
  loadDatabaseConfiguration
} from '@antify/database';
import {validateDatabaseName, validateHasTenantId} from '../utils/validate';

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
    const client = getDatabaseClient(databaseName, loadDatabaseConfiguration(true, projectRootDir));
    // TODO:: only use client.getConfiguration() instead of separate loaded config

    if (migrationDirection === 'down' && !migrationName) {
      return consola.error(
        `Missing required property "migration" to execute down migration`
      );
    }

    if (client instanceof SingleConnectionClient && tenantId) {
      return consola.error(
        `Can not migrate a single connection to a specific tenant`
      );
    }

    if (
      client instanceof MultiConnectionClient &&
      tenantId &&
      !validateHasTenantId(await client.getConfiguration().fetchTenants(), tenantId)
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
    if (client instanceof MultiConnectionClient && tenantId) {
      await client.connect(tenantId);

      return await migrateOneDatabase(
        new Migrator(client, projectRootDir),
        migrationDirection,
        migrationName,
        callbacks
      );
    }

    /**
     * User want to migrate a single connection
     */
    if (client instanceof SingleConnectionClient) {
      await client.connect();

      return await migrateOneDatabase(
        new Migrator(client, projectRootDir),
        migrationDirection,
        migrationName,
        callbacks
      );
    }

    /**
     * User want to migrate a multi connection
     */
    if (client instanceof MultiConnectionClient) {
      if (migrationDirection === 'up') {
        if (migrationName) {
          return await migrateTenantsUpTo(
            migrationName,
            client.getConfiguration(),
            projectRootDir,
            callbacks
          );
        } else {
          return await migrateTenantsUpToEnd(
            client.getConfiguration(),
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
