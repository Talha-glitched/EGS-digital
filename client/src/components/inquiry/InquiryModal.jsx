import { useEffect, useId, useState } from 'react';
import {
  createEmptyInquiryForm,
  DEADLINE_OPTIONS,
  GUEST_SCALE_OPTIONS,
  LOCATION_COUNT_OPTIONS,
  EGS_EMAIL,
  openInquiryMailto,
  SERVICE_OPTIONS,
  SPACE_TYPE_OPTIONS,
  STAND_SIZE_OPTIONS,
  URGENCY_OPTIONS,
} from '../../utils/contactInquiry.js';
import './InquiryModal.css';

function Field({ id, label, required, children }) {
  return (
    <div className="inquiry-field">
      <label htmlFor={id}>
        {label}
        {required ? <span className="inquiry-required">*</span> : null}
      </label>
      {children}
    </div>
  );
}

export default function InquiryModal({ isOpen, defaultType, onClose }) {
  const titleId = useId();
  const [form, setForm] = useState(() => createEmptyInquiryForm(defaultType));
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(createEmptyInquiryForm(defaultType));
      setError('');
    }
  }, [isOpen, defaultType]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const update = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => {
      if (key === 'service') {
        return {
          ...createEmptyInquiryForm(value),
          name: prev.name,
          company: prev.company,
          email: prev.email,
          phone: prev.phone,
          deadline: prev.deadline,
          location: prev.location,
          urgency: prev.urgency,
          details: prev.details,
        };
      }
      return { ...prev, [key]: value };
    });
    setError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please add your name and email.');
      return;
    }
    if (!form.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    openInquiryMailto(form);
    onClose();
  };

  const service = form.service;

  return (
    <div className="inquiry-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="inquiry-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="inquiry-modal-head">
          <div>
            <p className="inquiry-modal-kicker">Project enquiry</p>
            <h2 id={titleId}>Tell us what you need</h2>
            <p className="inquiry-modal-lede">
              Fill in what you know. We will open your email app with everything included — attach drawings or photos there if you have them.
            </p>
            <div className="inquiry-modal-aside">
              <p className="inquiry-modal-reassure">Don&apos;t Worry we reply fast.</p>
              <p className="inquiry-modal-email">
                Or email us directly:{' '}
                <a href={`mailto:${EGS_EMAIL}`}>{EGS_EMAIL}</a>
              </p>
            </div>
          </div>
          <button type="button" className="inquiry-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <form className="inquiry-form" onSubmit={handleSubmit}>
          <div className="inquiry-form-grid">
            <Field id="inquiry-service" label="Service" required>
              <select id="inquiry-service" value={form.service} onChange={update('service')} required>
                {SERVICE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>

            <Field id="inquiry-urgency" label="Urgency">
              <select id="inquiry-urgency" value={form.urgency} onChange={update('urgency')}>
                {URGENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>

            <Field id="inquiry-name" label="Your name" required>
              <input id="inquiry-name" type="text" value={form.name} onChange={update('name')} autoComplete="name" required />
            </Field>

            <Field id="inquiry-company" label="Company">
              <input id="inquiry-company" type="text" value={form.company} onChange={update('company')} autoComplete="organization" />
            </Field>

            <Field id="inquiry-email" label="Email" required>
              <input id="inquiry-email" type="email" value={form.email} onChange={update('email')} autoComplete="email" required />
            </Field>

            <Field id="inquiry-phone" label="Phone / WhatsApp">
              <input id="inquiry-phone" type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" />
            </Field>

            <Field id="inquiry-deadline" label="Deadline / opening date">
              <select id="inquiry-deadline" value={form.deadline} onChange={update('deadline')}>
                {DEADLINE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>

            <Field id="inquiry-location" label="Location / venue">
              <input id="inquiry-location" type="text" value={form.location} onChange={update('location')} placeholder="Show, mall, campus, city" />
            </Field>

            {service === 'exhibitions' ? (
              <>
                <Field id="inquiry-show" label="Show / event name">
                  <input id="inquiry-show" type="text" value={form.showName} onChange={update('showName')} />
                </Field>
                <Field id="inquiry-stand-size" label="Stand size">
                  <select id="inquiry-stand-size" value={form.standSize} onChange={update('standSize')}>
                    {STAND_SIZE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <Field id="inquiry-build-date" label="Build / opening date">
                  <input id="inquiry-build-date" type="text" value={form.buildDate} onChange={update('buildDate')} placeholder="e.g. 12 Mar 2026" />
                </Field>
              </>
            ) : null}

            {service === 'events' ? (
              <>
                <Field id="inquiry-event-date" label="Event date">
                  <input id="inquiry-event-date" type="text" value={form.eventDate} onChange={update('eventDate')} placeholder="e.g. 15 May 2026" />
                </Field>
                <Field id="inquiry-venue" label="Venue">
                  <input id="inquiry-venue" type="text" value={form.venue} onChange={update('venue')} />
                </Field>
                <Field id="inquiry-guest-scale" label="Guest / graduate scale">
                  <select id="inquiry-guest-scale" value={form.guestScale} onChange={update('guestScale')}>
                    {GUEST_SCALE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
              </>
            ) : null}

            {service === 'retail' ? (
              <>
                <Field id="inquiry-location-count" label="Number of locations">
                  <select id="inquiry-location-count" value={form.locationCount} onChange={update('locationCount')}>
                    {LOCATION_COUNT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <Field id="inquiry-launch-date" label="Launch date">
                  <input id="inquiry-launch-date" type="text" value={form.launchDate} onChange={update('launchDate')} />
                </Field>
              </>
            ) : null}

            {service === 'fitouts' ? (
              <>
                <Field id="inquiry-space-type" label="Space type">
                  <select id="inquiry-space-type" value={form.spaceType} onChange={update('spaceType')}>
                    {SPACE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <Field id="inquiry-handover" label="Handover target">
                  <input id="inquiry-handover" type="text" value={form.handoverDate} onChange={update('handoverDate')} />
                </Field>
              </>
            ) : null}

            <div className="inquiry-field inquiry-field-wide">
              <label htmlFor="inquiry-details">What needs to be ready?</label>
              <textarea
                id="inquiry-details"
                rows={4}
                value={form.details}
                onChange={update('details')}
                placeholder="Physical outcome, recent changes, or what must be ready before doors open."
              />
            </div>
          </div>

          {error ? <p className="inquiry-form-error" role="alert">{error}</p> : null}

          <footer className="inquiry-modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              Open email to send <span className="arrow">→</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
