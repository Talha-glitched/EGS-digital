import XLSX from 'xlsx';
import mongoose from 'mongoose';
import { Company } from '../models/Company.js';
import { Lead } from '../models/Lead.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { Suppression } from '../models/Suppression.js';
import { normalizeDomain, normalizeEmail, isValidEmail } from '../utils/normalizeDomain.js';
import { normalizeGenericEmails } from '../utils/companyEmails.js';
import { computeProjectSnapshot } from './analyticsCronService.js';
import { resolveCompanyForContact, isGenericMailboxEmail } from '../utils/companyResolver.js';
import { pickDedupEmail, firstContactEmail } from '../utils/contactEmails.js';

const FIELD_ALIASES = {
  email: ['email', 'emailaddress', 'mail', 'e-mail', 'workemail', 'contactemail', 'primaryemail', 'emailaddress', 'email_address', 'emailforoutreach'],
  name: ['name', 'fullname', 'contactname', 'person', 'contactfirstname', 'firstname', 'first name', 'last name', 'lastname', 'contactlastname', 'full name'],
  designation: ['designation', 'title', 'jobtitle', 'position', 'role'],
  companyName: ['company', 'companyname', 'organization', 'organisation', 'accountname', 'account'],
  domain: ['domain', 'website', 'companywebsite', 'url', 'companydomain', 'websiteurl', 'web'],
  industry: ['industry', 'sector', 'vertical'],
  boothNumber: ['booth', 'boothnumber', 'stand', 'standnumber', 'hall', 'location'],
  phone: ['phone', 'phonenumber', 'mobile', 'directphone', 'phone_number', 'mobile_phone', 'direct_phone', 'companyphone'],
  linkedin: ['linkedin', 'linkedinurl', 'personlinkedinurl', 'profileurl', 'contactlinkedin', 'linkedin_url', 'person_linkedin_url'],
  
  // Scraper fields
  city: ['city', 'hqcity', 'location', 'companycity'],
  country: ['country', 'hqcountry', 'locationcountry', 'companycountry'],
  genericEmail: ['genericemail', 'generalemail', 'infoemail', 'contactemail', 'companyemail'],
  genericPhone: ['genericphone', 'generalphone', 'infophone', 'contactphone', 'companyphone'],
  notes: ['notes', 'note', 'comments', 'comment'],
};

export const COMPANY_FIELDS = ['companyName', 'domain', 'industry', 'boothNumber', 'city', 'country', 'genericEmail', 'genericPhone', 'notes'];
export const CONTACT_FIELDS = ['email', 'name', 'designation', 'companyName', 'domain', 'phone', 'linkedin'];

/** Best-effort readable company name from a bare domain */
function deriveCompanyNameFromDomain(domain) {
  const base = String(domain || '').split('.')[0].replace(/[-_]+/g, ' ').trim();
  if (!base) return domain || 'Unknown company';
  return base
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

const VENDOR_HEADERS = {
  Apollo: ['apollo', 'apollo.io', 'person linkedin url'],
  Hunter: ['hunter', 'hunter.io', 'hunter score'],
  Lusha: ['lusha', 'lusha phone', 'work email 2'],
};

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function detectVendor(headers) {
  const joined = headers.map(normalizeHeader).join(' ');
  for (const [vendor, markers] of Object.entries(VENDOR_HEADERS)) {
    if (markers.some((m) => joined.includes(m.replace(/[^a-z0-9]/g, '')))) {
      return vendor;
    }
  }
  return 'Manual';
}

function findEgsHeaderRow(rows, sheetName) {
  if (sheetName === 'Companies') {
    return rows.findIndex((row) => String(row[1] || '').trim() === 'Company Name');
  }
  if (sheetName === 'POCs') {
    return rows.findIndex((row) => String(row[0] || '').trim() === 'POC ID');
  }
  return -1;
}

export function parseSpreadsheetBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheets = [];

  workbook.SheetNames.forEach((sheetName) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      blankrows: false,
    });
    if (!rows.length) return;

    const egsHeaderIndex = findEgsHeaderRow(rows, sheetName);
    const headerIndex = egsHeaderIndex >= 0
      ? egsHeaderIndex
      : rows.findIndex((row) => row.some(Boolean));
    if (headerIndex < 0) return;

    const headers = rows[headerIndex].map((h) => String(h || '').trim());
    const dataRows = rows.slice(headerIndex + 1).filter((row) => row.some(Boolean));
    sheets.push({ sheetName, headers, dataRows });
  });

  return sheets;
}

