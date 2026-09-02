import { defineMigration } from '@antify/database';

export default defineMigration({
  async up() {
    console.log('Migrate car up for tenant');
  },

  async down() {
    console.log('Migrate car down for tenant');
  },
});
