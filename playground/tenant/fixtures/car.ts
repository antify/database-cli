import { defineFixture } from '@antify/database';

export default defineFixture({
  async load(client) {
    console.log('Load car fixture for tenant');

    await client.getModel('cars').insertMany([
      {
        model: 'model1',
        manufacturer: 'manufacturer1',
        type: 'type1',
      }, {
        model: 'model2',
        manufacturer: 'manufacturer2',
        type: 'type2',
      }
    ]);
  },

  dependsOn() {
    return [];
  }
});