export function suggestFieldMapping(headers, fields = null) {
  const normalized = headers.map(normalizeHeader);
  const mapping = {};

  const entries = fields
    ? Object.entries(FIELD_ALIASES).filter(([field]) => fields.includes(field))
    : Object.entries(FIELD_ALIASES);

  for (const [field, aliases] of entries) {
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx >= 0) mapping[field] = headers[idx];
  }

  return {
    headers,
    suggestedMapping: mapping,
    detectedVendor: detectVendor(headers),
  };
}

function resolveColumnIndex(headers, mappedHeader) {
  if (!mappedHeader) return -1;
  const target = normalizeHeader(mappedHeader);
  return headers.findIndex((h) => normalizeHeader(h) === target);
}

/** Convert parsed sheets + a user-confirmed field mapping into company rows. */
export function buildCompanyRows(sheets, fieldMapping) {
  const rows = [];
  for (const sheet of sheets) {
    const col = {};
    for (const [field, headerName] of Object.entries(fieldMapping || {})) {
      col[field] = resolveColumnIndex(sheet.headers, headerName);
    }
    for (const row of sheet.dataRows) {
      rows.push({
        companyName: col.companyName >= 0 ? String(row[col.companyName] || '').trim() : '',
        domain: col.domain >= 0 ? String(row[col.domain] || '').trim() : '',
        industry: col.industry >= 0 ? String(row[col.industry] || '').trim() : '',
        boothNumber: col.boothNumber >= 0 ? String(row[col.boothNumber] || '').trim() : '',
        city: col.city >= 0 ? String(row[col.city] || '').trim() : '',
        country: col.country >= 0 ? String(row[col.country] || '').trim() : '',
        genericEmails: col.genericEmail >= 0
          ? normalizeGenericEmails(String(row[col.genericEmail] || ''))
          : [],
        genericPhone: col.genericPhone >= 0 ? String(row[col.genericPhone] || '').trim() : '',
        notes: col.notes >= 0 ? String(row[col.notes] || '').trim() : '',
      });
    }
  }
  return rows;
}

function normalizeUrl(url) {
  if (!url) return '';
  return String(url).trim().toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/$/, '');
}

async function resolveOrCreateCompany({
  project,
  projectId,
  companyName,
  websiteDomain,
  emailDomain,
  companiesInProject,
  domainToCompany,
  stats,
}) {
  const resolved = resolveCompanyForContact({
    companyName,
    websiteDomain,
    emailDomain,
    companiesInProject,
  });

  if (resolved.company) {
    if (!resolved.company.projectsAssociated?.some((cid) => String(cid) === String(projectId))) {
      await Company.updateOne({ _id: resolved.company._id }, { $addToSet: { projectsAssociated: project._id } });
    }
    return resolved.company;
  }

  const createDomain = normalizeDomain(websiteDomain) || normalizeDomain(emailDomain);
  if (!createDomain || !createDomain.includes('.')) {
    return null;
  }

  let company = await Company.findOne({ domain: createDomain });
  if (company) {
    if (!company.projectsAssociated.some((cid) => String(cid) === String(projectId))) {
      await Company.updateOne({ _id: company._id }, { $addToSet: { projectsAssociated: project._id } });
    }
    company = company.toObject ? company.toObject() : company;
  } else {
    company = await Company.create({
      companyName: companyName || deriveCompanyNameFromDomain(createDomain),
      domain: createDomain,
      projectsAssociated: [project._id],
    });
    company = company.toObject();
    stats.companiesCreated += 1;
  }

  domainToCompany.set(company.domain, company);
  return company;
}

