/**
 * Server-Side Email Template Renderer
 * Generates responsive, high-converting HTML emails for EGS outreach sequences.
 * Layout: Text First -> Capability Pillars -> Showcase of 2 Works at Bottom -> CTAs -> Signature.
 * Supports inline CID image embedding for 100% reliable inbox image display.
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getBaseUrl, isPublicTrackableUrl } from '../services/mailTransport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TEMPLATE_CONFIGS = {
  exhibitions: {
    id: 'exhibitions',
    name: 'Exhibition Stands & Custom Pavilions',
    category: 'Exhibitions & Events',
    accentColor: '#D9262E',
    secondaryColor: '#2F3193',
    heroImage: '/email-assets/exhibitions-hero.jpg',
    subImage: '/email-assets/exhibitions-sub.jpg',
    showcaseTitle: 'Philips Stand — DWTC Dubai',
    showcaseBadge: 'Recent Build',
    showcaseCaption: 'Custom dual-level structure, 3D illuminated branding & certified DWTC build.',
    ctaText: 'Request 3D Stand Concept',
    ctaUrl: 'https://exhibitgraphicsign.com/exhibitions',
    whatsappText: 'Chat on WhatsApp',
  },
  graduations: {
    id: 'graduations',
    name: 'University Graduation & Grand Ceremonies',
    category: 'Institutional Ceremonies',
    accentColor: '#2F3193',
    secondaryColor: '#D9262E',
    heroImage: '/email-assets/graduations-hero.jpg',
    subImage: '/email-assets/graduations-sub.jpg',
    showcaseTitle: 'HCT Grand Ceremonies — UAE-Wide',
    showcaseBadge: '4,500+ Graduates',
    showcaseCaption: 'Panoramic ceremonial stage, curved high-res LED backdrop & VIP royal protocol.',
    ctaText: 'Discuss Ceremony Scope',
    ctaUrl: 'https://exhibitgraphicsign.com/events',
    whatsappText: 'WhatsApp Coordination',
  },
  fitouts: {
    id: 'fitouts',
    name: 'Commercial Interior Fitouts & Workspaces',
    category: 'Corporate & Retail',
    accentColor: '#3D4B2E',
    secondaryColor: '#D9262E',
    heroImage: '/email-assets/fitouts-hero.jpg',
    subImage: '/email-assets/fitouts-sub.jpg',
    showcaseTitle: 'Velocity Commercial Workspaces',
    showcaseBadge: 'Corporate Fitout',
    showcaseCaption: 'Turnkey joinery, glass partitions, executive acoustic panelling & 3D signage.',
    ctaText: 'Book Site Survey / Consultation',
    ctaUrl: 'https://exhibitgraphicsign.com/fitouts',
    whatsappText: 'WhatsApp Consultation',
  },
  standard: {
    id: 'standard',
    name: 'Executive Standard Letter',
    category: 'Direct Outreach',
    accentColor: '#1A1715',
    secondaryColor: '#D9262E',
    heroImage: null,
    subImage: null,
    showcaseTitle: '',
    showcaseBadge: '',
    showcaseCaption: '',
    ctaText: 'Visit EGS Website',
    ctaUrl: 'https://exhibitgraphicsign.com',
    whatsappText: 'Chat on WhatsApp',
  },
};

export function getTemplateConfig(templateType) {
  const normalized = String(templateType || '').trim().toLowerCase();
  if (TEMPLATE_CONFIGS[normalized]) return TEMPLATE_CONFIGS[normalized];
  if (normalized.includes('grad') || normalized.includes('ceremon')) return TEMPLATE_CONFIGS.graduations;
  if (normalized.includes('fitout') || normalized.includes('interior') || normalized.includes('office')) return TEMPLATE_CONFIGS.fitouts;
  if (normalized.includes('stand') || normalized.includes('exhibit') || normalized.includes('booth') || normalized.includes('pavilion')) return TEMPLATE_CONFIGS.exhibitions;
  return TEMPLATE_CONFIGS.exhibitions;
}

/**
 * Resolves local file system path for email assets.
 */
export function getEmailAssetPath(filename) {
  const cleanName = path.basename(filename);
  const serverPath = path.resolve(__dirname, '../../public/email-assets', cleanName);
  if (fs.existsSync(serverPath)) return serverPath;
  const clientPath = path.resolve(__dirname, '../../../client/public/email-assets', cleanName);
  if (fs.existsSync(clientPath)) return clientPath;
  return serverPath;
}

/**
 * Generates inline CID attachments for nodemailer/resend.
 */
export function getEmailAttachments(templateType) {
  const config = getTemplateConfig(templateType);
  const attachments = [];

  const logoPath = getEmailAssetPath('egs-logo.png');
  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: 'egs-logo.png',
      path: logoPath,
      cid: 'egs_logo',
    });
  }

  if (config.heroImage) {
    const heroPath = getEmailAssetPath(config.heroImage);
    if (fs.existsSync(heroPath)) {
      attachments.push({
        filename: path.basename(config.heroImage),
        path: heroPath,
        cid: 'showcase_img',
      });
    }
  }

  return attachments;
}

export function formatBodyHtml(text = '') {
  if (!text) return '';
  const paragraphs = String(text).split(/\n\s*\n/);
  return paragraphs
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return '';
      const lines = trimmed.split('\n').map((line) => {
        if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
          const bulletContent = line.trim().replace(/^[•\-*]\s*/, '');
          return `<div style="margin: 4px 0 4px 12px; line-height: 1.5;">• ${bulletContent}</div>`;
        }
        return line;
      });
      return `<p style="margin: 0 0 14px 0; line-height: 1.55; font-size: 14px; color: #222222; font-family: Arial, Helvetica, sans-serif;">${lines.join('<br>')}</p>`;
    })
    .join('');
}

