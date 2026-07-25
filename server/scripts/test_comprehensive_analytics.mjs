import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getComprehensiveAnalytics } from '../src/services/projectService.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const analytics = await getComprehensiveAnalytics();
  console.log('=== COMPREHENSIVE VENDOR PERFORMANCE ===');
  console.log(JSON.stringify(analytics.vendorPerformance, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
