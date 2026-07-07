import mongoose from 'mongoose';
import {
  INTERACTION_TYPES,
  INTERACTION_DIRECTIONS,
  INTERACTION_OUTCOMES,
} from '../constants/interactionTypes.js';

const contactInteractionSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    relatedLeadIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }], default: [], index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    type: { type: String, enum: INTERACTION_TYPES, required: true, index: true },
    direction: { type: String, enum: INTERACTION_DIRECTIONS, default: 'outbound' },
    title: { type: String, default: '', trim: true },
    summary: { type: String, required: true, trim: true },
    occurredAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: null, min: 0 },
    outcome: { type: String, enum: INTERACTION_OUTCOMES, default: null },
    location: { type: String, default: '', trim: true },
    attendees: { type: String, default: '', trim: true },
    loggedBy: { type: String, default: 'admin', trim: true },
    loggedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: String, default: '', trim: true },
    version: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: String, default: null, trim: true },
  },
  { timestamps: true, versionKey: false }
);

contactInteractionSchema.index({ companyId: 1, occurredAt: -1 });
contactInteractionSchema.index({ leadId: 1, occurredAt: -1 });

export const ContactInteraction =
  mongoose.models.ContactInteraction ||
  mongoose.model('ContactInteraction', contactInteractionSchema);
