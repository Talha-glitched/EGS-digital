/**
 * Fix mojibake contact names for a campaign.
 * Usage: node scripts/fixGisecLeadNames.js [campaignNameOrId] [--dry-run]
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Lead } from '../src/models/Lead.js';
import { ProjectCampaign } from '../src/models/ProjectCampaign.js';
import { fixMojibakeName, nameNeedsMojibakeFix } from '../src/utils/fixMojibakeName.js';

async function findCampaign(query) {
  if (query && mongoose.Types.ObjectId.isValid(query)) {
    return ProjectCampaign.findById(query);
  }
  const regex = new RegExp(String(query || 'GISEC 2026').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const matches = await ProjectCampaign.find({ projectName: regex, deletedAt: null });
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) throw new Error(`No campaign matched "${query}"`);
  throw new Error(`Multiple campaigns matched — pass an ID. ${matches.map((c) => c._id).join(', ')}`);
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--dry-run');
  const dryRun = process.argv.includes('--dry-run');
  const campaignQuery = args[0] || 'GISEC 2026';

  await mongoose.connect(process.env.MONGODB_URI);
  const project = await findCampaign(campaignQuery);
  const leads = await Lead.find({ campaignId: project._id, deletedAt: null }).select('name').lean();

  let updated = 0;
  for (const lead of leads) {
    if (!nameNeedsMojibakeFix(lead.name)) continue;
    const fixed = fixMojibakeName(lead.name);
    if (fixed === lead.name) continue;
    console.log(`${lead.name} -> ${fixed}`);
    if (!dryRun) {
      await Lead.updateOne({ _id: lead._id }, { $set: { name: fixed } });
    }
    updated += 1;
  }

  console.log(JSON.stringify({
    campaign: project.projectName,
    campaignId: String(project._id),
    dryRun,
    scanned: leads.length,
    updated,
  }, null, 2));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
