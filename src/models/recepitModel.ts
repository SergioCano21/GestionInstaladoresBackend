import mongoose, { Model, Schema } from 'mongoose';
import { IReceipt } from '../types/models';

const ReceiptSchema: Schema<IReceipt> = new Schema(
  {
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    installerName: {
      type: String,
      required: true,
    },
    installedProduct: {
      type: [
        {
          installedProduct: {
            type: String,
            required: true,
          },
          installedIn: {
            type: String,
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
          },
          specification: {
            type: String,
          },
          serialNumber: {
            type: String,
          },
        },
      ],
      required: true,
    },
    recommendations: {
      type: String,
    },
    clientComments: {
      type: String,
    },
    images: {
      type: [
        {
          type: String,
        },
      ],
      required: true,
    },
    clientSignature: {
      type: String,
      required: true,
    },
    isClientAbsent: {
      type: Boolean,
      required: true,
    },
    relationshipWithClient: {
      type: String,
    },
    secondaryClientName: {
      type: String,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
  },
  { timestamps: true },
);

const Receipt: Model<IReceipt> = mongoose.model<IReceipt>(
  'Receipt',
  ReceiptSchema,
);

export default Receipt;
