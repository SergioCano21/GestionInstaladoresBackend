import mongoose, { Model, Schema } from 'mongoose';
import { IStore } from '../types/models';

const StoreSchema: Schema = new Schema<IStore>(
  {
    name: {
      type: String,
      required: true,
    },
    numStore: {
      type: Number,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    district: {
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

const Store: Model<IStore> = mongoose.model<IStore>('Store', StoreSchema);

export default Store;
