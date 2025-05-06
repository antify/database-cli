import {defineSchema} from '@antify/database';
import {Schema} from 'mongoose';

export default defineSchema(() => {
  console.log('Define car schema for tenant');

  return {
    name: 'cars',
    schema: new Schema({
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
    })
  }
});
