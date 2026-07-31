import { Task } from '../models/Task.js';
import { ContactInteraction } from '../models/ContactInteraction.js';
import { Company } from '../models/Company.js';
import { Lead } from '../models/Lead.js';
import { OngoingJob } from '../models/OngoingJob.js';
import { CompletedJob } from '../models/CompletedJob.js';
import { Sequence } from '../models/Sequence.js';
import { registerRevisionModel } from './revisionService.js';

export function initializeRevisionModels() {
  registerRevisionModel('task', Task);
  registerRevisionModel('interaction', ContactInteraction);
  registerRevisionModel('company', Company);
  registerRevisionModel('lead', Lead);
  registerRevisionModel('ongoing_job', OngoingJob);
  registerRevisionModel('opportunity', OngoingJob);
  registerRevisionModel('completed_job', CompletedJob);
  registerRevisionModel('job', CompletedJob);
  registerRevisionModel('sequence', Sequence);
}
