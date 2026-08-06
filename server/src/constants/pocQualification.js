export const POC_QUALIFICATION_STATUSES = [
  'Unverified',
  'Confirmed',
  'RedirectedWithReferral',
  'RedirectedNoReferral',
  'WrongContact',
];

export const POC_QUALIFICATION_LABELS = {
  Unverified: 'Not verified yet',
  Confirmed: 'Right POC',
  RedirectedWithReferral: 'Redirected — gave referral',
  RedirectedNoReferral: 'Redirected — no details',
  WrongContact: 'Wrong POC',
};

export const POC_QUALIFICATION_DESCRIPTIONS = {
  Unverified: 'This contact has not been qualified as the correct decision-maker yet.',
  Confirmed: 'Verified as the right point of contact for this company.',
  RedirectedWithReferral: 'They redirected you and shared details for the correct person.',
  RedirectedNoReferral: 'They redirected you but did not share contact details.',
  WrongContact: 'Wrong person for this responsibility; the account remains available for future outreach.',
};

export function isRelevantPocStatus(status) {
  return status === 'Confirmed' || status === 'RedirectedWithReferral';
}