async function routeGenericEmailsToCompany({
  project,
  projectId,
  companyName,
  websiteDomain,
  emails,
  companiesInProject,
  domainToCompany,
  stats,
}) {
  if (!emails.length) return false;

  const emailDomain = normalizeDomain(emails[0].split('@')[1] || '');
  const company = await resolveOrCreateCompany({
    project,
    projectId,
    companyName,
    websiteDomain,
    emailDomain,
    companiesInProject,
    domainToCompany,
    stats,
  });
  if (!company) {
    stats.skipped += 1;
    return true;
  }

  await Company.updateOne(
    { _id: company._id },
    { $addToSet: { genericEmails: { $each: emails } } },
  );
  stats.genericRouted = (stats.genericRouted || 0) + emails.length;
  return true;
}

export async function blendAndIngestLeads(projectId, uploads) {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error('MongoDB is required.');
    error.status = 503;
    throw error;
  }

  const project = await ProjectCampaign.findById(projectId);
  if (!project) {
    const error = new Error('Project not found.');
    error.status = 404;
    throw error;
  }

  const stats = {
    inserted: 0,
    merged: 0,
    skipped: 0,
    companiesCreated: 0,
    invalidEmail: 0,
    suppressed: 0,
    genericRouted: 0,
  };

  const rawContacts = [];

  // 1. Parse and extract all rows from all uploaded files
  for (const uploadItem of uploads) {
    const { sheets, fieldMapping, vendor } = uploadItem;
    const sourceVendor = vendor || 'Manual';

    for (const sheet of sheets) {
      const headers = sheet.headers;
      const col = {};
      for (const [field, headerName] of Object.entries(fieldMapping || {})) {
        col[field] = resolveColumnIndex(headers, headerName);
      }

      // Look for specific source headers
      const emailApolloCol = resolveColumnIndex(headers, 'Email (Apollo)');
      const emailHunterCol = resolveColumnIndex(headers, 'Email (Hunter)');
      const emailLushaCol = resolveColumnIndex(headers, 'Email (Lusha)');
      const emailOutreachCol = resolveColumnIndex(headers, 'Email for Outreach');
      const phoneLusha1Col = resolveColumnIndex(headers, 'Lusha Phone 1') !== -1 ? resolveColumnIndex(headers, 'Lusha Phone 1') : resolveColumnIndex(headers, 'Phone 1');
      const phoneLusha2Col = resolveColumnIndex(headers, 'Lusha Phone 2') !== -1 ? resolveColumnIndex(headers, 'Lusha Phone 2') : resolveColumnIndex(headers, 'Phone 2');
      const linkedinUrlCol = resolveColumnIndex(headers, 'LinkedIn URL') !== -1 ? resolveColumnIndex(headers, 'LinkedIn URL') : resolveColumnIndex(headers, 'Person Linkedin Url');

      for (const row of sheet.dataRows) {
        const name = col.name >= 0 ? String(row[col.name] || '').trim() : '';
        const designation = col.designation >= 0 ? String(row[col.designation] || '').trim() : '';
        const companyName = col.companyName >= 0 ? String(row[col.companyName] || '').trim() : '';
        const rawDomain = col.domain >= 0 ? row[col.domain] : '';

        // Extract LinkedIn URL
        let linkedinUrl = '';
        if (linkedinUrlCol >= 0) linkedinUrl = String(row[linkedinUrlCol] || '').trim();
        else if (col.linkedin >= 0) linkedinUrl = String(row[col.linkedin] || '').trim();

        // Extract Emails
        let apolloEmail = emailApolloCol >= 0 ? normalizeEmail(row[emailApolloCol]) : '';
        let hunterEmail = emailHunterCol >= 0 ? normalizeEmail(row[emailHunterCol]) : '';
        let lushaEmail = emailLushaCol >= 0 ? normalizeEmail(row[emailLushaCol]) : '';
        let outreachEmailCol = emailOutreachCol >= 0 ? normalizeEmail(row[emailOutreachCol]) : '';
        let primaryEmail = col.email >= 0 ? normalizeEmail(row[col.email]) : outreachEmailCol;

        if (sourceVendor === 'Apollo' && !apolloEmail) apolloEmail = primaryEmail;
        if (sourceVendor === 'Hunter' && !hunterEmail) hunterEmail = primaryEmail;
        if (sourceVendor === 'Lusha' && !lushaEmail) lushaEmail = primaryEmail;

        // Extract Phones
        let lushaPhone1 = phoneLusha1Col >= 0 ? String(row[phoneLusha1Col] || '').trim() : '';
        let lushaPhone2 = phoneLusha2Col >= 0 ? String(row[phoneLusha2Col] || '').trim() : '';
        let primaryPhone = col.phone >= 0 ? String(row[col.phone] || '').trim() : '';

        if (sourceVendor === 'Lusha') {
          if (!lushaPhone1) lushaPhone1 = primaryPhone;
        }

        // Normalize domain from mapped website column only — never infer from email here
        let domain = normalizeDomain(rawDomain);
        const activeEmail = apolloEmail || lushaEmail || hunterEmail || primaryEmail;

        if (!activeEmail && !linkedinUrl && !name) {
          continue;
        }

        rawContacts.push({
          name,
          designation,
          companyName,
          domain,
          linkedinUrl,
          apolloEmail,
          hunterEmail,
          lushaEmail,
          primaryEmail,
          lushaPhone1,
          lushaPhone2,
          primaryPhone,
          vendor: sourceVendor,
          isGenericInbox: Boolean(activeEmail && !name && (isGenericMailboxEmail(activeEmail) || !linkedinUrl)),
        });
      }
    }
  }

  // 2. Perform Deduplication and Grouping in memory
  const groups = [];

  function getMatchKeys(contact) {
    const keys = [];
    const normLi = normalizeUrl(contact.linkedinUrl);
    if (normLi) keys.push(`li:${normLi}`);
    
    const normName = contact.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normComp = contact.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normDom = contact.domain.toLowerCase().trim();

    if (normName && normComp) keys.push(`namecomp:${normName}:${normComp}`);
    if (normName && normDom) keys.push(`namedom:${normName}:${normDom}`);

    const emails = [contact.apolloEmail, contact.hunterEmail, contact.lushaEmail, contact.primaryEmail]
      .map(e => normalizeEmail(e))
      .filter(Boolean);
    for (const email of emails) {
      keys.push(`email:${email}`);
    }

    return keys;
  }

  for (const contact of rawContacts) {
    const matchKeys = getMatchKeys(contact);
    let matchedGroup = null;

    for (const group of groups) {
      const hasMatch = matchKeys.some(k => group.keys.has(k));
      if (hasMatch) {
        matchedGroup = group;
        break;
      }
    }

    if (matchedGroup) {
      matchedGroup.contacts.push(contact);
      for (const k of matchKeys) matchedGroup.keys.add(k);
    } else {
      groups.push({
        contacts: [contact],
        keys: new Set(matchKeys)
      });
    }
  }

  // 3. Save / Update in MongoDB
  const companiesInProject = await Company.find({ projectsAssociated: projectId }).lean();
  const domainToCompany = new Map(companiesInProject.map((c) => [c.domain, c]));

  for (const group of groups) {
    const contacts = group.contacts;

    const name = contacts.map((c) => c.name).find(Boolean) || '';
    const designation = contacts.map((c) => c.designation).find(Boolean) || '';
    const linkedinUrl = contacts.map((c) => c.linkedinUrl).find(Boolean) || '';
    const companyName = contacts.map((c) => c.companyName).find(Boolean) || '';
    const websiteDomain = contacts.map((c) => c.domain).find(Boolean) || '';

    const apolloEmail = firstContactEmail(contacts.map((c) => c.apolloEmail).find(Boolean) || '');
    const hunterEmail = firstContactEmail(contacts.map((c) => c.hunterEmail).find(Boolean) || '');
    const lushaEmail = firstContactEmail(contacts.map((c) => c.lushaEmail).find(Boolean) || '');
    const primaryEmail = contacts.map((c) => c.primaryEmail).find(Boolean) || '';

    const dedupEmail = pickDedupEmail({
      apolloEmail,
      hunterEmail,
      lushaEmail,
      primaryEmail,
    });

    const vendorEmails = [apolloEmail, hunterEmail, lushaEmail, primaryEmail].filter(Boolean);
    const isGenericInbox = contacts.some((c) => c.isGenericInbox) || (!name && vendorEmails.length > 0);

    if (isGenericInbox) {
      const routed = await routeGenericEmailsToCompany({
        project,
        projectId,
        companyName,
        websiteDomain,
        emails: [...new Set(vendorEmails)],
        companiesInProject: [...domainToCompany.values()],
        domainToCompany,
        stats,
      });
      if (routed) continue;
    }

    const email = dedupEmail;
    if (!email || !isValidEmail(email)) {
      if (linkedinUrl && name) {
        stats.skipped += 1;
      } else {
        stats.invalidEmail += 1;
      }
      continue;
    }

    const suppressed = await Suppression.findOne({ email });
    if (suppressed) {
      stats.suppressed += 1;
      continue;
    }

    const emailDomain = normalizeDomain(email.split('@')[1] || '');
    const company = await resolveOrCreateCompany({
      project,
      projectId,
      companyName,
      websiteDomain,
      emailDomain,
      companiesInProject: [...domainToCompany.values()],
      domainToCompany,
      stats,
    });

    if (!company) {
      stats.invalidEmail += 1;
      continue;
    }

    const lushaPhone1 = contacts.map((c) => c.lushaPhone1).find(Boolean) || '';
    const lushaPhone2 = contacts.map((c) => c.lushaPhone2).find(Boolean) || '';
    const phone = lushaPhone1 || contacts.map((c) => c.primaryPhone).find(Boolean) || '';

    const sources = [...new Set(contacts.map((c) => c.vendor).filter(Boolean))];
    const primarySource = contacts[0]?.vendor || 'Manual';

    let lead = await Lead.findOne({ campaignId: projectId, email });
    if (lead) {
      lead.name = lead.name || name;
      lead.designation = lead.designation || designation;
      lead.linkedinUrl = lead.linkedinUrl || linkedinUrl;
      lead.companyId = company._id;
      lead.contactKind = 'person';
      if (apolloEmail) lead.emailApollo = apolloEmail;
      if (hunterEmail) lead.emailHunter = hunterEmail;
      if (lushaEmail) lead.emailLusha = lushaEmail;
      if (lushaPhone1) lead.phoneLusha1 = lushaPhone1;
      if (lushaPhone2) lead.phoneLusha2 = lushaPhone2;
      if (phone) lead.phone = phone;

      for (const s of sources) {
        if (!lead.sources.includes(s)) lead.sources.push(s);
      }
      await lead.save();
      stats.merged += 1;
    } else {
      lead = await Lead.create({
        companyId: company._id,
        campaignId: projectId,
        email,
        name,
        designation,
        linkedinUrl,
        emailApollo: apolloEmail,
        emailHunter: hunterEmail,
        emailLusha: lushaEmail,
        phoneLusha1: lushaPhone1,
        phoneLusha2: lushaPhone2,
        phone,
        sources,
        primarySource,
        contactKind: 'person',
        deliveryStatus: 'Pending Inqueue',
      });
      stats.inserted += 1;
    }
  }

  const pocAgg = await Lead.aggregate([
    { $match: { campaignId: project._id } },
    { $group: { _id: '$companyId' } },
    { $count: 'total' },
  ]);
  project.companiesWithPocsFound = pocAgg[0]?.total || 0;
  project.targetCompaniesCount = await Company.countDocuments({ projectsAssociated: project._id });
  await project.save();

  await computeProjectSnapshot(projectId);

  return stats;
}

