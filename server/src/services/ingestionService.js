import XLSX from 'xlsx';
import db from '../db/index.js';
import { normalizeDomain, normalizeEmail, isValidEmail } from '../utils/normalizeDomain.js';
import { normalizeGenericEmails } from '../utils/companyEmails.js';
import { computeProjectSnapshot } from './analyticsCronService.js';
import { resolveCompanyForContact, isGenericMailboxEmail } from '../utils/companyResolver.js';
import { pickDedupEmail, firstContactEmail, joinContactEmails, normalizePersonName } from '../utils/contactEmails.js';
import { fixMojibakeName } from '../utils/fixMojibakeName.js';

const FIELD_ALIASES = {
  email: ['email', 'emailaddress', 'mail', 'e-mail', 'contactemail', 'primaryemail', 'email_address', 'emailforoutreach'],
  emailApollo: ['emailapollo', 'apolloemail'],
  emailHunter: ['emailhunter', 'hunteremail'],
  emailLusha: ['emaillusha', 'lushaemail', 'workemail'],
  emailLusha2: ['emaillusha2', 'lushaemail2', 'workemail2'],
  emailPersonal: ['emailpersonal', 'personalemail', 'privateemail'],
  name: ['name', 'fullname', 'contactname', 'person', 'full name'],
  firstName: ['firstname', 'contactfirstname', 'first name'],
  lastName: ['lastname', 'contactlastname', 'last name', 'surname'],
  designation: ['designation', 'title', 'jobtitle', 'position', 'role'],
  companyName: ['company', 'companyname', 'organization', 'organisation', 'accountname', 'account'],
  domain: ['domain', 'website', 'companywebsite', 'url', 'companydomain', 'websiteurl', 'web'],
  industry: ['industry', 'sector', 'vertical'],
  boothNumber: ['booth', 'boothnumber', 'stand', 'standnumber', 'hall', 'location'],
  phone: ['phone', 'phonenumber', 'mobile', 'directphone', 'phone_number', 'mobile_phone', 'direct_phone', 'companyphone'],
  linkedin: ['linkedin', 'linkedinurl', 'personlinkedinurl', 'profileurl', 'contactlinkedin', 'linkedin_url', 'person_linkedin_url', 'linkedinprofile'],
  
  // Scraper fields
  city: ['city', 'hqcity', 'location', 'companycity'],
  country: ['country', 'hqcountry', 'locationcountry', 'companycountry'],
  genericEmail: ['genericemail', 'generalemail', 'infoemail', 'companyemail'],
  genericPhone: ['genericphone', 'generalphone', 'infophone', 'companyphone'],
  notes: ['notes', 'note', 'comments', 'comment'],
};

export const COMPANY_FIELDS = ['companyName', 'domain', 'industry', 'boothNumber', 'city', 'country', 'genericEmail', 'genericPhone', 'notes'];
export const CONTACT_FIELDS = [
  'name',
  'firstName',
  'lastName',
  'designation',
  'companyName',
  'domain',
  'emailApollo',
  'emailHunter',
  'emailLusha',
  'emailLusha2',
  'emailPersonal',
  'email',
  'phone',
  'linkedin',
];

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

