import XLSX from 'xlsx';
import mongoose from 'mongoose';
import { Company } from '../models/Company.js';
import { Lead } from '../models/Lead.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { Suppression } from '../models/Suppression.js';
import { normalizeDomain, normalizeEmail, isValidEmail } from '../utils/normalizeDomain.js';

const FIELD_ALIASES = {
  email: ['email', 'emailaddress', 'mail', 'e-mail', 'workemail', 'contactemail'],
  name: ['name', 'fullname', 'contactname', 'person', 'contactfirstname', 'firstname', 'first name'],
  designation: ['designation', 'title', 'jobtitle', 'position', 'role'],
  companyName: ['company', 'companyname', 'organization', 'organisation', 'accountname', 'account'],
  domain: ['domain', 'website', 'companywebsite', 'url', 'companydomain', 'websiteurl', 'web'],
  industry: ['industry', 'sector', 'vertical'],
  boothNumber: ['booth', 'boothnumber', 'stand', 'standnumber', 'hall', 'location'],
  phone: ['phone', 'phonenumber', 'mobile', 'directphone'],
};

export const COMPANY_FIELDS = ['companyName', 'domain', 'industry', 'boothNumber'];
export const CONTACT_FIELDS = ['email', 'name', 'designation', 'companyName', 'domain', 'phone'];

/** Best-effort readable company name from a bare domain, e.g. al-futtaim.com -> Al Futtaim */
function deriveCompanyNameFromDomain(domain) {
  const base = String(domain || '').split('.')[0].replace(/[-_]+/g, ' ').trim();
  if (!base) return domain || 'Unknown company';
  return base
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

const VENDOR_HEADERS = {
  Apollo: ['apollo', 'apollo.io'],
  Hunter: ['hunter', 'hunter.io'],
  Lusha: ['lusha'],
};

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function detectVendor(headers) {
  const joined = headers.map(normalizeHeader).join(' ');
  for (const [vendor, markers] of Object.entries(VENDOR_HEADERS)) {
    if (markers.some((m) => joined.includes(m.replace(/[^a-z0-9]/g, '')))) {
      return vendor;
    }
  }
  return 'Manual';
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

    const headerIndex = rows.findIndex((row) => row.some(Boolean));
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
        companyName: col.companyName >= 0 ? row[col.companyName] : '',
        domain: col.domain >= 0 ? row[col.domain] : '',
        industry: col.industry >= 0 ? row[col.industry] : '',
        boothNumber: col.boothNumber >= 0 ? row[col.boothNumber] : '',
      });
    }
  }
  return rows;
}

export async function ingestLeads(projectId, { sheets, fieldMapping, vendor }) {
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

  const sourceVendor = vendor || 'Manual';
  const stats = {
    inserted: 0,
    merged: 0,
    skipped: 0,
    companiesCreated: 0,
    invalidEmail: 0,
    suppressed: 0,
  };
  const companiesInProject = await Company.find({ projectsAssociated: projectId }).lean();
  const domainToCompany = new Map(companiesInProject.map((c) => [c.domain, c]));

  for (const sheet of sheets) {
    const headers = sheet.headers;
    const col = {};
    for (const [field, headerName] of Object.entries(fieldMapping || {})) {
      col[field] = resolveColumnIndex(headers, headerName);
    }

    for (const row of sheet.dataRows) {
      const email = normalizeEmail(col.email >= 0 ? row[col.email] : '');
      const rawDomain = col.domain >= 0 ? row[col.domain] : '';
      const mappedCompanyName = col.companyName >= 0 ? String(row[col.companyName] || '').trim() : '';
      const name = col.name >= 0 ? String(row[col.name] || '').trim() : '';
      const designation = col.designation >= 0 ? String(row[col.designation] || '').trim() : '';
      const phone = col.phone >= 0 ? String(row[col.phone] || '').trim() : '';

      if (!email || !isValidEmail(email)) {
        stats.invalidEmail += 1;
        continue;
      }

      const suppressed = await Suppression.findOne({ email });
      if (suppressed) {
        stats.suppressed += 1;
        continue;
      }

      // Layer 1 — normalize domain, falling back to the email's domain so a lead always has a home.
      let domain = normalizeDomain(rawDomain);
      if (!domain || !domain.includes('.')) {
        domain = normalizeDomain(email.split('@')[1] || '');
      }
      if (!domain || !domain.includes('.')) {
        stats.invalidEmail += 1;
        continue;
      }

      // Layer 2 — resolve (or create) the target company for this domain inside the project.
      let company = domainToCompany.get(domain);
      if (!company) {
        company = await Company.findOne({ domain });
        if (company) {
          if (!company.projectsAssociated.some((cid) => String(cid) === String(projectId))) {
            await Company.updateOne({ _id: company._id }, { $addToSet: { projectsAssociated: project._id } });
          }
          company = company.toObject ? company.toObject() : company;
        } else {
          company = await Company.create({
            companyName: mappedCompanyName || deriveCompanyNameFromDomain(domain),
            domain,
            industry: '',
            projectsAssociated: [project._id],
          });
          company = company.toObject();
          stats.companiesCreated += 1;
        }
        domainToCompany.set(domain, company);
      }

      let lead = await Lead.findOne({ campaignId: projectId, email });
      if (lead) {
        if (!lead.sources.includes(sourceVendor)) {
          lead.sources.push(sourceVendor);
          await lead.save();
        }
        stats.merged += 1;
      } else {
        lead = await Lead.create({
          companyId: company._id,
          campaignId: projectId,
          email,
          name,
          designation,
          phone,
          sources: [sourceVendor],
          primarySource: sourceVendor,
          deliveryStatus: 'Pending Inqueue',
        });
        stats.inserted += 1;
      }
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

  return stats;
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

    for (const row of sheet.dataRows) {
      const email = normalizeEmail(col.email >= 0 ? row[col.email] : '');
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
