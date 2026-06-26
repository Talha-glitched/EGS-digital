import { Task } from '../models/Task.js';
import { ContactInteraction } from '../models/ContactInteraction.js';
import { Company } from '../models/Company.js';
import { Lead } from '../models/Lead.js';
import { Opportunity } from '../models/Opportunity.js';
import { Sequence } from '../models/Sequence.js';
import { registerRevisionModel } from './revisionService.js';

export function initializeRevisionModels() {
  registerRevisionModel('task', Task);
  registerRevisionModel('interaction', ContactInteraction);
  registerRevisionModel('company', Company);
  registerRevisionModel('lead', Lead);
  registerRevisionModel('opportunity', Opportunity);
  registerRevisionModel('sequence', Sequence);
}
