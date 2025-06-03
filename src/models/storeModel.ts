import mongoose, { Model, Schema } from 'mongoose';
import { IStore } from '../types/models';

const StoreSchema: Schema = new Schema<IStore>(
  {
    name: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

StoreSchema.index({ name: 1, city: 1, state: 1 }, { unique: true });

const Store: Model<IStore> = mongoose.model<IStore>('Store', StoreSchema);

export default Store;
