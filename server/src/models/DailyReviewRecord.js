import mongoose from 'mongoose';

const DailyReviewRecordSchema = new mongoose.Schema(
  {
    businessDate: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    section: {
      type: String,
      required: true,
      enum: ['ongoing_jobs', 'key_relationships', 'leads'],
    },
    completedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedByName: {
      type: String,
      required: true,
      trim: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

DailyReviewRecordSchema.index({ businessDate: 1, section: 1 }, { unique: true });

export const DailyReviewRecord = mongoose.model('DailyReviewRecord', DailyReviewRecordSchema);
