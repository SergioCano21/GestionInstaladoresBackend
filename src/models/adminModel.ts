import mongoose, { Model, Schema } from 'mongoose';
import { IAdmin } from '../types/models';

const AdminSchema: Schema = new Schema<IAdmin>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
    },
    role: {
      type: String,
      enum: ['local', 'city', 'state', 'national'],
      required: true,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    country: {
      type: String,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const Admin: Model<IAdmin> = mongoose.model<IAdmin>('Admin', AdminSchema);

export default Admin;
