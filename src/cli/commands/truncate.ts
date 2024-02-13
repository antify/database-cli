import consola from 'consola';
import { defineDbCommand } from './index';
import { resolve } from 'pathe';
import {
  SingleConnectionClient,
  MultiConnectionClient,
  truncateAllCollections,
  migrateUpToEnd,
  Migrator,
  Client,
  DatabaseConfiguration,
  truncateCollections
} from '@antify/database';
import { loadDatabaseConfig } from '../utils/load-database-config';
import { bold } from 'colorette';
import { validateDatabaseName, validateHasTenantId } from '../utils/validate';
import * as dotenv from 'dotenv';

export default defineDbCommand({
  meta: {
    name: 'load-fixtures',
    usage: 'db load-fixtures [databaseName] [--tenant] [--collections]',
    description: 'Truncate one or multiple databases. Call multiple collections comma separated (without spaces!).',
  },
  async invoke(args) {
    dotenv.config();

    const databaseName = args._[0]?.trim();
    const collections = args['collections']?.split(',').map((collection) => collection.trim());
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

    const truncate = async (client: Client) => {
      if (collections) {
        await truncateCollections(client.getConnection(), collections);
      } else {
        await truncateAllCollections(client.getConnection());
      }

      const _collections = collections ? collections.join('|') : ['all collections'];

      consola.success(`Truncated ${_collections} in database ${client.getConnection().name}`)
    }

    /**
     * User want to truncate only a specific tenant
     */
    if (databaseConfig.isSingleConnection === false && tenantId) {
      const client = await MultiConnectionClient.getInstance(
        databaseConfig
      ).connect(tenantId);

      return await truncate(client);
    }

    /**
     * User want to truncate a single connection
     */
    if (databaseConfig.isSingleConnection === true) {
      const client = await SingleConnectionClient.getInstance(
        databaseConfig
      ).connect();

      return await truncate(client);
    }

    /**
     * User want to truncate a multi connection
     */
    if (databaseConfig.isSingleConnection === false) {
      const tenants = await databaseConfig.fetchTenants();

      for (const tenant of tenants) {
        const client = await MultiConnectionClient.getInstance(
          databaseConfig
        ).connect(tenant.id);

        await truncate(client);
      }

      return consola.success(`All databases truncated\n`);
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