export async function previewBlendAndIngestLeads(projectId, uploads) {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error('MongoDB is required.');
    error.status = 503;
    throw error;
  }

  const project = await ProjectCampaign.findById(projectId);
  if (!project) throw new Error('Project not found.');

  const stats = {
    inserted: 0,
    merged: 0,
    newCompanies: 0,
    invalidEmail: 0,
  };

  const rawContacts = [];

  for (const uploadItem of uploads) {
    const { sheets, fieldMapping, vendor } = uploadItem;
    const sourceVendor = vendor || 'Manual';

    for (const sheet of sheets) {
      const headers = sheet.headers;
      const col = {};
      for (const [field, headerName] of Object.entries(fieldMapping || {})) {
        col[field] = resolveColumnIndex(headers, headerName);
      }

      const emailApolloCol = resolveColumnIndex(headers, 'Email (Apollo)');
      const emailHunterCol = resolveColumnIndex(headers, 'Email (Hunter)');
      const emailLushaCol = resolveColumnIndex(headers, 'Email (Lusha)');
      const emailOutreachCol = resolveColumnIndex(headers, 'Email for Outreach');
      const phoneLusha1Col = resolveColumnIndex(headers, 'Lusha Phone 1') !== -1 ? resolveColumnIndex(headers, 'Lusha Phone 1') : resolveColumnIndex(headers, 'Phone 1');
      const phoneLusha2Col = resolveColumnIndex(headers, 'Lusha Phone 2') !== -1 ? resolveColumnIndex(headers, 'Lusha Phone 2') : resolveColumnIndex(headers, 'Phone 2');
      const linkedinUrlCol = resolveColumnIndex(headers, 'LinkedIn URL') !== -1 ? resolveColumnIndex(headers, 'LinkedIn URL') : resolveColumnIndex(headers, 'Person Linkedin Url');

      for (const row of sheet.dataRows) {
        const name = col.name >= 0 ? String(row[col.name] || '').trim() : '';
        const designation = col.designation >= 0 ? String(row[col.designation] || '').trim() : '';
        const companyName = col.companyName >= 0 ? String(row[col.companyName] || '').trim() : '';
        const rawDomain = col.domain >= 0 ? row[col.domain] : '';

        let linkedinUrl = '';
        if (linkedinUrlCol >= 0) linkedinUrl = String(row[linkedinUrlCol] || '').trim();
        else if (col.linkedin >= 0) linkedinUrl = String(row[col.linkedin] || '').trim();

        let apolloEmail = emailApolloCol >= 0 ? normalizeEmail(row[emailApolloCol]) : '';
        let hunterEmail = emailHunterCol >= 0 ? normalizeEmail(row[emailHunterCol]) : '';
        let lushaEmail = emailLushaCol >= 0 ? normalizeEmail(row[emailLushaCol]) : '';
        let primaryEmail = col.email >= 0 ? normalizeEmail(row[col.email]) : '';

        if (sourceVendor === 'Apollo' && !apolloEmail) apolloEmail = primaryEmail;
        if (sourceVendor === 'Hunter' && !hunterEmail) hunterEmail = primaryEmail;
        if (sourceVendor === 'Lusha' && !lushaEmail) lushaEmail = primaryEmail;

        let domain = normalizeDomain(rawDomain);
        const activeEmail = apolloEmail || lushaEmail || hunterEmail || primaryEmail;
        if (!domain || !domain.includes('.')) {
          if (activeEmail && activeEmail.includes('@')) {
            domain = normalizeDomain(activeEmail.split('@')[1]);
          }
        }

        if (!activeEmail && !linkedinUrl && !name) continue;

        rawContacts.push({
          name,
          designation,
          companyName,
          domain,
          linkedinUrl,
          apolloEmail,
          hunterEmail,
          lushaEmail,
          primaryEmail,
          vendor: sourceVendor
        });
      }
    }
  }

  // Deduplicate in memory
  const groups = [];

  function getMatchKeys(contact) {
    const keys = [];
    const normLi = normalizeUrl(contact.linkedinUrl);
    if (normLi) keys.push(`li:${normLi}`);
    
    const normName = contact.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normComp = contact.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normDom = contact.domain.toLowerCase().trim();

    if (normName && normComp) keys.push(`namecomp:${normName}:${normComp}`);
    if (normName && normDom) keys.push(`namedom:${normName}:${normDom}`);

    const emails = [contact.apolloEmail, contact.hunterEmail, contact.lushaEmail, contact.primaryEmail]
      .map(e => normalizeEmail(e))
      .filter(Boolean);
    for (const email of emails) {
      keys.push(`email:${email}`);
    }

    return keys;
  }

  for (const contact of rawContacts) {
    const matchKeys = getMatchKeys(contact);
    let matchedGroup = null;

    for (const group of groups) {
      const hasMatch = matchKeys.some(k => group.keys.has(k));
      if (hasMatch) {
        matchedGroup = group;
        break;
      }
    }

    if (matchedGroup) {
      matchedGroup.contacts.push(contact);
      for (const k of matchKeys) matchedGroup.keys.add(k);
    } else {
      groups.push({
        contacts: [contact],
        keys: new Set(matchKeys)
      });
    }
  }

  const companiesInProject = await Company.find({ projectsAssociated: projectId }).lean();
  const knownDomains = new Set(companiesInProject.map((c) => c.domain));
  const seenNewDomains = new Set();

  for (const group of groups) {
    const contacts = group.contacts;
    const apolloEmails = [...new Set(contacts.map(c => c.apolloEmail).filter(Boolean))];
    const hunterEmails = [...new Set(contacts.map(c => c.hunterEmail).filter(Boolean))];
    const lushaEmails = [...new Set(contacts.map(c => c.lushaEmail).filter(Boolean))];
    
    let email = apolloEmails[0] || lushaEmails[0] || hunterEmails[0] || contacts.map(c => c.primaryEmail).find(Boolean) || '';

    if (!email || !isValidEmail(email)) {
      stats.invalidEmail += 1;
      continue;
    }

    const domain = contacts.map(c => c.domain).find(Boolean) || normalizeDomain(email.split('@')[1] || '');

    if (!domain || !domain.includes('.')) {
      stats.invalidEmail += 1;
      continue;
    }

    if (!knownDomains.has(domain) && !seenNewDomains.has(domain)) {
      const existsGlobally = await Company.findOne({ domain }).select('_id').lean();
      if (!existsGlobally) {
        seenNewDomains.add(domain);
        stats.newCompanies += 1;
      }
    }

    const existing = await Lead.findOne({ campaignId: projectId, email });
    if (existing) stats.merged += 1;
    else stats.inserted += 1;
  }

  return stats;
}

