import mongoose, { Model, Schema } from 'mongoose';
import { IService } from '../types/models';

const ServiceSchema: Schema<IService> = new Schema(
  {
    folio: {
      type: Number,
      required: true,
      unique: true,
    },
    client: {
      type: String,
      required: true,
    },
    contact: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    jobDetails: {
      type: [
        {
          quantity: {
            type: Number,
            required: true,
          },
          description: {
            type: String,
            required: true,
          },
          installationServiceFee: {
            type: Number,
            required: true,
          },
          commissionFee: {
            type: Number,
            required: true,
          },
          installerPayment: {
            type: Number,
            required: true,
          },
        },
      ],
      required: true,
    },
    subtotals: {
      type: {
        installationServiceFee: {
          type: Number,
          required: true,
        },
        commissionFee: {
          type: Number,
          required: true,
        },
        installerPayment: {
          type: Number,
          required: true,
        },
      },
      required: true,
    },
    iva: {
      type: {
        installationServiceFee: {
          type: Number,
          required: true,
        },
        commissionFee: {
          type: Number,
          required: true,
        },
        installerPayment: {
          type: Number,
          required: true,
        },
      },
      required: true,
    },
    totals: {
      type: {
        installationServiceFee: {
          type: Number,
          required: true,
        },
        commissionFee: {
          type: Number,
          required: true,
        },
        installerPayment: {
          type: Number,
          required: true,
        },
      },
      required: true,
    },
    additionalComments: {
      type: String,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    installerId: {
      type: Number,
      ref: 'Installer',
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    status: {
      type: String,
      enum: ['To Do', 'Doing', 'Done'],
      required: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const Service: Model<IService> = mongoose.model<IService>(
  'Service',
  ServiceSchema,
);

export default Service;
