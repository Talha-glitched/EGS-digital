/**
 * Import full GISEC POC list from bundled tracker xlsx and reset mistaken RANA queue on GISEC sequence.
 * Usage: node scripts/importGisecFullList.js [--dry-run] [--skip-import] [--skip-cleanup]
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Lead } from '../src/models/Lead.js';
import { ProjectCampaign } from '../src/models/ProjectCampaign.js';
import { Sequence } from '../src/models/Sequence.js';
import { SequenceEnrollment } from '../src/models/SequenceEnrollment.js';
import { SequenceLaunch } from '../src/models/SequenceLaunch.js';
import { SendJob } from '../src/models/SendJob.js';
import { blendAndIngestLeads, parseSpreadsheetBuffer } from '../src/services/ingestionService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = path.resolve(__dirname, '../../client/src/assets/temporary/GISEC 2026.xlsx');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const skipImport = process.argv.includes('--skip-import');
  const skipCleanup = process.argv.includes('--skip-cleanup');

  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set');
  if (!fs.existsSync(XLSX_PATH)) throw new Error(`Missing file: ${XLSX_PATH}`);

  await mongoose.connect(process.env.MONGODB_URI);

  const gisecCampaign = await ProjectCampaign.findOne({ projectName: /GISEC 2026/i, deletedAt: null });
  if (!gisecCampaign) throw new Error('GISEC 2026 campaign not found');

  const gisecSequence = await Sequence.findOne({ name: /GISEC 2026/i });
  const beforeCount = await Lead.countDocuments({ campaignId: gisecCampaign._id, deletedAt: null });
  console.log(`GISEC leads before import: ${beforeCount}`);

  let importStats = null;
  if (!skipImport) {
    const buffer = fs.readFileSync(XLSX_PATH);
    const sheets = parseSpreadsheetBuffer(buffer).filter((sheet) => sheet.sheetName === 'POCs');
    if (!sheets.length) throw new Error('POCs sheet not found in GISEC tracker');

    const uploads = [{
      sheets,
      vendor: 'Manual',
      fieldMapping: {
        name: 'Full Name',
        designation: 'Title',
        companyName: 'Company',
        linkedin: 'LinkedIn URL',
      },
    }];

    if (dryRun) {
      console.log(`[dry-run] Would import ${sheets[0].dataRows.length} POC rows`);
    } else {
      importStats = await blendAndIngestLeads(String(gisecCampaign._id), uploads);
      console.log('Import stats:', importStats);
    }
  }

  const afterCount = dryRun || skipImport
    ? beforeCount
    : await Lead.countDocuments({ campaignId: gisecCampaign._id, deletedAt: null });
  console.log(`GISEC leads after import: ${afterCount}`);

  if (gisecSequence && !skipCleanup) {
    const ranaCampaign = await ProjectCampaign.findOne({ projectName: /RANA EX/i, deletedAt: null }).lean();
    if (ranaCampaign) {
      const wrongEnrollments = await SequenceEnrollment.aggregate([
        { $match: { sequenceId: gisecSequence._id } },
        { $lookup: { from: 'leads', localField: 'leadId', foreignField: '_id', as: 'lead' } },
        { $unwind: '$lead' },
        { $match: { 'lead.campaignId': ranaCampaign._id } },
        { $project: { _id: 1 } },
      ]);

      const wrongIds = wrongEnrollments.map((row) => row._id);
      console.log(`Wrong RANA enrollments on GISEC sequence: ${wrongIds.length}`);

      if (wrongIds.length && !dryRun) {
        await SendJob.deleteMany({ enrollmentId: { $in: wrongIds } });
        await SequenceEnrollment.deleteMany({ _id: { $in: wrongIds } });
        await SequenceLaunch.deleteMany({ sequenceId: gisecSequence._id });
        console.log('Removed mistaken RANA queue from GISEC sequence.');
      }
    }

    if (String(gisecSequence.campaignId || '') !== String(gisecCampaign._id)) {
      console.log(`Sequence campaignId was ${gisecSequence.campaignId || 'null'} — setting to GISEC 2026`);
      if (!dryRun) {
        gisecSequence.campaignId = gisecCampaign._id;
        await gisecSequence.save();
      }
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
