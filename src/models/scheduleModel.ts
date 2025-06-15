import mongoose, { Model, Schema } from 'mongoose';
import { ISchedule } from '../types/models';

const ScheduleSchema: Schema<ISchedule> = new Schema(
  {
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    installerId: {
      type: Number,
      ref: 'Installer',
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
    },
    type: {
      type: String,
      enum: ['Service', 'Block'],
      required: true,
    },
    description: {
      type: String,
    },
  },
  { timestamps: true },
);

const Schedule: Model<ISchedule> = mongoose.model<ISchedule>(
  'Schedule',
  ScheduleSchema,
);

export default Schedule;
