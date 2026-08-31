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

test('renderEmailHtml compiles Exhibition template with logo, body content, showcase photo and executive signature', () => {
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
  assert.match(html, /Philips Stand — DWTC Dubai/);
  assert.match(html, /Hi Sarah,/);
  assert.match(html, /We provide custom exhibition stands\./);
  assert.match(html, /Masuood-ul-Rasheed/);
  assert.match(html, /Managing Director &middot; Exhibit Graphic Sign LLC|Managing Director · Exhibit Graphic Sign LLC/);
  assert.match(html, /\+971 52 458 7992/);
  assert.match(html, /exhibitgraphicsign\.com/);
  assert.doesNotMatch(html, /Al Quoz/i);
  assert.doesNotMatch(html, /DIC/i);
});

test('renderEmailHtml compiles Graduation ceremony template with clean executive layout and stage photo', () => {
  const html = renderEmailHtml({
    templateType: 'graduations',
    subject: 'UAE-Wide Graduation Production',
    body: 'Hi Dr. Tariq,\n\nWe delivered seven HCT grand ceremonies.\n\nBest,\nMasuood',
    personName: 'Dr. Tariq Al-Nuaimi',
    companyName: 'University of Sharjah',
    customBaseUrl: 'https://exhibitgraphicsign.com',
  });

  assert.match(html, /<!DOCTYPE html>/i);
  assert.match(html, /https:\/\/exhibitgraphicsign\.com\/email-assets\/graduations-hero\.jpg/);
  assert.match(html, /HCT Grand Ceremonies — UAE-Wide/);
  assert.match(html, /Hi Dr\. Tariq,/);
  assert.match(html, /We delivered seven HCT grand ceremonies\./);
  assert.match(html, /Masuood-ul-Rasheed/);
  assert.doesNotMatch(html, /Al Quoz/i);
});

test('renderEmailHtml compiles Interior fitout template with clean executive layout and fitout photo', () => {
  const html = renderEmailHtml({
    templateType: 'fitouts',
    subject: 'Turnkey Commercial Interior Fitouts',
    body: 'Hi Omar,\n\nWe handle turnkey fitouts directly from our Dubai workshop.\n\nBest,\nMasuood',
    personName: 'Omar Farooq',
    companyName: 'Velocity Real Estate',
    customBaseUrl: 'https://exhibitgraphicsign.com',
  });

  assert.match(html, /<!DOCTYPE html>/i);
  assert.match(html, /https:\/\/exhibitgraphicsign\.com\/email-assets\/fitouts-hero\.jpg/);
  assert.match(html, /Velocity Commercial Workspaces/);
  assert.match(html, /Hi Omar,/);
  assert.match(html, /We handle turnkey fitouts directly from our Dubai workshop\./);
  assert.match(html, /Masuood-ul-Rasheed/);
  assert.doesNotMatch(html, /Al Quoz/i);
});

test('renderEmailHtml dynamically reflects Talha Masuood sender identity', () => {
  const html = renderEmailHtml({
    templateType: 'exhibitions',
    subject: 'Philips Stand DWTC',
    body: 'Hi Sarah,\n\nLooking forward to collaborating.\n\nBest,\nMasuood',
    senderEmail: 'talha@exhibitgraphicsign.com',
    customBaseUrl: 'https://exhibitgraphicsign.com',
  });

  assert.match(html, /Talha Masuood/);
  assert.match(html, /Operations & Technical Director/);
});

test('renderEmailHtml dynamically reflects Dr. Haider sender identity', () => {
  const html = renderEmailHtml({
    templateType: 'exhibitions',
    subject: 'Philips Stand DWTC',
    body: 'Hi Sarah,\n\nLooking forward to collaborating.\n\nBest,\nMasuood',
    senderEmail: 'haider@exhibitgraphicsign.com',
    customBaseUrl: 'https://exhibitgraphicsign.com',
  });

  assert.match(html, /Dr\. Haider/);
  assert.match(html, /Project Director/);
});

