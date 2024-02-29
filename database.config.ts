import {defineDatabaseConfig} from '@antify/database';

export default defineDatabaseConfig({
  core: {
    databaseUrl: 'mongodb://core:core@localhost:27017/core',
    isSingleConnection: true,
    migrationDir: './playground/core/migrations',
    fixturesDir: './playground/core/fixtures',
    schemasDir: './playground/core/schemas',
  },
  tenant: {
    databaseUrl: 'mongodb://root:root@127.0.0.1:27017',
    isSingleConnection: false,
    migrationDir: './playground/tenant/migrations',
    fixturesDir: './playground/tenant/fixtures',
    schemasDir: './playground/tenant/schemas',
    fetchTenants: async () => [
      {
        id: '63c01b397e0e377e6647c013',
        name: 'First tenant',
      },
      {
        id: '63c01b397e0e377e6647c017',
        name: 'Second tenant',
      },
      {
        id: '63c01b397e0e377e6647c01a',
        name: 'Third tenant',
      },
    ],
  },
});
