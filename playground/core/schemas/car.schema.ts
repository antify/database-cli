import {defineSchema} from '@antify/database';

export default defineSchema((client) => {
  console.log('Define car schema for core');

  client.getSchema('cars').add({
    model: {
      type: String,
      required: true,
    },
    manufacturer: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
  });
});
