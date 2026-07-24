import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const SPREADSHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1Vqw5WjgD65KkD2kME2O4DDQymvMgdgZCR1IT03Gcv2o/export?format=csv&gid=618026711';

// Inline simple Job schema if needed or import model
import { Job } from '../src/models/Job.js';

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map((col) => col.replace(/^"|"$/g, '').trim());
}

function cleanNum(val) {
  if (!val) return 0;
  const num = Number(String(val).replace(/,/g, '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(num) ? num : 0;
}

function parseDate(dateStr) {
  if (!dateStr || !dateStr.trim()) return null;
  const str = dateStr.trim();
  const parts = str.split('/');
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1; // 0-indexed
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(str);
  return !isNaN(d.getTime()) ? d : null;
}

export async function runJobSeeding() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/egs-crm';
  console.log('Connecting to MongoDB:', mongoUri);
  await mongoose.connect(mongoUri);

  console.log('Fetching Google Sheet CSV data...');
  const res = await fetch(SPREADSHEET_CSV_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch spreadsheet: ${res.statusText}`);
  }
  const text = await res.text();
  const lines = text.split(/\r?\n/);

  console.log(`Total CSV lines received: ${lines.length}`);
  
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Job No.') && lines[i].includes('Company')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    console.error('Could not locate CSV header row with "Job No." and "Company"');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found header at line ${headerIndex + 1}:`, lines[headerIndex]);
  const dataRows = lines.slice(headerIndex + 1);

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const line of dataRows) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    
    // Expected header columns:
    // 0: Date, 1: Job No., 2: Sales Person, 3: Company, 4: Contact Person, 5: Contact Number,
    // 6: Email, 7: Type of job, 8: Description, 9: Current Status, 10: Responsible Person,
    // 11: Due Date, 12: Amount, 13: Received, 14: Balance, 15: Job Review

    const dateStr = cols[0];
    const jobNoVal = cleanNum(cols[1]);
    const salesPerson = cols[2] || '';
    const company = cols[3] || '';
    const contactPerson = cols[4] || '';
    const contactNumber = cols[5] || '';
    const email = cols[6] || '';
    const typeOfJob = cols[7] || '';
    const description = cols[8] || '';
    const currentStatus = cols[9] || 'Inquiry';
    const responsiblePerson = cols[10] || '';
    const dueDateStr = cols[11];
    const amount = cleanNum(cols[12]);
    const received = cleanNum(cols[13]);
    const balance = cols[14] !== undefined && cols[14] !== '' ? cleanNum(cols[14]) : Math.max(0, amount - received);
    const jobReview = cols[15] || '';

    if (!jobNoVal && !company && !description) {
      skippedCount++;
      continue;
    }

    const jobData = {
      jobNo: jobNoVal || undefined,
      date: parseDate(dateStr),
      salesPerson,
      company,
      contactPerson,
      contactNumber,
      email,
      typeOfJob,
      description,
      currentStatus,
      responsiblePerson,
      dueDate: parseDate(dueDateStr),
      amount,
      received,
      balance,
      jobReview,
    };

    if (jobNoVal) {
      const existing = await Job.findOne({ jobNo: jobNoVal });
      if (existing) {
        Object.assign(existing, jobData);
        await existing.save();
        updatedCount++;
      } else {
        await Job.create(jobData);
        insertedCount++;
      }
    } else {
      await Job.create(jobData);
      insertedCount++;
    }
  }

  console.log(`\n--- Seeding Complete ---`);
  console.log(`Inserted: ${insertedCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped/Empty: ${skippedCount}`);

  await mongoose.disconnect();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runJobSeeding()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
