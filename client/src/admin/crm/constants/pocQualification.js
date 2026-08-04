export const POC_QUALIFICATION_OPTIONS = [
  {
    value: 'Unverified',
    label: 'Not verified yet',
    description: 'We have not confirmed whether this is the right decision-maker.',
    tone: 'neutral',
  },
  {
    value: 'Confirmed',
    label: 'Right POC',
    description: 'This person is the correct point of contact for this company.',
    tone: 'success',
  },
  {
    value: 'RedirectedWithReferral',
    label: 'Redirected — gave referral',
    description: 'They pointed us to someone else and shared that person’s details.',
    tone: 'info',
  },
  {
    value: 'RedirectedNoReferral',
    label: 'Redirected — no details',
    description: 'They said to speak to someone else but did not share contact info.',
    tone: 'warning',
  },
  {
    value: 'WrongContact',
    label: 'Wrong POC / Dead End',
    description: 'Not the right contact and no useful redirect.',
    tone: 'danger',
  },
];

export const POC_STATUS_LABELS = Object.fromEntries(
  POC_QUALIFICATION_OPTIONS.map((o) => [o.value, o.label]),
);

export function getPocOption(status) {
  return POC_QUALIFICATION_OPTIONS.find((o) => o.value === status) || POC_QUALIFICATION_OPTIONS[0];
}

export function isRelevantPocStatus(status) {
  return status === 'Confirmed' || status === 'RedirectedWithReferral';
}

export function needsReferralDetails(status) {
  return status === 'RedirectedWithReferral';
}
