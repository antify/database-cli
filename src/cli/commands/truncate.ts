import consola from 'consola';
import {defineDbCommand} from './index';
import {resolve} from 'pathe';
import {
  SingleConnectionClient,
  MultiConnectionClient,
  truncateAllCollections,
  truncateCollections, getDatabaseClient
} from '@antify/database';
import {validateDatabaseName, validateHasTenantId} from '../utils/validate';
import * as dotenv from 'dotenv';

export default defineDbCommand({
  meta: {
    name: 'truncate',
    usage: 'db truncate [databaseName] [--tenant] [--collections]',
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
    const client = await getDatabaseClient(databaseName, projectRootDir);

    if (
      client instanceof MultiConnectionClient &&
      tenantId &&
      !validateHasTenantId(await client.getConfiguration().fetchTenants(), tenantId)
    ) {
      return;
    }

    const truncate = async (client: SingleConnectionClient | MultiConnectionClient) => {
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
    if (client instanceof MultiConnectionClient && tenantId) {
      await client.connect(tenantId);

      return await truncate(client);
    }

    /**
     * User want to truncate a single connection
     */
    if (client instanceof SingleConnectionClient) {
      await client.connect();

      return await truncate(client);
    }

    /**
     * User want to truncate a multi connection
     */
    if (client instanceof MultiConnectionClient) {
      const tenants = await client.getConfiguration().fetchTenants();

      for (const tenant of tenants) {
        await client.connect(tenant.id);
        await truncate(client);
      }

      return consola.success(`All databases truncated\n`);
    }

    throw new Error('Unhandled combination of parameters');
  },
});
