import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderEmailHtml,
  getTemplateConfig,
  formatBodyHtml,
  TEMPLATE_CONFIGS,
} from '../src/utils/emailTemplateRenderer.js';

test('getTemplateConfig resolves exhibitions, graduations, fitouts, and standard', () => {
  assert.equal(getTemplateConfig('exhibitions').id, 'exhibitions');
  assert.equal(getTemplateConfig('graduations').id, 'graduations');
  assert.equal(getTemplateConfig('fitouts').id, 'fitouts');
  assert.equal(getTemplateConfig('standard').id, 'standard');

  // Fallback / fuzzy matching
  assert.equal(getTemplateConfig('hct-graduation-ceremony').id, 'graduations');
  assert.equal(getTemplateConfig('commercial-office-fitout').id, 'fitouts');
  assert.equal(getTemplateConfig('unknown-custom-type').id, 'exhibitions');
});

test('formatBodyHtml converts paragraphs and bullets into structured HTML', () => {
  const input = `Hi John,

We deliver custom stands across UAE.
• 3D Concept
• Dubai Workshop Joinery

Let's talk soon.`;

  const html = formatBodyHtml(input);
  assert.match(html, /<p style=".*">Hi John,<\/p>/);
  assert.match(html, /• 3D Concept/);
  assert.match(html, /• Dubai Workshop Joinery/);
  assert.match(html, /<p style=".*">Let&#39;s talk soon\.<\/p>|<p style=".*">Let's talk soon\.<\/p>/);
});

test('renderEmailHtml compiles Exhibition template with logo, hero, capabilities and CTAs', () => {
  const html = renderEmailHtml({
    templateType: 'exhibitions',
    subject: 'Custom DWTC Exhibition Stands',
    body: 'Hi Sarah,\n\nWe provide custom exhibition stands.\n\nBest,\nMasuood',
    personName: 'Sarah Jenkins',
    companyName: 'Philips Middle East',
    customBaseUrl: 'https://exhibitgraphicsign.com',
  });

  assert.match(html, /<!DOCTYPE html>/i);
  assert.match(html, /https:\/\/exhibitgraphicsign\.com\/email-assets\/egs-logo\.png/);
  assert.match(html, /https:\/\/exhibitgraphicsign\.com\/email-assets\/exhibitions-hero\.jpg/);
  assert.match(html, /Philips Global Health Stand/);
  assert.match(html, /3D Concept &amp; Engineering|3D Concept & Engineering/);
  assert.match(html, /Dubai In-House Workshop/);
  assert.match(html, /Request 3D Stand Concept/);
  assert.match(html, /https:\/\/wa\.me\/971524587992/);
  assert.match(html, /Masuood-ul-Rasheed/);
  assert.match(html, /Exhibit Graphic Sign LLC/);
});

test('renderEmailHtml compiles Graduation ceremony template with stats and stage production proof', () => {
  const html = renderEmailHtml({
    templateType: 'graduations',
    subject: 'UAE-Wide Graduation Production',
    body: 'Hi Dr. Tariq,\n\nWe delivered seven HCT grand ceremonies.\n\nBest,\nMasuood',
    personName: 'Dr. Tariq Al-Nuaimi',
    companyName: 'University of Sharjah',
    customBaseUrl: 'https://exhibitgraphicsign.com',
  });

  assert.match(html, /https:\/\/exhibitgraphicsign\.com\/email-assets\/graduations-hero\.jpg/);
  assert.match(html, /HCT Grand Ceremonies/);
  assert.match(html, /4,500\+? Graduates/);
  assert.match(html, /Ceremonial Stage &amp; LED Backdrops|Ceremonial Stage & LED Backdrops/);
  assert.match(html, /Broadcast AV &amp; Theatrical Lighting|Broadcast AV & Theatrical Lighting/);
  assert.match(html, /Discuss Ceremony Scope/);
});

test('renderEmailHtml compiles Interior fitout template with Velocity showcase and joinery pillars', () => {
  const html = renderEmailHtml({
    templateType: 'fitouts',
    subject: 'Turnkey Commercial Interior Fitouts',
    body: 'Hi Omar,\n\nWe handle turnkey fitouts directly from our Dubai workshop.\n\nBest,\nMasuood',
    personName: 'Omar Farooq',
    companyName: 'Velocity Real Estate',
    customBaseUrl: 'https://exhibitgraphicsign.com',
  });

  assert.match(html, /https:\/\/exhibitgraphicsign\.com\/email-assets\/fitouts-hero\.jpg/);
  assert.match(html, /Velocity Corporate Offices/);
  assert.match(html, /Turnkey Joinery &amp; Partitions|Turnkey Joinery & Partitions/);
  assert.match(html, /3D Architectural Signage/);
  assert.match(html, /Book Site Survey \/ Consultation/);
});
