import mongoose, { Model, Schema } from 'mongoose';
import { IInstaller } from '../types/models';

const InstallerSchema: Schema<IInstaller> = new Schema(
  {
    installerId: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    phone: {
      type: String,
    },
    company: {
      type: String,
      required: true,
    },
    storeId: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Store',
        },
      ],
      required: true,
    },
    password: {
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

const Installer: Model<IInstaller> = mongoose.model<IInstaller>(
  'Installer',
  InstallerSchema,
);

export default Installer;
