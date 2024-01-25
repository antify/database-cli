import consola from 'consola';
import { defineDbCommand } from './index';
import { resolve } from 'pathe';
import {
  LoadFixtureExecutionResult,
  SingleConnectionClient,
  MultiConnectionLoadFixtureCallbacks,
  MultiConnectionClient,
  loadFixturesMulticonnection,
  Client,
} from '@antify/database';
import { loadDatabaseConfig } from '../utils/load-database-config';
import { bold } from 'colorette';
import { validateDatabaseName, validateHasTenantId } from '../utils/validate';
import * as dotenv from 'dotenv';
import { dropDatabase } from '@antify/database';
import { dropDatabaseMulti } from '@antify/database';
import { MultiConnectionDropDatabaseCallbacks } from '@antify/database';
import { DropDatabaseResult } from '@antify/database';

export default defineDbCommand({
  meta: {
    name: 'drop-database',
    usage: 'db drop-database [databaseName] [--tenant]',
    description: 'Drop one or multiple databases',
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

    /**
     * User want to load fixtures for only a specific tenant
     */
    if (databaseConfig.isSingleConnection === false && tenantId) {
      const client = await MultiConnectionClient.getInstance(
        databaseConfig
      ).connect(tenantId);

      return await dropSingleDatabase(
        client,
        databaseName,
        tenantId
      );
    }

    /**
     * User want to load fixtures for a single connection
     */
    if (databaseConfig.isSingleConnection === true) {
      const client = await SingleConnectionClient.getInstance(
        databaseConfig
      ).connect();

      return await dropSingleDatabase(
        client,
        databaseName
      )
    }

    /**
     * User want to load fixtures for a multi connection
     */
    if (databaseConfig.isSingleConnection === false) {
      const callbacks: MultiConnectionDropDatabaseCallbacks = {
        beforeDropDatabase: (tenantId: string, tenantName: string) => {
          consola.info(`Drop database for tenant ${tenantName}` + (tenantId ? ` ${bold(tenantId)}` : ''));
        },
        onDropDatabaseFinished: (result: DropDatabaseResult) => {
          if (result.result.error) {
            return consola.error(result.result.error.message);
          }

          consola.success(
            `Database dropped (took ${result.result.executionTimeInMs} ms) `
          );
        },
        onNoDatabasesToDrop: () => {
          consola.info('There are no databases to delete');
        }
      };

      return await dropDatabaseMulti(databaseConfig, callbacks);
    }

    throw new Error('Unhandled combination of parameters');
  },
});

const dropSingleDatabase = async (
  client: Client,
  databaseName: string,
  tenantId?: string
): Promise<void> => {
  consola.info(
    `Drop database ${databaseName}` +
    (tenantId ? ` ${bold(tenantId)}` : '')
  );

  const result = await dropDatabase(client);

  if (!result.error) {
    consola.success(`Database dropped (took ${result.executionTimeInMs} ms)\n`);
  } else {
    consola.error(`Error while dropping database: ${result.error}`);
  }
};
