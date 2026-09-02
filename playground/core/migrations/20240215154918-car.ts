import { defineMigration } from '@antify/database';

export default defineMigration({
  async up() {
    console.log('Migrate car up');
  },

  async down() {
    console.log('Migrate car down');
  },
});
