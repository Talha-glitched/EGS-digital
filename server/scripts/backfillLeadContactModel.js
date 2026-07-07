/**
 * Backfill outreachEmail on replied leads and re-link misassigned companies.
 * Usage: node scripts/backfillLeadContactModel.js [campaignId]
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Company } from '../src/models/Company.js';
import { Lead } from '../src/models/Lead.js';
import { Reply } from '../src/models/Reply.js';
import { applyOutreachEmailFromReply, firstContactEmail } from '../src/utils/contactEmails.js';
import { resolveCompanyForContact } from '../src/utils/companyResolver.js';
import { normalizeDomain } from '../src/utils/normalizeDomain.js';

async function main() {
  const campaignId = process.argv[2] || '6a492f30959af0877cc6a537';
  await mongoose.connect(process.env.MONGODB_URI);

  const companies = await Company.find({ projectsAssociated: campaignId, deletedAt: null }).lean();
  const leads = await Lead.find({ campaignId, deletedAt: null }).populate('companyId');

  let outreachSet = 0;
  let outreachCleared = 0;
  let relinked = 0;
  let vendorNormalized = 0;

  for (const lead of leads) {
    let changed = false;

    for (const field of ['emailApollo', 'emailHunter', 'emailLusha']) {
      const normalized = firstContactEmail(lead[field]);
      if (normalized && normalized !== lead[field]) {
        lead[field] = normalized;
        changed = true;
        vendorNormalized += 1;
      }
    }

    if (lead.deliveryStatus === 'Replied') {
      const reply = await Reply.findOne({ leadId: lead._id }).sort({ receivedAt: -1 }).lean();
      const sender = String(reply?.from || '').match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0]?.toLowerCase() || '';
      if (sender) {
        const result = applyOutreachEmailFromReply(lead, sender);
        if (result.applied) {
          outreachSet += 1;
          changed = true;
        }
      }
    } else if (lead.outreachEmail) {
      lead.outreachEmail = '';
      lead.outreachEmailSource = '';
      outreachCleared += 1;
      changed = true;
    }

    const companyName = lead.companyId?.companyName || '';
    const emailDomain = normalizeDomain(lead.email.split('@')[1] || '');
    const resolved = resolveCompanyForContact({
      companyName,
      websiteDomain: '',
      emailDomain,
      companiesInProject: companies,
    });

    if (resolved.company && String(resolved.company._id) !== String(lead.companyId?._id || lead.companyId)) {
      lead.companyId = resolved.company._id;
      relinked += 1;
      changed = true;
    }

    if (changed) await lead.save();
  }

  console.log(JSON.stringify({ outreachSet, outreachCleared, relinked, vendorNormalized, total: leads.length }, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
