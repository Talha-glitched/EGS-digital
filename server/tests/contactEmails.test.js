import assert from 'node:assert/strict';
import {
  applyOutreachEmailFromReply,
  detectEmailVendor,
  getOutreachEmail,
  getSendTargetEmail,
  inferOutreachEmail,
  pickDedupEmail,
  setOutreachEmail,
} from '../src/utils/contactEmails.js';
import { resolveCompanyForContact } from '../src/utils/companyResolver.js';

console.log('contactEmails + companyResolver tests');

const lead = {
  email: 'joy@company.com',
  emailApollo: 'apollo@company.com',
  emailHunter: 'hunter@company.com',
  emailLusha: 'lusha@company.com',
  outreachEmail: '',
  primarySource: 'Hunter',
};

assert.equal(getOutreachEmail(lead), '');
assert.equal(getSendTargetEmail(lead, { vendor: 'Apollo' }), 'apollo@company.com');
assert.equal(detectEmailVendor(lead, 'hunter@company.com'), 'Hunter');

const applied = applyOutreachEmailFromReply(lead, 'hunter@company.com');
assert.equal(applied.applied, true);
assert.equal(lead.outreachEmail, 'hunter@company.com');
assert.equal(lead.outreachEmailSource, 'Hunter');
assert.equal(getOutreachEmail(lead), 'hunter@company.com');
assert.equal(getSendTargetEmail(lead, { vendor: 'Apollo' }), 'hunter@company.com');

const staleLead = {
  email: 'joy@company.com',
  emailApollo: '',
  emailHunter: '',
  emailLusha: '',
  outreachEmail: 'legacy@company.com',
  outreachEmailSource: 'Hunter',
};
const kept = setOutreachEmail(staleLead, 'legacy@company.com', 'Hunter');
assert.equal(kept.applied, true);
assert.equal(staleLead.outreachEmail, 'legacy@company.com');

const inferLead = {
  email: 'joy@company.com',
  emailApollo: 'apollo@company.com',
  emailHunter: '',
  emailLusha: '',
  outreachEmail: '',
  primarySource: 'Apollo',
};
const inferred = inferOutreachEmail(inferLead, { lastSentEmail: '' });
assert.equal(inferred?.source, 'Apollo');
assert.equal(inferred?.method, 'sole-vendor');

const companies = [
  { companyName: 'Stassen Exports (PVT) LTD.', domain: 'stassentea.com' },
  { companyName: 'Stassen Exports (PVT) LTD.', domain: 'prawahana.lk' },
  { companyName: 'Development of Ginger Dietary Supplements', domain: 'pnu.ac.th' },
];

const byName = resolveCompanyForContact({
  companyName: 'Stassen Exports (PVT) LTD.',
  websiteDomain: '',
  emailDomain: 'prawahana.lk',
  companiesInProject: companies,
});
assert.equal(byName.company.domain, 'stassentea.com');

const byNameOnly = resolveCompanyForContact({
  companyName: 'Stassen Exports (PVT) LTD.',
  websiteDomain: 'stassentea.com',
  emailDomain: 'prawahana.lk',
  companiesInProject: companies,
});
assert.equal(byNameOnly.company.domain, 'stassentea.com');

assert.equal(
  pickDedupEmail({ apolloEmail: '', hunterEmail: 'a@b.com', lushaEmail: '', primaryEmail: '' }),
  'a@b.com',
);

console.log('✅ contactEmails + companyResolver tests passed');
