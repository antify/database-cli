import { defineFixture } from '@antify/database';
import { defineCars } from '../schemas/car.schema';

export default defineFixture({
  async load(client) {
    console.log('Load car fixture for core');

    await client.getModel(defineCars).insertMany([
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