/** Build full contact name from Full name and/or First + Last columns (Apollo-style). */
function resolvePersonName(headers, col, row) {
  const firstNameIdx = col.firstName >= 0
    ? col.firstName
    : resolveColumnIndex(headers, 'First Name');
  const lastNameIdx = col.lastName >= 0
    ? col.lastName
    : resolveColumnIndex(headers, 'Last Name');

  const firstName = firstNameIdx >= 0 ? String(row[firstNameIdx] || '').trim() : '';
  const lastName = lastNameIdx >= 0 ? String(row[lastNameIdx] || '').trim() : '';
  const combined = fixMojibakeName([firstName, lastName].filter(Boolean).join(' '));

  const nameMappedToFirstOnly = col.name >= 0 && firstNameIdx >= 0 && col.name === firstNameIdx;
  const nameFromCol = (!nameMappedToFirstOnly && col.name >= 0)
    ? fixMojibakeName(String(row[col.name] || '').trim())
    : '';

  if (nameFromCol) {
    if (lastName && firstName && normalizePersonName(nameFromCol) === normalizePersonName(firstName)) {
      return combined;
    }
    return nameFromCol;
  }

  return combined;
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

/** PostgreSQL helper to resolve or create an organization by domain or name */
async function resolveOrCreateCompany({
  campaignId,
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
    // Ensure company is linked to campaign account
    await db.query(
      `INSERT INTO campaign_accounts (campaign_id, organization_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT DO NOTHING`,
      [campaignId, resolved.company._id || resolved.company.id]
    );
    return resolved.company;
  }

  const createDomain = normalizeDomain(websiteDomain) || normalizeDomain(emailDomain);
  if (!createDomain || !createDomain.includes('.')) {
    return null;
  }

  // Look up existing organization by domain or canonical name in PostgreSQL
  const qOrg = await db.query(
    `SELECT o.id, o.canonical_name, oi.normalized_value AS domain
     FROM organizations o
     JOIN organization_identifiers oi ON oi.organization_id = o.id AND oi.type = 'domain'
     WHERE oi.normalized_value = $1 OR lower(o.canonical_name) = lower($2)
     LIMIT 1`,
    [createDomain, companyName || deriveCompanyNameFromDomain(createDomain)]
  );

  let company = null;
  if (qOrg.rows.length > 0) {
    const row = qOrg.rows[0];
    company = { _id: row.id, id: row.id, companyName: row.canonical_name, domain: row.domain };
  } else {
    // Insert new organization
    const nameToUse = companyName || deriveCompanyNameFromDomain(createDomain);
    const insOrg = await db.query(
      `INSERT INTO organizations (canonical_name) VALUES ($1) RETURNING id, canonical_name`,
      [nameToUse]
    );
    const orgId = insOrg.rows[0].id;

    // Insert domain identifier
    await db.query(
      `INSERT INTO organization_identifiers (organization_id, type, original_value, normalized_value)
       VALUES ($1::uuid, 'domain', $2, $2)
       ON CONFLICT DO NOTHING`,
      [orgId, createDomain]
    );

    company = { _id: orgId, id: orgId, companyName: nameToUse, domain: createDomain };
    stats.companiesCreated = (stats.companiesCreated || 0) + 1;
  }

  // Ensure linked in campaign_accounts
  await db.query(
    `INSERT INTO campaign_accounts (campaign_id, organization_id)
     VALUES ($1::uuid, $2::uuid)
     ON CONFLICT DO NOTHING`,
    [campaignId, company.id]
  );

  if (domainToCompany && company.domain) {
    domainToCompany.set(company.domain, company);
  }
  return company;
}

async function routeGenericEmailsToCompany({
  campaignId,
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
    campaignId,
    companyName,
    websiteDomain,
    emailDomain,
    companiesInProject,
    domainToCompany,
    stats,
  });
  if (!company) {
    stats.skipped = (stats.skipped || 0) + 1;
    return true;
  }

  for (const email of emails) {
    const norm = normalizeEmail(email);
    if (!norm) continue;
    await db.query(
      `INSERT INTO organization_contact_methods (organization_id, type, original_value, normalized_value)
       VALUES ($1::uuid, 'email', $2, $3)
       ON CONFLICT DO NOTHING`,
      [company.id, email, norm]
    );
  }
  stats.genericRouted = (stats.genericRouted || 0) + emails.length;
  return true;
}

