import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { ProjectCampaign } from '../src/models/ProjectCampaign.js';
import { createTransporter, getFromIdentity } from '../src/services/mailTransport.js';

dotenv.config();

const projectId = process.argv[2] || '6a3ebb9eac1ef3c5e876d151';

await mongoose.connect(process.env.MONGODB_URI);
const project = await ProjectCampaign.findById(projectId).lean();
const identity = getFromIdentity(project);

console.log('SMTP host:', process.env.EMAIL_SMTP_HOST);
console.log('SMTP port:', process.env.EMAIL_SMTP_PORT);
console.log('SMTP user:', process.env.EMAIL_SMTP_USER);
console.log('From identity:', identity);

const transporter = createTransporter();
await transporter.verify();
console.log('verify: OK');

const info = await transporter.sendMail({
  from: `"${identity.fromName}" <${identity.fromEmail}>`,
  to: process.env.EMAIL_SMTP_USER,
  subject: `EGS SMTP test ${new Date().toISOString()}`,
  text: 'Delivery test from EGS send worker diagnostics.',
  envelope: {
    from: process.env.EMAIL_SMTP_USER,
    to: process.env.EMAIL_SMTP_USER,
  },
});

console.log('sendMail result:', {
  messageId: info.messageId,
  response: info.response,
  accepted: info.accepted,
  rejected: info.rejected,
  envelope: info.envelope,
});

await mongoose.disconnect();
