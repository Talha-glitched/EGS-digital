/**
 * Audit Arabian Organics Excel vs CRM database (companies + POCs).
 * Usage: node scripts/auditArabianOrganics.js [path-to-xlsx] [campaignIdOrName]
 */
import 'dotenv/config';
import fs from 'fs';
import XLSX from 'xlsx';
import mongoose from 'mongoose';
import { Company } from '../src/models/Company.js';
import { Lead } from '../src/models/Lead.js';
import { ProjectCampaign } from '../src/models/ProjectCampaign.js';
import { normalizeDomain, normalizeEmail, isValidEmail } from '../src/utils/normalizeDomain.js';

const DEFAULT_XLSX =
  '/Users/mac/Desktop/EGS/EGS/EGS-digital/client/src/assets/temporary/Arabian Organics 2026 (2025 List) - V1.xlsx';

function normName(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normLi(url) {
  if (!url) return '';
  return String(url)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/$/, '');
}

function parseExcel(path) {
  const buf = fs.readFileSync(path);
  const wb = XLSX.read(buf, { type: 'buffer' });

  const companyRows = XLSX.utils.sheet_to_json(wb.Sheets['Companies'], { header: 1, defval: '', blankrows: false });
  const pocRows = XLSX.utils.sheet_to_json(wb.Sheets['POCs'], { header: 1, defval: '', blankrows: false });

  const companyHeaderIdx = companyRows.findIndex((r) => String(r[1] || '') === 'Company Name');
  const pocHeaderIdx = pocRows.findIndex((r) => String(r[0] || '') === 'POC ID');

  const cHeaders = companyRows[companyHeaderIdx];
  const pHeaders = pocRows[pocHeaderIdx];

  const companies = companyRows
    .slice(companyHeaderIdx + 1)
    .map((row) => ({
      rowNum: null,
      num: row[0],
      companyName: String(row[1] || '').trim(),
      website: String(row[2] || '').trim(),
      city: String(row[3] || '').trim(),
      country: String(row[4] || '').trim(),
      genericEmail: String(row[5] || '').trim(),
      phone: String(row[6] || '').trim(),
      pocsFound: row[7],
      status: String(row[8] || '').trim(),
      notes: String(row[9] || '').trim(),
      domain: normalizeDomain(row[2] || row[5] || ''),
    }))
    .filter((c) => c.companyName);

  const col = (headers, name) => headers.findIndex((h) => String(h).trim() === name);

  const pocs = pocRows
    .slice(pocHeaderIdx + 1)
    .map((row, i) => {
      const apollo = normalizeEmail(row[col(pHeaders, 'Email (Apollo)')]);
      const hunter = normalizeEmail(row[col(pHeaders, 'Email (Hunter)')]);
      const lusha = normalizeEmail(row[col(pHeaders, 'Email (Lusha)')]);
      const outreach = normalizeEmail(row[col(pHeaders, 'Email for Outreach')]);
      const primary = apollo || lusha || hunter || outreach;
      const website = '';
      return {
        pocId: row[col(pHeaders, 'POC ID')],
        name: String(row[col(pHeaders, 'Full Name')] || '').trim(),
        salutation: String(row[col(pHeaders, 'Salutation')] || '').trim(),
        title: String(row[col(pHeaders, 'Title')] || '').trim(),
        companyName: String(row[col(pHeaders, 'Company')] || '').trim(),
        linkedinUrl: String(row[col(pHeaders, 'LinkedIn URL')] || '').trim(),
        apolloEmail: apollo,
        hunterEmail: hunter,
        lushaEmail: lusha,
        outreachEmail: outreach,
        primaryEmail: primary,
        phone1: String(row[col(pHeaders, 'Phone 1')] || '').trim(),
        phone2: String(row[col(pHeaders, 'Phone 2')] || '').trim(),
        whatsapp: String(row[col(pHeaders, 'WhatsApp')] || '').trim(),
        firstFoundVia: String(row[col(pHeaders, 'First Found Via')] || '').trim(),
        rowIndex: pocHeaderIdx + 1 + i + 1,
      };
    })
    .filter((p) => p.name || p.companyName || p.linkedinUrl);

  return { companies, pocs, cHeaders, pHeaders };
}

async function findCampaign(query) {
  if (query && mongoose.Types.ObjectId.isValid(query)) {
    return ProjectCampaign.findById(query).lean();
  }
  const q = String(query || 'organics').trim();
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const matches = await ProjectCampaign.find({
    $or: [{ projectName: regex }, { milestone: regex }],
    deletedAt: null,
  }).lean();
  return matches;
}