export async function blendAndIngestLeads(projectId, uploads) {
  // Query campaign from PostgreSQL
  const campaignRes = await db.query(
    `SELECT id, name FROM campaigns WHERE id::text = $1 OR mongo_campaign_id = $1 LIMIT 1`,
    [String(projectId)]
  );
  if (!campaignRes.rows.length) {
    const error = new Error('Project not found.');
    error.status = 404;
    throw error;
  }

  const campaign = campaignRes.rows[0];
  const campaignId = campaign.id;

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

      const emailApolloCol = resolveColumnIndex(headers, 'Email (Apollo)');
      const emailHunterCol = resolveColumnIndex(headers, 'Email (Hunter)');
      const emailLushaCol = resolveColumnIndex(headers, 'Email (Lusha)');
      const emailOutreachCol = resolveColumnIndex(headers, 'Email for Outreach');
      const phoneLusha1Col = resolveColumnIndex(headers, 'Lusha Phone 1') !== -1 ? resolveColumnIndex(headers, 'Lusha Phone 1') : resolveColumnIndex(headers, 'Phone 1');
      const phoneLusha2Col = resolveColumnIndex(headers, 'Lusha Phone 2') !== -1 ? resolveColumnIndex(headers, 'Lusha Phone 2') : resolveColumnIndex(headers, 'Phone 2');
      const linkedinUrlCol = resolveColumnIndex(headers, 'LinkedIn URL') !== -1 ? resolveColumnIndex(headers, 'LinkedIn URL') : resolveColumnIndex(headers, 'Person Linkedin Url');

      for (const row of sheet.dataRows) {
        const name = resolvePersonName(headers, col, row);
        const designation = col.designation >= 0 ? String(row[col.designation] || '').trim() : '';
        const companyName = col.companyName >= 0 ? String(row[col.companyName] || '').trim() : '';
        const rawDomain = col.domain >= 0 ? row[col.domain] : '';

        let linkedinUrl = '';
        if (linkedinUrlCol >= 0) linkedinUrl = String(row[linkedinUrlCol] || '').trim();
        else if (col.linkedin >= 0) linkedinUrl = String(row[col.linkedin] || '').trim();

        let apolloEmail = col.emailApollo >= 0 ? String(row[col.emailApollo] || '') : '';
        let hunterEmail = col.emailHunter >= 0 ? String(row[col.emailHunter] || '') : '';
        let lushaEmail = col.emailLusha >= 0 ? String(row[col.emailLusha] || '') : '';
        let lushaEmail2 = col.emailLusha2 >= 0 ? String(row[col.emailLusha2] || '') : '';
        let personalEmail = col.emailPersonal >= 0 ? String(row[col.emailPersonal] || '') : '';
        if (!apolloEmail && emailApolloCol >= 0) apolloEmail = String(row[emailApolloCol] || '');
        if (!hunterEmail && emailHunterCol >= 0) hunterEmail = String(row[emailHunterCol] || '');
        if (!lushaEmail && emailLushaCol >= 0) lushaEmail = String(row[emailLushaCol] || '');
        let outreachEmailCol = emailOutreachCol >= 0 ? String(row[emailOutreachCol] || '') : '';
        let primaryEmail = col.email >= 0 ? String(row[col.email] || '') : outreachEmailCol;

        apolloEmail = joinContactEmails([apolloEmail]);
        hunterEmail = joinContactEmails([hunterEmail]);
        lushaEmail = joinContactEmails([lushaEmail, lushaEmail2]);
        personalEmail = joinContactEmails([personalEmail]);
        primaryEmail = joinContactEmails([primaryEmail]);

        if (sourceVendor === 'Apollo' && !apolloEmail) apolloEmail = primaryEmail;
        if (sourceVendor === 'Hunter' && !hunterEmail) hunterEmail = primaryEmail;
        if (sourceVendor === 'Lusha' && !lushaEmail) lushaEmail = primaryEmail;

        let lushaPhone1 = phoneLusha1Col >= 0 ? String(row[phoneLusha1Col] || '').trim() : '';
        let lushaPhone2 = phoneLusha2Col >= 0 ? String(row[phoneLusha2Col] || '').trim() : '';
        let primaryPhone = col.phone >= 0 ? String(row[col.phone] || '').trim() : '';

        if (sourceVendor === 'Lusha' && !lushaPhone1) {
          lushaPhone1 = primaryPhone;
        }

        let domain = normalizeDomain(rawDomain);
        const activeEmail = firstContactEmail(apolloEmail || lushaEmail || hunterEmail || personalEmail || primaryEmail);

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
          personalEmail,
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

  // 2. Group contacts in memory
  const groups = [];

  function getMatchKeys(contact) {
    const keys = [];
    const normLi = normalizeUrl(contact.linkedinUrl);
    if (normLi) keys.push(`li:${normLi}`);

    const normName = normalizePersonName(contact.name);
    const normDom = normalizeDomain(contact.domain);

    if (normName && normDom) keys.push(`namedom:${normName}:${normDom}`);

    const emails = [
      contact.apolloEmail,
      contact.hunterEmail,
      contact.lushaEmail,
      contact.personalEmail,
      contact.primaryEmail,
    ].flatMap((value) => String(value || '').split(/[;,]/).map((e) => normalizeEmail(e)).filter(Boolean));
    for (const email of emails) {
      keys.push(`email:${email}`);
    }

    return keys;
  }

  for (const contact of rawContacts) {
    const matchKeys = getMatchKeys(contact);
    let matchedGroup = null;

    for (const group of groups) {
      const hasMatch = matchKeys.some((k) => group.keys.has(k));
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
        keys: new Set(matchKeys),
      });
    }
  }

  // Load existing project companies from PostgreSQL
  const orgRes = await db.query(
    `SELECT o.id, o.canonical_name, oi.normalized_value AS domain
     FROM campaign_accounts ca
     JOIN organizations o ON ca.organization_id = o.id
     LEFT JOIN organization_identifiers oi ON oi.organization_id = o.id AND oi.type = 'domain'
     WHERE ca.campaign_id = $1::uuid`,
    [campaignId]
  );
  const companiesInProject = orgRes.rows.map((r) => ({
    _id: r.id,
    id: r.id,
    companyName: r.canonical_name,
    domain: r.domain,
  }));
  const domainToCompany = new Map(companiesInProject.filter((c) => c.domain).map((c) => [c.domain, c]));

  // Process groups and insert/update in PostgreSQL
  for (const group of groups) {
    const contacts = group.contacts;

    const name = contacts.map((c) => c.name).find(Boolean) || '';
    const designation = contacts.map((c) => c.designation).find(Boolean) || '';
    const linkedinUrl = contacts.map((c) => c.linkedinUrl).find(Boolean) || '';
    const companyName = contacts.map((c) => c.companyName).find(Boolean) || '';
    const websiteDomain = contacts.map((c) => c.domain).find(Boolean) || '';

    const apolloEmail = joinContactEmails(contacts.map((c) => c.apolloEmail));
    const hunterEmail = joinContactEmails(contacts.map((c) => c.hunterEmail));
    const lushaEmail = joinContactEmails(contacts.map((c) => c.lushaEmail));
    const personalEmail = joinContactEmails(contacts.map((c) => c.personalEmail));
    const primaryEmail = joinContactEmails(contacts.map((c) => c.primaryEmail));

    const dedupEmail = pickDedupEmail({
      apolloEmail,
      hunterEmail,
      lushaEmail,
      personalEmail,
      primaryEmail,
    });

    const vendorEmails = [
      ...String(apolloEmail || '').split(/[;,]/),
      ...String(hunterEmail || '').split(/[;,]/),
      ...String(lushaEmail || '').split(/[;,]/),
      ...String(personalEmail || '').split(/[;,]/),
      ...String(primaryEmail || '').split(/[;,]/),
    ].map((e) => normalizeEmail(e)).filter(Boolean);

    const isGenericInbox = contacts.some((c) => c.isGenericInbox) || (!name && vendorEmails.length > 0);

    if (isGenericInbox) {
      const routed = await routeGenericEmailsToCompany({
        campaignId,
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

    // Check PostgreSQL suppression table
    const suppRes = await db.query(
      `SELECT id FROM endpoint_suppressions WHERE normalized_value = $1 OR endpoint = $1 LIMIT 1`,
      [email.toLowerCase()]
    );
    if (suppRes.rows.length > 0) {
      stats.suppressed += 1;
      continue;
    }

    const emailDomain = normalizeDomain(email.split('@')[1] || '');
    const company = await resolveOrCreateCompany({
      campaignId,
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

    const sources = [...new Set([
      ...contacts.map((c) => c.vendor).filter((v) => v && v !== 'Manual'),
      ...(apolloEmail ? ['Apollo'] : []),
      ...(hunterEmail ? ['Hunter'] : []),
      ...(lushaEmail ? ['Lusha'] : []),
    ])];
    if (!sources.length) sources.push('Manual');

    // Check if person exists by email in person_contact_methods
    const pRes = await db.query(
      `SELECT pcm.person_id, p.display_name, por.id AS role_id, cc.id AS campaign_contact_id
       FROM person_contact_methods pcm
       JOIN people p ON pcm.person_id = p.id
       LEFT JOIN person_organization_roles por ON por.person_id = p.id AND por.organization_id = $2::uuid
       LEFT JOIN campaign_accounts ca ON ca.organization_id = por.organization_id AND ca.campaign_id = $3::uuid
       LEFT JOIN campaign_contacts cc ON cc.campaign_account_id = ca.id AND cc.role_id = por.id
       WHERE pcm.normalized_value = $1 AND pcm.type = 'email'
       LIMIT 1`,
      [email.toLowerCase(), company.id, campaignId]
    );

    let personId = null;
    let roleId = null;
    let campaignContactId = null;

    if (pRes.rows.length > 0) {
      const row = pRes.rows[0];
      personId = row.person_id;
      roleId = row.role_id;
      campaignContactId = row.campaign_contact_id;

      // Update person display_name if new name is fuller
      if (name) {
        const existingParts = String(row.display_name || '').trim().split(/\s+/).filter(Boolean).length;
        const newParts = name.split(/\s+/).filter(Boolean).length;
        if (!row.display_name || newParts > existingParts) {
          await db.query(`UPDATE people SET display_name = $1 WHERE id = $2::uuid`, [name, personId]);
        }
      }
      stats.merged += 1;
    } else {
      // Create new person
      const insP = await db.query(
        `INSERT INTO people (display_name) VALUES ($1) RETURNING id`,
        [name || email.split('@')[0]]
      );
      personId = insP.rows[0].id;
      stats.inserted += 1;
    }

    // Insert email contact method if missing
    await db.query(
      `INSERT INTO person_contact_methods (person_id, type, original_value, normalized_value, source, preferred)
       VALUES ($1::uuid, 'email', $2, $3, $4, true)
       ON CONFLICT DO NOTHING`,
      [personId, email, email.toLowerCase(), sources[0] || 'Manual']
    );

    // Add secondary emails / phone / linkedin to person_contact_methods
    if (linkedinUrl) {
      await db.query(
        `INSERT INTO person_contact_methods (person_id, type, original_value, normalized_value, source)
         VALUES ($1::uuid, 'linkedin', $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [personId, linkedinUrl, normalizeUrl(linkedinUrl), sources[0] || 'Manual']
      );
    }
    if (phone) {
      await db.query(
        `INSERT INTO person_contact_methods (person_id, type, original_value, normalized_value, source)
         VALUES ($1::uuid, 'phone', $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [personId, phone, phone.replace(/[^0-9+]/g, ''), sources[0] || 'Manual']
      );
    }

    // Ensure role exists in person_organization_roles
    if (!roleId) {
      const insRole = await db.query(
        `INSERT INTO person_organization_roles (person_id, organization_id, title)
         VALUES ($1::uuid, $2::uuid, $3)
         RETURNING id`,
        [personId, company.id, designation || null]
      );
      roleId = insRole.rows[0].id;
    } else if (designation) {
      await db.query(
        `UPDATE person_organization_roles SET title = $1 WHERE id = $2::uuid AND title IS NULL`,
        [designation, roleId]
      );
    }

    // Ensure campaign_account exists
    const caRes = await db.query(
      `INSERT INTO campaign_accounts (campaign_id, organization_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (campaign_id, organization_id) DO UPDATE SET campaign_id = EXCLUDED.campaign_id
       RETURNING id`,
      [campaignId, company.id]
    );
    const campaignAccountId = caRes.rows[0].id;

    // Ensure campaign_contact exists
    if (!campaignContactId) {
      await db.query(
        `INSERT INTO campaign_contacts (campaign_account_id, role_id, lead_state)
         VALUES ($1::uuid, $2::uuid, 'new')
         ON CONFLICT DO NOTHING`,
        [campaignAccountId, roleId]
      );
    }
  }

  // Update target metrics on campaign in PostgreSQL
  await db.query(
    `UPDATE campaigns
     SET target_companies_count = (
           SELECT COUNT(DISTINCT organization_id) FROM campaign_accounts WHERE campaign_id = $1::uuid
         ),
         companies_with_pocs_found = (
           SELECT COUNT(DISTINCT ca.organization_id)
           FROM campaign_contacts cc
           JOIN campaign_accounts ca ON cc.campaign_account_id = ca.id
           WHERE ca.campaign_id = $1::uuid
         )
     WHERE id = $1::uuid`,
    [campaignId]
  );

  await computeProjectSnapshot(campaignId);

  return stats;
}

export async function previewBlendAndIngestLeads(projectId, uploads) {
  const campaignRes = await db.query(
    `SELECT id FROM campaigns WHERE id::text = $1 OR mongo_campaign_id = $1 LIMIT 1`,
    [String(projectId)]
  );
  if (!campaignRes.rows.length) {
    throw new Error('Project not found.');
  }
  const campaignId = campaignRes.rows[0].id;

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

      for (const row of sheet.dataRows) {
        const name = resolvePersonName(headers, col, row);
        const designation = col.designation >= 0 ? String(row[col.designation] || '').trim() : '';
        const companyName = col.companyName >= 0 ? String(row[col.companyName] || '').trim() : '';
        const rawDomain = col.domain >= 0 ? row[col.domain] : '';

        let apolloEmail = col.emailApollo >= 0 ? String(row[col.emailApollo] || '') : '';
        let hunterEmail = col.emailHunter >= 0 ? String(row[col.emailHunter] || '') : '';
        let lushaEmail = col.emailLusha >= 0 ? String(row[col.emailLusha] || '') : '';
        let primaryEmail = col.email >= 0 ? String(row[col.email] || '') : '';
        if (!primaryEmail && emailOutreachCol >= 0) primaryEmail = String(row[emailOutreachCol] || '');

        apolloEmail = joinContactEmails([apolloEmail]);
        hunterEmail = joinContactEmails([hunterEmail]);
        lushaEmail = joinContactEmails([lushaEmail]);
        primaryEmail = joinContactEmails([primaryEmail]);

        let domain = normalizeDomain(rawDomain);
        const activeEmail = firstContactEmail(apolloEmail || lushaEmail || hunterEmail || primaryEmail);
        if (!domain || !domain.includes('.')) {
          if (activeEmail && activeEmail.includes('@')) {
            domain = normalizeDomain(activeEmail.split('@')[1]);
          }
        }

        if (!activeEmail && !name) continue;

        rawContacts.push({
          name,
          designation,
          companyName,
          domain,
          apolloEmail,
          hunterEmail,
          lushaEmail,
          primaryEmail,
          vendor: sourceVendor,
        });
      }
    }
  }

  // Deduplicate in memory
  const groups = [];

  for (const contact of rawContacts) {
    const email = contact.apolloEmail || contact.lushaEmail || contact.hunterEmail || contact.primaryEmail;
    const norm = normalizeEmail(email);
    if (!norm) continue;

    let matched = groups.find((g) => g.emails.has(norm));
    if (matched) {
      matched.contacts.push(contact);
    } else {
      groups.push({
        contacts: [contact],
        emails: new Set([norm]),
      });
    }
  }

  const knownOrgRes = await db.query(
    `SELECT oi.normalized_value AS domain
     FROM campaign_accounts ca
     JOIN organization_identifiers oi ON oi.organization_id = ca.organization_id AND oi.type = 'domain'
     WHERE ca.campaign_id = $1::uuid`,
    [campaignId]
  );
  const knownDomains = new Set(knownOrgRes.rows.map((r) => r.domain));
  const seenNewDomains = new Set();

  for (const group of groups) {
    const contacts = group.contacts;
    const email = Array.from(group.emails)[0];

    if (!email || !isValidEmail(email)) {
      stats.invalidEmail += 1;
      continue;
    }

    const domain = contacts.map((c) => c.domain).find(Boolean) || normalizeDomain(email.split('@')[1] || '');

    if (!domain || !domain.includes('.')) {
      stats.invalidEmail += 1;
      continue;
    }

    if (!knownDomains.has(domain) && !seenNewDomains.has(domain)) {
      const globRes = await db.query(
        `SELECT id FROM organization_identifiers WHERE type = 'domain' AND normalized_value = $1 LIMIT 1`,
        [domain]
      );
      if (!globRes.rows.length) {
        seenNewDomains.add(domain);
        stats.newCompanies += 1;
      }
    }

    const existRes = await db.query(
      `SELECT pcm.id
       FROM person_contact_methods pcm
       JOIN person_organization_roles por ON por.person_id = pcm.person_id
       JOIN campaign_accounts ca ON ca.organization_id = por.organization_id
       WHERE ca.campaign_id = $1::uuid AND pcm.normalized_value = $2 AND pcm.type = 'email'
       LIMIT 1`,
      [campaignId, email]
    );

    if (existRes.rows.length > 0) {
      stats.merged += 1;
    } else {
      stats.inserted += 1;
    }
  }

  return stats;
}

export async function ingestLeads(projectId, { sheets, fieldMapping, vendor }) {
  return blendAndIngestLeads(projectId, [{ sheets, fieldMapping, vendor }]);
}

export async function previewIngestion(projectId, { sheets, fieldMapping }) {
  return previewBlendAndIngestLeads(projectId, [{ sheets, fieldMapping }]);
}
