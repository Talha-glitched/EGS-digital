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
    showcaseWorks: [
      {
        image: '/email-assets/exhibitions-hero.jpg',
        badge: 'DWTC Stand',
        title: 'Philips Global Health Stand',
        desc: 'Custom dual-level architectural structure, illuminated 3D branding & certified DWTC build.',
      },
      {
        image: '/email-assets/exhibitions-sub.jpg',
        badge: 'Arab Health',
        title: 'HealthTech Custom Pavilion',
        desc: 'Curved architectural canopy, integrated LED lighting & private VIP meeting lounge.',
      },
    ],
    capabilities: [
      { icon: '📐', title: '3D Concept & Engineering', desc: 'Custom 3D renders with full structural compliance for DWTC & ADNEC.' },
      { icon: '🏭', title: 'Dubai In-House Workshop', desc: 'Direct manufacturing joinery, acrylics, metalwork & graphics.' },
      { icon: '⚡', title: 'Turnkey Handover & Standby', desc: 'On-time delivery with 24/7 dedicated on-site standby crew.' },
    ],
    proofText: 'Trusted by global industry leaders across Arab Health, GITEX, ADIPEC, Dubai Airshow, and Cityscape.',
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
    showcaseWorks: [
      {
        image: '/email-assets/graduations-hero.jpg',
        badge: '4,500+ Graduates',
        title: 'HCT Grand Ceremonies (UAE-Wide)',
        desc: 'Panoramic ceremonial stage, curved high-res LED backdrop & VIP royal protocol.',
      },
      {
        image: '/email-assets/graduations-sub.jpg',
        badge: 'Sharjah Staging',
        title: 'Sharjah Ceremonial Arena',
        desc: 'Theatrical spotlighting, acoustic audio coverage & numbered graduate seating flow.',
      },
    ],
    capabilities: [
      { icon: '🏛️', title: 'Ceremonial Stage & LED Backdrops', desc: 'Custom prosceniums, high-res curved LED walls & podiums.' },
      { icon: '🎙️', title: 'Broadcast AV & Theatrical Lighting', desc: 'Acoustic sound coverage, theatrical spotlights & multi-cam feeds.' },
      { icon: '👥', title: 'VIP Protocol & Graduate Seating', desc: 'Dignitary arrival zones, numbered seating & precision crowd flow.' },
    ],
    proofText: 'Proven institutional execution at Zayed Sports Complex Fujairah, Coca-Cola Arena Dubai, AUD, and HCT nationwide.',
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
    showcaseWorks: [
      {
        image: '/email-assets/fitouts-hero.jpg',
        badge: 'Corporate Fitout',
        title: 'Velocity Corporate Offices',
        desc: 'Turnkey joinery, glass partitions, executive acoustic panelling & workstations.',
      },
      {
        image: '/email-assets/fitouts-sub.jpg',
        badge: 'Branded Space',
        title: 'Showroom & Reception Space',
        desc: '3D illuminated architectural signage, custom reception desk & wall cladding.',
      },
    ],
    capabilities: [
      { icon: '🛠️', title: 'Turnkey Joinery & Partitions', desc: 'Glass partitions, acoustic panelling & custom executive joinery.' },
      { icon: '🏢', title: '3D Architectural Signage', desc: 'Illuminated lobby logos, frosted vinyl & comprehensive wayfinding.' },
      { icon: '📋', title: 'Fast-Track Approvals & Handover', desc: 'Direct authority management with zero business disruption.' },
    ],
    proofText: 'Direct manufacturing in our Dubai workshop — zero broker markups and guaranteed handover deadlines.',
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
    showcaseWorks: [],
    capabilities: [],
    proofText: '',
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

  if (config.showcaseWorks && config.showcaseWorks.length >= 2) {
    const [work1, work2] = config.showcaseWorks;
    const work1Path = getEmailAssetPath(work1.image);
    if (fs.existsSync(work1Path)) {
      attachments.push({
        filename: path.basename(work1.image),
        path: work1Path,
        cid: 'work1_img',
      });
    }
    const work2Path = getEmailAssetPath(work2.image);
    if (fs.existsSync(work2Path)) {
      attachments.push({
        filename: path.basename(work2.image),
        path: work2Path,
        cid: 'work2_img',
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
 * Compiles Primary-Inbox Optimized Executive Email HTML.
 * Engineered specifically to land in the recipient's PRIMARY INBOX (avoiding Promotions & Spam folders).
 * Format: Clean 1-on-1 personal executive correspondence with clean signature.
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

    <!-- EXECUTIVE SIGNATURE BLOCK -->
    <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #E5E5E5; font-family: Arial, Helvetica, sans-serif;">
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
