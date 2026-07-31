import mongoose from 'mongoose';

export const COMPLETED_JOB_CATEGORIES = {
  typesOfJob: [
    'Large Format Printing',
    'Retail Branding & Displays',
    'Off Set printing',
    'Exhibition Stands',
    'Signages Indoor & Outdoor',
    'Vehicle Branding',
    'Digital Screen',
    'Gift Items',
    'Corporate Events Branding',
    'Constuction Site Items',
    'PVC Plates',
    'Graduation Ceremonies',
    'Product Display Stand',
    'Mall Kiosks',
    'Event Branding',
    'Uniform',
    'Showroom & Office Branding',
  ],
  statuses: [
    'Inquiry',
    'Waiting Adv/ PO',
    'In Production',
    'Installation',
    'Waiting Balance Payment',
    'Job Done',
    'Quotation Sent',
    'Job Lost',
    'Design',
    'Ready',
  ],
};

export const JOB_CATEGORIES = COMPLETED_JOB_CATEGORIES;

const completedJobSchema = new mongoose.Schema(
  {
    jobNo: { type: Number, index: true },
    date: { type: Date, default: null, index: true },
    salesPerson: { type: String, default: '', trim: true, index: true },
    company: { type: String, default: '', trim: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null, index: true },
    contactPerson: { type: String, default: '', trim: true },
    contactNumber: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    typeOfJob: { type: String, default: '', trim: true, index: true },
    description: { type: String, default: '', trim: true },
    currentStatus: { type: String, default: 'Job Done', trim: true, index: true },
    responsiblePerson: { type: String, default: '', trim: true, index: true },
    dueDate: { type: Date, default: null, index: true },
    amount: { type: Number, default: 0, min: 0 },
    received: { type: Number, default: 0, min: 0 },
    balance: { type: Number, default: 0 },
    jobReview: { type: String, default: '', trim: true },
    opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'OngoingJob', default: null, index: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: String, default: null, trim: true },
  },
  { timestamps: true, versionKey: false }
);

completedJobSchema.virtual('ongoingJobId')
  .get(function () { return this.opportunityId; })
  .set(function (val) { this.opportunityId = val; });

completedJobSchema.set('toJSON', { virtuals: true });
completedJobSchema.set('toObject', { virtuals: true });

completedJobSchema.index({ currentStatus: 1, date: -1 });
completedJobSchema.index({ salesPerson: 1, typeOfJob: 1 });

export const CompletedJob =
  mongoose.models.CompletedJob ||
  mongoose.models.Job ||
  mongoose.model('CompletedJob', completedJobSchema, 'jobs');

export const Job = CompletedJob;