/**
 * Compiles Primary-Inbox Optimized Executive Email HTML with optional showcase work sample.
 * Engineered specifically to land in the recipient's PRIMARY INBOX (avoiding Promotions & Spam folders).
 * Format: Clean 1-on-1 personal executive correspondence -> Showcase photo sample -> Executive signature.
 */
export function renderEmailHtml({
  body = '',
  subject = '',
  templateType = 'exhibitions',
  leadId = '',
  stepIndex = 0,
  personName = '',
  companyName = '',
  customBaseUrl = '',
  inlineCid = false,
}) {
  const config = getTemplateConfig(templateType);
  const effectiveBaseUrl = (customBaseUrl || (isPublicTrackableUrl() ? getBaseUrl() : 'https://exhibitgraphicsign.com')).replace(/\/$/, '');

  const resolveAssetUrl = (path, cidName) => {
    if (inlineCid && cidName) return `cid:${cidName}`;
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${effectiveBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const logoUrl = resolveAssetUrl('/email-assets/egs-logo.png', 'egs_logo');

  let trackingPixel = '';
  if (isPublicTrackableUrl() && leadId) {
    trackingPixel = `<img src="${effectiveBaseUrl}/api/track/open/${leadId}/${stepIndex}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;
  }

  // Body content HTML
  const bodyHtml = formatBodyHtml(body);

  // Deliverability-optimized Showcase Work Photo (Below text, above signature)
  let showcaseHtml = '';
  if (config.heroImage) {
    const showcaseImgUrl = resolveAssetUrl(config.heroImage, 'showcase_img');
    showcaseHtml = `
    <!-- RECENT WORK SHOWCASE (PRIMARY INBOX OPTIMIZED EMBED) -->
    <div style="margin: 22px 0 18px 0; max-width: 560px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: separate; border-spacing: 0; background-color: #FAFAF9; border: 1px solid #E8E5DF; border-radius: 8px; overflow: hidden;">
        <tr>
          <td style="padding: 0; line-height: 0; background-color: #111111;">
            <a href="${config.ctaUrl || 'https://exhibitgraphicsign.com'}" target="_blank" rel="noopener noreferrer" style="display: block; text-decoration: none;">
              <img src="${showcaseImgUrl}" alt="${config.showcaseTitle || 'Recent EGS Project Build'}" width="560" style="width: 100%; max-width: 560px; height: auto; max-height: 280px; object-fit: cover; display: block; border: 0;" />
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding: 9px 13px; background-color: #F8F6F2; border-top: 1px solid #E8E5DF;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="vertical-align: middle;">
                  <span style="display: inline-block; background-color: #D9262E; color: #FFFFFF; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 6px; border-radius: 3px; font-family: Arial, Helvetica, sans-serif; margin-right: 6px;">${config.showcaseBadge || 'Recent Build'}</span>
                  <strong style="font-size: 12px; color: #111111; font-family: Arial, Helvetica, sans-serif;">${config.showcaseTitle}</strong>
                  <span style="font-size: 11px; color: #666666; font-family: Arial, Helvetica, sans-serif; margin-left: 4px;">&middot; ${config.showcaseCaption}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || 'Exhibit Graphic Sign'}</title>
</head>
<body style="margin: 0; padding: 16px; background-color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.55; color: #222222; -webkit-text-size-adjust: 100%;">
  <div style="max-width: 600px; margin: 0; padding: 0;">
    <!-- MESSAGE BODY -->
    <div style="font-size: 14px; line-height: 1.55; color: #222222; font-family: Arial, Helvetica, sans-serif;">
      ${bodyHtml}
    </div>

    <!-- SHOWCASE WORK SAMPLE -->
    ${showcaseHtml}

    <!-- EXECUTIVE SIGNATURE BLOCK -->
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E5E5E5; font-family: Arial, Helvetica, sans-serif;">
      <table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
        <tr>
          <td style="vertical-align: top; padding-right: 14px;">
            <img src="${logoUrl}" alt="Exhibit Graphic Sign" width="105" style="width: 105px; max-width: 105px; height: auto; display: block; border: 0;" />
          </td>
          <td style="vertical-align: top; border-left: 2px solid #D9262E; padding-left: 12px;">
            <div style="font-size: 14px; font-weight: bold; color: #111111; line-height: 1.3;">Masuood-ul-Rasheed</div>
            <div style="font-size: 12px; color: #555555; margin-top: 2px; line-height: 1.3;">Project Director &middot; Exhibit Graphic Sign LLC</div>
            <div style="font-size: 12px; color: #444444; margin-top: 5px; line-height: 1.4;">
              <span>Direct: +971 52 458 7992</span> &nbsp;|&nbsp;
              <a href="${config.ctaUrl || 'https://exhibitgraphicsign.com'}" style="color: #D9262E; text-decoration: none; font-weight: 500;">exhibitgraphicsign.com</a>
            </div>
            <div style="font-size: 11px; color: #777777; margin-top: 3px; line-height: 1.3;">
              Dubai Production Facility &amp; Head Office &middot; Al Quoz &amp; DIC, UAE
            </div>
          </td>
        </tr>
      </table>
    </div>

    ${trackingPixel}
  </div>
</body>
</html>`;
}
