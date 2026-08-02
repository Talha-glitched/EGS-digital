import mongoose from 'mongoose';

const financialMetricsSchema = new mongoose.Schema(
  {
    tokensConsumed: { type: Number, default: 0 },
    calculatedAiCostUSD: { type: Number, default: 0 },
  },
  { _id: false }
);

const trackingMetricsSchema = new mongoose.Schema(
  {
    emailsDeliveredCount: { type: Number, default: 0 },
    isOpened: { type: Boolean, default: false },
    totalOpenCount: { type: Number, default: 0 },
    lastOpenTimestamp: { type: Date, default: null },
  },
  { _id: false }
);

const enrollmentSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectCampaign', required: true, index: true },
    enrolledAt: { type: Date, default: Date.now },
    deliveryStatus: {
      type: String,
      enum: ['Pending Inqueue', 'Emailed Outbound', 'Bounced / Invalid', 'Opted Out', 'Replied', 'Out of Office'],
      default: 'Pending Inqueue',
    },
    stepIndex: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: null },
    outcome: { type: String, default: 'Pending' },
  },
  { _id: false }
);

const leadSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectCampaign', default: null, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, default: '', trim: true },
    designation: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    
    // Stage 2 - Multi-Source Contact Discovery
    linkedinUrl: { type: String, default: '', trim: true },
    emailApollo: { type: String, default: '', trim: true, lowercase: true },
    emailHunter: { type: String, default: '', trim: true, lowercase: true },
    emailLusha: { type: String, default: '', trim: true, lowercase: true },
    /** Private / personal addresses (e.g. Lusha Private email). May hold multiple ;-separated values. */
    emailPersonal: { type: String, default: '', trim: true, lowercase: true },
    /** Set automatically when a reply arrives from a mailbox on this lead. */
    outreachEmail: { type: String, default: '', trim: true, lowercase: true, index: true },
    outreachEmailSource: {
      type: String,
      enum: ['', 'Apollo', 'Hunter', 'Lusha', 'Personal', 'Manual'],
      default: '',
    },
    confirmedEmails: [
      {
        email: { type: String, trim: true, lowercase: true },
        source: { type: String, enum: ['Apollo', 'Hunter', 'Lusha', 'Personal', 'Manual', ''], default: 'Manual' },
        confirmedAt: { type: Date, default: Date.now },
        systemInbox: { type: String, trim: true, lowercase: true, default: '' },
      },
    ],
    bouncedEmails: [
      {
        email: { type: String, trim: true, lowercase: true },
        source: { type: String, enum: ['Apollo', 'Hunter', 'Lusha', 'Personal', 'Manual', ''], default: 'Manual' },
        bouncedAt: { type: Date, default: Date.now },
        reason: { type: String, default: 'bounced' },
      },
    ],
    contactKind: {
      type: String,
      enum: ['person', 'genericInbox'],
      default: 'person',
      index: true,
    },
    phoneLusha1: { type: String, default: '', trim: true },
    phoneLusha2: { type: String, default: '', trim: true },
    whatsappNumber: { type: String, default: '', trim: true },

    // Stage 3 - Multi-channel Outreach Tracking
    linkedinOutreach: {
      connSent: { type: Boolean, default: false },
      connDate: { type: Date, default: null },
      accepted: { type: Boolean, default: false },
      acceptDate: { type: Date, default: null },
      inmailSent: { type: Boolean, default: false },
      inmailDate: { type: Date, default: null },
      inmailResponded: { type: Boolean, default: false },
      dmSent: { type: Boolean, default: false },
      dmDate: { type: Date, default: null },
      dmResponded: { type: Boolean, default: false },
      notes: { type: String, default: '' },
    },
    coldCall: {
      made: { type: Boolean, default: false },
      date: { type: Date, default: null },
      response: { type: String, default: '' },
      notes: { type: String, default: '' },
    },
    whatsapp: {
      sent: { type: Boolean, default: false },
      date: { type: Date, default: null },
      response: { type: String, default: '' },
    },

    sources: [{ type: String, trim: true }],
    primarySource: { type: String, default: '', trim: true },
    deliveryStatus: {
      type: String,
      enum: ['Pending Inqueue', 'Emailed Outbound', 'Bounced / Invalid', 'Opted Out', 'Replied', 'Out of Office'],
      default: 'Pending Inqueue',
      index: true,
    },
    outcome: { type: String, default: 'Pending' },

    pocQualification: {
      status: {
        type: String,
        enum: ['Unverified', 'Confirmed', 'RedirectedWithReferral', 'RedirectedNoReferral', 'WrongContact'],
        default: 'Unverified',
        index: true,
      },
      assessedAt: { type: Date, default: null },
      assessedBy: { type: String, default: '', trim: true },
      notes: { type: String, default: '', trim: true },
      referral: {
        name: { type: String, default: '', trim: true },
        email: { type: String, default: '', trim: true, lowercase: true },
        phone: { type: String, default: '', trim: true },
        designation: { type: String, default: '', trim: true },
        linkedinUrl: { type: String, default: '', trim: true },
      },
      referredLeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    },
    relationshipProfile: {
      status: {
        type: String,
        enum: ['New', 'Active', 'Nurture', 'Later', 'Dormant'],
        default: 'New',
      },
      owner: { type: String, default: '', trim: true },
      serviceCategories: [{ type: String, trim: true }],
      nextFollowUpAt: { type: Date, default: null },
      reminderNotes: { type: String, default: '', trim: true },
    },

    enrollments: [enrollmentSchema],
    trackingMetrics: { type: trackingMetricsSchema, default: () => ({}) },
    lastMessageId: { type: String, default: '', index: true },
    repliedAt: { type: Date, default: null },
    leadStage: {
      type: String,
      enum: ['contact', 'lead', 'qualified_lead'],
      default: 'contact',
      index: true,
    },
    qualifiedAt: { type: Date, default: null },
    qualifiedBy: { type: String, default: null },
    version: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: String, default: null, trim: true },
  },
  { timestamps: true, versionKey: false }
);

leadSchema.index({ deletedAt: 1, email: 1 });
leadSchema.index({ deletedAt: 1, name: 1 });
leadSchema.index({ deletedAt: 1, companyId: 1 });
leadSchema.index({ deletedAt: 1, deliveryStatus: 1 });
leadSchema.index({ campaignId: 1, deletedAt: 1, deliveryStatus: 1 });
leadSchema.index({ campaignId: 1, deletedAt: 1, companyId: 1 });
leadSchema.index({ deletedAt: 1, 'pocQualification.status': 1 });
leadSchema.index({ deletedAt: 1, 'relationshipProfile.status': 1, 'relationshipProfile.nextFollowUpAt': 1 });

export const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);

