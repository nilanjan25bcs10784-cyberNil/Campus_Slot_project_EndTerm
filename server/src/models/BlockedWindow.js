import mongoose from 'mongoose';

const blockedWindowSchema = new mongoose.Schema(
  {
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
      index: true,
    },
    startAt: {
      type: Date,
      required: true,
      index: true,
    },
    endAt: {
      type: Date,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Fast range overlap check
blockedWindowSchema.index({ resource: 1, startAt: 1, endAt: 1 });

export const BlockedWindow = mongoose.model('BlockedWindow', blockedWindowSchema);
