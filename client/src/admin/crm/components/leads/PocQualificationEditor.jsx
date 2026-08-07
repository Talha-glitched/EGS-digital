import { PocQualificationBadge } from './PocQualificationBadge.jsx';
import SensitiveDataField from '../ui/SensitiveDataField.jsx';
import { POC_QUALIFICATION_OPTIONS, needsReferralDetails } from '../../constants/pocQualification.js';
import { cn } from '../ui/primitives.jsx';

const TONE_RING = {
  neutral: 'border-neutral-200 hover:border-neutral-300',
  success: 'border-emerald-200 hover:border-emerald-300',
  info: 'border-sky-200 hover:border-sky-300',
  warning: 'border-amber-200 hover:border-amber-300',
  danger: 'border-red-200 hover:border-red-300',
};

const TONE_ACTIVE = {
  neutral: 'border-neutral-400 bg-neutral-50 ring-2 ring-neutral-200/60',
  success: 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-200/60',
  info: 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-200/60',
  warning: 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-200/60',
  danger: 'border-red-500 bg-red-50/80 ring-2 ring-red-200/60',
};

export default function PocQualificationEditor({ value, onChange }) {
  const status = value?.status || 'Unverified';
  const referral = value?.referral || {};
  const showReferral = needsReferralDetails(status);

  const setStatus = (next) => onChange({ ...value, status: next });
  const setReferral = (key, val) => onChange({
    ...value,
    referral: { ...referral, [key]: val },
  });
  const setNotes = (notes) => onChange({ ...value, notes });

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-neutral-500">
        Record whether this person is the right decision-maker, or how they redirected your outreach. This helps your team focus on relevant contacts.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {POC_QUALIFICATION_OPTIONS.map((option) => {
          const active = status === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={cn(
                'rounded-lg border p-3 text-left transition-all duration-200',
                active ? TONE_ACTIVE[option.tone] : TONE_RING[option.tone],
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--color-ink)]">{option.label}</span>
                {active && <PocQualificationBadge status={option.value} compact />}
              </div>
              <p className="mt-1 text-xs leading-snug text-neutral-500">{option.description}</p>
            </button>
          );
        })}
      </div>

      {showReferral && (
        <div className="space-y-3 rounded-lg border border-sky-200/80 bg-sky-50/40 p-4">
          <p className="text-xs font-semibold text-sky-900">Referral contact details</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Referral name" value={referral.name || ''} onChange={(v) => setReferral('name', v)} placeholder="Correct decision-maker" />
            <SensitiveDataField label="Referral email" type="email" kind="email" value={referral.email || ''} onChange={(v) => setReferral('email', v)} placeholder="name@company.com" />
            <Field label="Job title" value={referral.designation || ''} onChange={(v) => setReferral('designation', v)} placeholder="Marketing Director" />
            <SensitiveDataField label="Phone / WhatsApp" type="tel" kind="phone" value={referral.phone || ''} onChange={(v) => setReferral('phone', v)} />
            <div className="sm:col-span-2">
              <Field label="LinkedIn URL" value={referral.linkedinUrl || ''} onChange={(v) => setReferral('linkedinUrl', v)} placeholder="https://linkedin.com/in/..." />
            </div>
          </div>
          <p className="text-xs text-sky-800/80">
            Saving will create a new contact at this company when an email is provided, so you can continue outreach with the right person.
          </p>
        </div>
      )}

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-neutral-600">Qualification notes</span>
        <textarea
          className="crm-input min-h-[4rem] resize-y text-sm"
          value={value?.notes || ''}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Who spoke, what they said, internal context…"
        />
      </label>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      <input
        type={type}
        className="crm-input text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
