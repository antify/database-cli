import consola from 'consola';
import {defineDbCommand} from './index';
import {resolve} from 'pathe';
import {
  SingleConnectionClient,
  MultiConnectionClient,
  getDatabaseClient,
  dropDatabase,
  dropDatabaseMulti,
  MultiConnectionDropDatabaseCallbacks,
  DropDatabaseResult,
  loadDatabaseConfiguration,
} from '@antify/database';
import {bold} from 'colorette';
import {validateDatabaseName, validateHasTenantId} from '../utils/validate';
import {confirmDestructive, describeDatabaseTarget} from '../utils/confirm';
import * as dotenv from 'dotenv';

export default defineDbCommand({
  meta: {
    name: 'drop-database',
    usage: 'db drop-database [databaseName] [--tenant] [--yes]',
    description: 'DESTRUCTIVE: Drop one or multiple databases. Asks for confirmation, use --yes (-y) to skip it.',
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
    const client = getDatabaseClient(databaseName, loadDatabaseConfiguration(true, projectRootDir));

    if (
      client instanceof MultiConnectionClient &&
      tenantId &&
      !validateHasTenantId(await client.getConfiguration().fetchTenants(), tenantId)
    ) {
      return;
    }

    const confirmed = await confirmDestructive(
      args,
      'drop-database',
      [await describeDatabaseTarget(databaseName, client.getConfiguration(), tenantId)]
    );

    if (!confirmed) {
      return 'error';
    }

    /**
     * User want to load fixtures for only a specific tenant
     */
    if (client instanceof MultiConnectionClient && tenantId) {
      await client.connect(tenantId);

      return await dropSingleDatabase(client, databaseName, tenantId);
    }

    /**
     * User want to load fixtures for a single connection
     */
    if (client instanceof SingleConnectionClient) {
      await client.connect();

      return await dropSingleDatabase(client, databaseName);
    }

    /**
     * User want to load fixtures for a multi connection
     */
    if (client instanceof MultiConnectionClient) {
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

      return await dropDatabaseMulti(client, callbacks);
    }

    throw new Error('Unhandled combination of parameters');
  },
});

const dropSingleDatabase = async (
  client: SingleConnectionClient | MultiConnectionClient,
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
