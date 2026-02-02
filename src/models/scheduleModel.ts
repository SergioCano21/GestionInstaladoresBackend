import mongoose, { Model, Schema } from 'mongoose';
import { ISchedule } from '../types/models';
import { SCHEDULE_OPTIONS } from '../constants/schedule';

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
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
    },
    installerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Installer',
    },
    type: {
      type: String,
      enum: Object.values(SCHEDULE_OPTIONS),
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
