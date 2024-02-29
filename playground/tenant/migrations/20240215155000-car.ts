import { defineMigration } from '@antify/database';

export default defineMigration({
  async up(client) {
    console.log('Migrate car up for tenant');
  },

  async down(client) {
    console.log('Migrate car down for tenant');
  },
});
