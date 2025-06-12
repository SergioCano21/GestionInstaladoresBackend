import mongoose, { Model, Schema } from 'mongoose';
import { ICalendar } from '../types/models';

const CalendarSchema: Schema<ICalendar> = new Schema(
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
  },
  { timestamps: true },
);

const Calendar: Model<ICalendar> = mongoose.model<ICalendar>(
  'Calendar',
  CalendarSchema,
);

export default Calendar;
