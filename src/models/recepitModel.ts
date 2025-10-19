import mongoose, { Model, Schema } from 'mongoose';
import { IReceipt } from '../types/models';

const ReceiptSchema: Schema<IReceipt> = new Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
      unique: true,
    },
    receiptUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
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
