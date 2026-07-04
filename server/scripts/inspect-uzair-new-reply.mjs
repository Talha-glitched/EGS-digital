import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Reply } from '../src/models/Reply.js';

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

const r = await Reply.findById('6a493633959af0877cc6c45a').lean();
if (r) {
  console.log('REPLY DETAILS:');
  console.log('ID:', r._id);
  console.log('Email:', r.email);
  console.log('Subject:', r.subject);
  console.log('MessageID:', r.messageId);
  console.log('Text:', JSON.stringify(r.text));
  console.log('CreatedAt:', r.createdAt);
  console.log('ReceivedAt:', r.receivedAt);
} else {
  console.log('Reply not found.');
}

await mongoose.disconnect();