export async function ingestLeads(projectId, { sheets, fieldMapping, vendor }) {
  return blendAndIngestLeads(projectId, [{ sheets, fieldMapping, vendor }]);
}

export async function previewIngestion(projectId, { sheets, fieldMapping }) {
  let wouldInsert = 0;
  let wouldMerge = 0;
  let newCompanies = 0;
  let invalidEmail = 0;
  const companiesInProject = await Company.find({ projectsAssociated: projectId }).lean();
  const knownDomains = new Set(companiesInProject.map((c) => c.domain));
  const seenNewDomains = new Set();

  for (const sheet of sheets) {
    const headers = sheet.headers;
    const col = {};
    for (const [field, headerName] of Object.entries(fieldMapping || {})) {
      col[field] = resolveColumnIndex(headers, headerName);
    }

    const emailApolloCol = resolveColumnIndex(headers, 'Email (Apollo)');
    const emailHunterCol = resolveColumnIndex(headers, 'Email (Hunter)');
    const emailLushaCol = resolveColumnIndex(headers, 'Email (Lusha)');

    for (const row of sheet.dataRows) {
      const apolloEmail = emailApolloCol >= 0 ? normalizeEmail(row[emailApolloCol]) : '';
      const hunterEmail = emailHunterCol >= 0 ? normalizeEmail(row[emailHunterCol]) : '';
      const lushaEmail = emailLushaCol >= 0 ? normalizeEmail(row[emailLushaCol]) : '';
      const primaryEmail = col.email >= 0 ? normalizeEmail(row[col.email]) : '';
      
      const email = apolloEmail || lushaEmail || hunterEmail || primaryEmail;
      if (!email || !isValidEmail(email)) {
        invalidEmail += 1;
        continue;
      }

      let domain = normalizeDomain(col.domain >= 0 ? row[col.domain] : '');
      if (!domain || !domain.includes('.')) {
        domain = normalizeDomain(email.split('@')[1] || '');
      }
      if (!domain || !domain.includes('.')) {
        invalidEmail += 1;
        continue;
      }

      if (!knownDomains.has(domain) && !seenNewDomains.has(domain)) {
        const existsGlobally = await Company.findOne({ domain }).select('_id').lean();
        if (!existsGlobally) {
          seenNewDomains.add(domain);
          newCompanies += 1;
        }
      }

      const existing = await Lead.findOne({ campaignId: projectId, email });
      if (existing) wouldMerge += 1;
      else wouldInsert += 1;
    }
  }

  return { inserted: wouldInsert, merged: wouldMerge, newCompanies, invalidEmail, preview: true };
}