async function main() {
  const xlsxPath = process.argv[2] || DEFAULT_XLSX;
  const campaignQuery = process.argv[3] || 'organics';

  if (!fs.existsSync(xlsxPath)) {
    console.error('Excel not found:', xlsxPath);
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const { companies: sheetCompanies, pocs: sheetPocs } = parseExcel(xlsxPath);

  let campaign = await findCampaign(campaignQuery);
  if (Array.isArray(campaign)) {
    console.log('\n=== Matching campaigns ===');
    campaign.forEach((c) => console.log(`  ${c._id}  ${c.projectName}  (${c.milestone || ''})  companies=${c.targetCompaniesCount} pocs=${c.companiesWithPocsFound}`));
    if (campaign.length === 1) campaign = campaign[0];
    else if (campaign.length === 0) {
      console.error('\nNo campaign matched. Listing all campaigns:');
      const all = await ProjectCampaign.find({ deletedAt: null }).select('projectName milestone targetCompaniesCount companiesWithPocsFound').lean();
      all.forEach((c) => console.log(`  ${c._id}  ${c.projectName}`));
      await mongoose.disconnect();
      process.exit(1);
    } else {
      console.error('\nMultiple campaigns matched — pass campaign ID as 2nd arg.');
      await mongoose.disconnect();
      process.exit(1);
    }
  }

  const projectId = campaign._id;
  console.log('\n=== Campaign ===');
  console.log(JSON.stringify({
    id: String(projectId),
    name: campaign.projectName,
    milestone: campaign.milestone,
    targetCompaniesCount: campaign.targetCompaniesCount,
    companiesWithPocsFound: campaign.companiesWithPocsFound,
  }, null, 2));

  const dbCompanies = await Company.find({ projectsAssociated: projectId, deletedAt: null }).lean();
  const dbLeads = await Lead.find({ campaignId: projectId, deletedAt: null }).populate('companyId').lean();

  console.log('\n=== Counts ===');
  console.log('Sheet companies (with name):', sheetCompanies.length);
  console.log('Sheet POCs (with name/company/li):', sheetPocs.length);
  console.log('DB companies in campaign:', dbCompanies.length);
  console.log('DB leads in campaign:', dbLeads.length);

  const sheetPocsWithEmail = sheetPocs.filter((p) => p.primaryEmail && isValidEmail(p.primaryEmail));
  const sheetPocsWithLi = sheetPocs.filter((p) => p.linkedinUrl);
  const sheetPocsNoContact = sheetPocs.filter((p) => !p.primaryEmail && !p.linkedinUrl);

  console.log('Sheet POCs with any email:', sheetPocsWithEmail.length);
  console.log('Sheet POCs with LinkedIn only:', sheetPocsWithLi.length - sheetPocsWithEmail.filter((p) => p.linkedinUrl).length);
  console.log('Sheet POCs with no email and no LI:', sheetPocsNoContact.length);

  // Company matching
  const dbByDomain = new Map(dbCompanies.map((c) => [c.domain, c]));
  const dbByName = new Map();
  for (const c of dbCompanies) {
    const k = normName(c.companyName);
    if (!dbByName.has(k)) dbByName.set(k, []);
    dbByName.get(k).push(c);
  }

  const sheetCompanyByName = new Map();
  for (const c of sheetCompanies) {
    const k = normName(c.companyName);
    if (!sheetCompanyByName.has(k)) sheetCompanyByName.set(k, []);
    sheetCompanyByName.get(k).push(c);
  }

  const missingInDb = [];
  const domainMismatch = [];
  const fieldIssues = [];

  for (const sc of sheetCompanies) {
    const nameKey = normName(sc.companyName);
    const byDomain = sc.domain ? dbByDomain.get(sc.domain) : null;
    const byName = dbByName.get(nameKey) || [];

    if (!byDomain && byName.length === 0) {
      missingInDb.push(sc);
      continue;
    }

    const dbCo = byDomain || byName[0];
    if (sc.domain && dbCo.domain && sc.domain !== dbCo.domain) {
      domainMismatch.push({ sheet: sc, db: dbCo });
    }
    if (sc.city && dbCo.city && normName(sc.city) !== normName(dbCo.city)) {
      fieldIssues.push({ type: 'city_mismatch', company: sc.companyName, sheet: sc.city, db: dbCo.city });
    }
    if (sc.country && dbCo.country && normName(sc.country) !== normName(dbCo.country)) {
      fieldIssues.push({ type: 'country_mismatch', company: sc.companyName, sheet: sc.country, db: dbCo.country });
    }
    if (sc.genericEmail && (!dbCo.genericEmails || !dbCo.genericEmails.length)) {
      fieldIssues.push({ type: 'missing_generic_email', company: sc.companyName, sheet: sc.genericEmail });
    }
  }

  const extraInDb = dbCompanies.filter((dc) => {
    const nameKey = normName(dc.companyName);
    const sheetMatch = sheetCompanyByName.get(nameKey);
    const domainMatch = sheetCompanies.some((sc) => sc.domain && sc.domain === dc.domain);
    return !sheetMatch && !domainMatch;
  });

  // POC matching
  const dbByEmail = new Map(dbLeads.map((l) => [l.email, l]));
  const dbByLi = new Map();
  for (const l of dbLeads) {
    const k = normLi(l.linkedinUrl);
    if (k) dbByLi.set(k, l);
  }
  const dbByNameComp = new Map();
  for (const l of dbLeads) {
    const comp = l.companyId?.companyName || '';
    const k = `${normName(l.name)}:${normName(comp)}`;
    if (l.name) dbByNameComp.set(k, l);
  }

  const pocsMissingInDb = [];
  const pocsWrongCompany = [];
  const pocsFieldIssues = [];
  const pocsSkippedNoEmail = [];

  for (const sp of sheetPocs) {
    if (!sp.primaryEmail || !isValidEmail(sp.primaryEmail)) {
      if (sp.linkedinUrl || sp.name) {
        const liMatch = normLi(sp.linkedinUrl) ? dbByLi.get(normLi(sp.linkedinUrl)) : null;
        const ncMatch = dbByNameComp.get(`${normName(sp.name)}:${normName(sp.companyName)}`);
        if (!liMatch && !ncMatch) {
          pocsSkippedNoEmail.push(sp);
        } else if (liMatch || ncMatch) {
          const lead = liMatch || ncMatch;
          if (sp.companyName && lead.companyId?.companyName && normName(sp.companyName) !== normName(lead.companyId.companyName)) {
            pocsWrongCompany.push({ sheet: sp, db: lead, reason: 'name+li match but company differs' });
          }
        }
      }
      continue;
    }

    const lead = dbByEmail.get(sp.primaryEmail);
    if (!lead) {
      pocsMissingInDb.push(sp);
      continue;
    }
    if (sp.name && lead.name && normName(sp.name) !== normName(lead.name)) {
      pocsFieldIssues.push({ type: 'name_mismatch', email: sp.primaryEmail, sheet: sp.name, db: lead.name });
    }
    if (sp.title && lead.designation && normName(sp.title) !== normName(lead.designation)) {
      pocsFieldIssues.push({ type: 'title_mismatch', email: sp.primaryEmail, sheet: sp.title, db: lead.designation });
    }
    if (sp.companyName && lead.companyId?.companyName && normName(sp.companyName) !== normName(lead.companyId.companyName)) {
      pocsWrongCompany.push({ sheet: sp, db: lead, reason: 'email match but company name differs' });
    }
    if (sp.linkedinUrl && lead.linkedinUrl && normLi(sp.linkedinUrl) !== normLi(lead.linkedinUrl)) {
      pocsFieldIssues.push({ type: 'linkedin_mismatch', email: sp.primaryEmail, sheet: sp.linkedinUrl, db: lead.linkedinUrl });
    }
  }

  const dbLeadsNotInSheet = dbLeads.filter((l) => {
    const inSheet = sheetPocs.some((sp) => {
      if (sp.primaryEmail && sp.primaryEmail === l.email) return true;
      if (sp.linkedinUrl && normLi(sp.linkedinUrl) === normLi(l.linkedinUrl)) return true;
      return normName(sp.name) === normName(l.name) && normName(sp.companyName) === normName(l.companyId?.companyName || '');
    });
    return !inSheet;
  });

  // Data quality on DB
  const dbIssues = [];
  for (const l of dbLeads) {
    if (!l.companyId) dbIssues.push({ type: 'orphan_lead', id: l._id, email: l.email });
    if (!l.name) dbIssues.push({ type: 'missing_name', email: l.email });
    if (!l.linkedinUrl && !l.emailApollo && !l.emailHunter && !l.emailLusha) {
      // has primary email at least
    }
    const emailDomain = l.email?.split('@')[1];
    const companyDomain = l.companyId?.domain;
    if (emailDomain && companyDomain && !emailDomain.endsWith(companyDomain) && !companyDomain.endsWith(emailDomain.split('.').slice(-2).join('.'))) {
      // soft check - many valid cases (gmail etc)
      if (!['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(emailDomain)) {
        const normCo = normalizeDomain(companyDomain);
        const normEm = normalizeDomain(emailDomain);
        if (normCo && normEm && normCo !== normEm && !normEm.includes(normCo.split('.')[0])) {
          dbIssues.push({ type: 'email_domain_vs_company', email: l.email, companyDomain, companyName: l.companyId?.companyName });
        }
      }
    }
  }

  const dupEmailsInDb = [];
  const emailCounts = {};
  for (const l of dbLeads) {
    emailCounts[l.email] = (emailCounts[l.email] || 0) + 1;
  }
  for (const [email, count] of Object.entries(emailCounts)) {
    if (count > 1) dupEmailsInDb.push({ email, count });
  }

  const dupDomainsInDb = [];
  const domainCounts = {};
  for (const c of dbCompanies) {
    domainCounts[c.domain] = (domainCounts[c.domain] || 0) + 1;
  }

  const sheetPocCompanies = new Set(sheetPocs.map((p) => normName(p.companyName)).filter(Boolean));
  const sheetCompaniesWithPocs = sheetCompanies.filter((c) => {
    const n = normName(c.companyName);
    return sheetPocCompanies.has(n) || Number(c.pocsFound) > 0;
  });

  console.log('\n=== Company audit ===');
  console.log('Missing in DB (in sheet, not in campaign):', missingInDb.length);
  if (missingInDb.length) console.log('  Sample:', missingInDb.slice(0, 10).map((c) => c.companyName));
  console.log('Extra in DB (not in sheet):', extraInDb.length);
  if (extraInDb.length) console.log('  Sample:', extraInDb.slice(0, 10).map((c) => c.companyName));
  console.log('Domain mismatches (sheet vs DB):', domainMismatch.length);
  console.log('Field issues (city/country/email):', fieldIssues.length);

  console.log('\n=== POC audit ===');
  console.log('Sheet POCs with valid email missing from DB:', pocsMissingInDb.length);
  if (pocsMissingInDb.length) console.log('  Sample:', pocsMissingInDb.slice(0, 5).map((p) => ({ name: p.name, email: p.primaryEmail, company: p.companyName })));
  console.log('Sheet POCs LinkedIn-only not in DB:', pocsSkippedNoEmail.length);
  if (pocsSkippedNoEmail.length) console.log('  Sample:', pocsSkippedNoEmail.slice(0, 5).map((p) => ({ name: p.name, company: p.companyName, li: p.linkedinUrl?.slice(0, 50) })));
  console.log('POCs matched to wrong company:', pocsWrongCompany.length);
  console.log('POC field mismatches:', pocsFieldIssues.length);
  console.log('DB leads not found in sheet:', dbLeadsNotInSheet.length);
  if (dbLeadsNotInSheet.length) console.log('  Sample:', dbLeadsNotInSheet.slice(0, 5).map((l) => ({ name: l.name, email: l.email, company: l.companyId?.companyName })));

  console.log('\n=== DB data quality ===');
  console.log('Duplicate emails in campaign:', dupEmailsInDb.length);
  console.log('Leads with email/company domain tension:', dbIssues.filter((i) => i.type === 'email_domain_vs_company').length);
  console.log('Orphan leads (no company):', dbIssues.filter((i) => i.type === 'orphan_lead').length);
  console.log('Leads missing name:', dbIssues.filter((i) => i.type === 'missing_name').length);

  console.log('\n=== Sheet vs DB POC coverage ===');
  console.log('Sheet companies claiming POCs found > 0:', sheetCompanies.filter((c) => Number(c.pocsFound) > 0).length);
  console.log('Sheet companies with POC rows:', sheetCompaniesWithPocs.length);
  console.log('DB companies with at least 1 lead:', new Set(dbLeads.map((l) => String(l.companyId?._id || l.companyId))).size);

  // Ingestion mapping check
  const { suggestFieldMapping } = await import('../src/services/ingestionService.js');
  const pocMap = suggestFieldMapping(
    ['POC ID', 'Full Name', 'Salutation', 'Title', 'Company', 'LinkedIn URL', 'Email (Apollo)', 'Email for Outreach'],
    ['email', 'name', 'designation', 'companyName', 'linkedin']
  );
  const compMap = suggestFieldMapping(
    ['#', 'Company Name', 'Website', 'City', 'Country', 'Generic Email', 'Phone'],
    ['companyName', 'domain', 'city', 'country', 'genericEmail', 'genericPhone']
  );
  console.log('\n=== Auto field mapping (ingestionService) ===');
  console.log('POC sheet suggested:', pocMap.suggestedMapping);
  console.log('Companies sheet suggested:', compMap.suggestedMapping);

  const outreachCount = sheetPocs.filter((p) => p.outreachEmail).length;
  const hunterCount = sheetPocs.filter((p) => p.hunterEmail).length;
  const lushaCount = sheetPocs.filter((p) => p.lushaEmail).length;
  const apolloCount = sheetPocs.filter((p) => p.apolloEmail).length;
  console.log('\n=== Sheet email sources ===');
  console.log({ apolloCount, hunterCount, lushaCount, outreachCount });

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
