import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
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
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed', 'no_show'],
      default: 'pending',
      index: true,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    lateCancellation: {
      type: Boolean,
      default: false,
    },
    decisionNote: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    slotKeys: {
      type: [String],
      default: [],
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for range & status queries
bookingSchema.index({ resource: 1, startAt: 1, endAt: 1, status: 1 });

// Race safety: Partial unique index on slotKeys applying only to active bookings
bookingSchema.index(
  { slotKeys: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'approved'] },
    },
  }
);

export const Booking = mongoose.model('Booking', bookingSchema);
