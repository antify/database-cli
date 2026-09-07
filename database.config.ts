import {defineDatabaseConfig} from '@antify/database';

export default defineDatabaseConfig({
  core: {
    databaseUrl: 'mongodb://localhost:27017/core?directConnection=true',
    isSingleConnection: true,
    migrationDir: './playground/core/migrations',
    fixturesDir: './playground/core/fixtures',
    schemasDir: './playground/core/schemas',
  },
  tenant: {
    databaseUrl: 'mongodb://localhost:27017/?directConnection=true',
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
