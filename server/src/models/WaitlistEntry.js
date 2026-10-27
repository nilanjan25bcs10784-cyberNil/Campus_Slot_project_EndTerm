import mongoose from 'mongoose';

const waitlistEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    status: {
      type: String,
      enum: ['waiting', 'promoted', 'expired', 'cancelled'],
      default: 'waiting',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique per (user, resource, date, startTime)
waitlistEntrySchema.index(
  { user: 1, resource: 1, date: 1, startTime: 1 },
  { unique: true }
);

// Fast lookup for oldest waiting entries by resource, date, and creation time
waitlistEntrySchema.index({ resource: 1, date: 1, status: 1, createdAt: 1 });

export const WaitlistEntry = mongoose.model('WaitlistEntry', waitlistEntrySchema);
