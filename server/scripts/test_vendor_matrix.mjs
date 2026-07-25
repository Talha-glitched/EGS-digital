import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { computeVendorMatrix } from '../src/services/analyticsCronService.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const matrix = await computeVendorMatrix();
  console.log('=== COMPUTED VENDOR MATRIX ===');
  console.log(JSON.stringify(matrix, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
