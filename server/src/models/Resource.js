import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['study_room', 'lab', 'court', 'equipment'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    openTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    closeTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    slotMinutes: {
      type: Number,
      enum: [30, 60],
      required: true,
    },
    maxDurationSlots: {
      type: Number,
      default: 4,
      min: 1,
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Resource = mongoose.model('Resource', resourceSchema);
