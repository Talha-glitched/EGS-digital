import mongoose from 'mongoose';

const pageSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    route: {
      type: String,
      required: true,
      trim: true,
    },
    sourceFile: {
      type: String,
      required: true,
      trim: true,
    },
    bodyHtml: {
      type: String,
      required: true,
    },
    pageCss: {
      type: String,
      default: '',
    },
    sharedCss: {
      type: String,
      default: '',
    },
    scripts: {
      type: [String],
      default: [],
    },
    seedSource: {
      type: String,
      default: 'legacy-html',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Page = mongoose.models.Page || mongoose.model('Page', pageSchema);
