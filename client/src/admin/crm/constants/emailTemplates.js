/**
 * EGS Email Templates System
 * Provides structured templates for Exhibition Stands, Graduation Ceremonies, Interior Fitouts, and Standard Outreach.
 */

export const EMAIL_TEMPLATES = [
  {
    id: 'exhibitions',
    name: 'Exhibition Stands & Custom Pavilions',
    category: 'Exhibitions & Events',
    badge: 'High Conversion',
    tagline: 'Custom Stands, Renders & Turnkey Build in Dubai, Abu Dhabi & Riyadh',
    accentColor: '#D9262E',
    secondaryColor: '#2F3193',
    heroImage: '/email-assets/exhibitions-hero.jpg',
    subImage: '/email-assets/exhibitions-sub.jpg',
    previewThumbnail: '/email-assets/exhibitions-hero.jpg',
    summary: 'Tailored for trade show exhibitors at DWTC, ADNEC, and Riyadh Front. Features your message first, followed by a showcase of two recent exhibition builds.',
    defaultSubject: '{{company}} — Custom exhibition stand execution for upcoming UAE shows',
    defaultBody: `Hi {{name}},

I am reaching out regarding {{company}}'s upcoming exhibition schedule in the UAE and region.

EGS (Exhibit Graphic Sign) provides turnkey, in-house exhibition stand design, 3D engineering, and direct fabrication from our Dubai workshop for major shows at DWTC, ADNEC, and Riyadh Front.

We handle everything under one roof:
• Custom 3D design & structural engineering
• In-house joinery, acrylics, metalwork & large-format UV printing
• Authority approvals (DWTC/ADNEC/Civil Defense)
• Round-the-clock on-site assembly, live stand standby & handover

Would you be open for a brief 10-minute call or 3D concept discussion for your next exhibition stand?

Best Regards,
Masuood-ul-Rasheed
Project Director · Exhibit Graphic Sign`,
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
  {
    id: 'graduations',
    name: 'University Graduation & Grand Ceremonies',
    category: 'Institutional Ceremonies',
    badge: 'UAE Scale Proven',
    tagline: 'Grand Stage, LED Prosceniums, VIP Protocol & Production across the Emirates',
    accentColor: '#2F3193',
    secondaryColor: '#D9262E',
    heroImage: '/email-assets/graduations-hero.jpg',
    subImage: '/email-assets/graduations-sub.jpg',
    previewThumbnail: '/email-assets/graduations-hero.jpg',
    summary: 'Designed for university leadership, deans, and ceremony organizers. Delivers your message first, then showcases two grand ceremony stage setups.',
    defaultSubject: '[University]: UAE-wide graduation ceremony scale & stage production',
    defaultBody: `Hi [First],

One reason I am reaching out is that EGS has handled graduation work at UAE-wide scale.

In 2025, EGS delivered seven HCT grand ceremonies across Dubai, Abu Dhabi, Sharjah, Ras Al Khaimah, and Fujairah for 4,500 graduates and 13,500 guests. In 2024, we delivered eight grand ceremonies for 3,500 graduates and 10,000 guests.

That repetition matters because every ceremony improves the next: stage flow, seating ergonomics, VIP protocol corridors, broadcast-grade AV, lighting, and event-day coordination.

EGS defines the ceremony scope around the complete guest experience:
• Custom ceremonial stage & curved LED backdrops
• Numbered graduate seating & royal VIP arrival protocol
• Broadcast sound, theatrical lighting & live feeds
• On-site ceremony management & rapid removal

Would it be worth a brief conversation about [University]'s upcoming graduation ceremony plans?

Best Regards,
Masuood-ul-Rasheed
Exhibit Graphic Sign · Dubai, UAE`,
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
  {
    id: 'fitouts',
    name: 'Commercial Interior Fitouts & Workspaces',
    category: 'Corporate & Retail',
    badge: 'Turnkey Fitout',
    tagline: 'Executive Offices, Showrooms, Architectural Signage & Branded Environments',
    accentColor: '#3D4B2E',
    secondaryColor: '#D9262E',
    heroImage: '/email-assets/fitouts-hero.jpg',
    subImage: '/email-assets/fitouts-sub.jpg',
    previewThumbnail: '/email-assets/fitouts-hero.jpg',
    summary: 'Tailored for corporate offices, commercial developers, and retail brands. Presents your outreach message first, then showcases two completed commercial fitouts.',
    defaultSubject: '{{company}} — Turnkey commercial interior fitout & office branding in Dubai',
    defaultBody: `Hi {{name}},

I am reaching out regarding {{company}}'s office, showroom, or commercial space in the UAE.

EGS specializes in turnkey commercial interior fitouts, corporate environments, and bespoke architectural branding across Dubai and Abu Dhabi.

Because we manufacture directly in our Dubai workshop, we eliminate subcontractor delays and deliver seamless transformations:
• Turnkey joinery, glass partitions & acoustic wall panelling
• Custom reception desks, boardroom executive furniture & wall cladding
• 3D illuminated architectural signage & wayfinding systems
• Fast-track approvals with Civil Defense, Municipality & building management

Would you be open for a brief site survey or consultation on {{company}}'s upcoming workspace requirements?

Best Regards,
Masuood-ul-Rasheed
Exhibit Graphic Sign · Dubai, UAE`,
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
  {
    id: 'standard',
    name: 'Executive Standard Letter',
    category: 'Direct Outreach',
    badge: 'Minimalist',
    tagline: 'Clean 1-to-1 personalized executive outreach format with subtle branding',
    accentColor: '#1A1715',
    secondaryColor: '#D9262E',
    heroImage: null,
    subImage: null,
    previewThumbnail: null,
    summary: 'A clean, uncluttered 1-to-1 letter format with the official EGS logo header, crisp typography, and verified executive signature.',
    defaultSubject: '{{company}} — quick question',
    defaultBody: `Hi {{name}},

We support companies across the UAE with custom exhibition stands, corporate fitouts, and large-scale event production.

Would you be open for a short call this week to see whether EGS could be useful for {{company}}?

Best Regards,
Masuood-ul-Rasheed
Exhibit Graphic Sign
https://exhibitgraphicsign.com`,
    showcaseWorks: [],
    capabilities: [],
    proofText: '',
    ctaText: 'Visit EGS Website',
    ctaUrl: 'https://exhibitgraphicsign.com',
    whatsappText: 'Chat on WhatsApp',
  },
];

export function getTemplateById(templateId) {
  return EMAIL_TEMPLATES.find((t) => t.id === templateId) || EMAIL_TEMPLATES[0];
}

/**
 * Replaces placeholder tokens in text strings.
 */
export function replacePlaceholders(text = '', context = {}) {
  if (!text) return '';
  const {
    name = 'Sarah',
    firstName = 'Sarah',
    first = 'Sarah',
    company = 'TechCorp UAE',
    university = 'University of Sharjah',
  } = context;

  return String(text)
    .replace(/{{\s*(?:name|first_name|firstname)\s*}}/gi, firstName || name)
    .replace(/\[First\]/gi, firstName || first || name)
    .replace(/{{\s*(?:company|company_name|companyname)\s*}}/gi, company)
    .replace(/\[University\]/gi, university || company)
    .replace(/{{\s*(?:university|institution)\s*}}/gi, university || company);
}

/**
 * Formats body text into clean HTML paragraphs with proper line spacing.
 */
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
 * Builds the complete responsive HTML document for an email template matching server renderEmailHtml.
 * Primary-Inbox Optimized 1-on-1 executive email format.
 */
export function buildEmailHtml({
  templateType = 'exhibitions',
  subject = '',
  body = '',
  context = {},
  baseUrl = '',
  leadId = '',
  stepIndex = 0,
  includeTracking = false,
}) {
  const template = getTemplateById(templateType);
  const resolvedBody = replacePlaceholders(body || template.defaultBody, context);
  const resolvedSubject = replacePlaceholders(subject || template.defaultSubject, context);
  const bodyHtml = formatBodyHtml(resolvedBody);

  const effectiveBaseUrl = (baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://exhibitgraphicsign.com')).replace(/\/$/, '');
  const resolveAssetUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${effectiveBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const logoUrl = resolveAssetUrl('/email-assets/egs-logo.png');

  let trackingPixel = '';
  if (includeTracking && leadId && effectiveBaseUrl) {
    trackingPixel = `<img src="${effectiveBaseUrl}/api/track/open/${leadId}/${stepIndex}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;
  }

  const ctaUrl = template.ctaUrl || 'https://exhibitgraphicsign.com';

  // Deliverability-optimized Showcase Work Photo (Below text, above signature)
  let showcaseHtml = '';
  if (template.heroImage) {
    const showcaseImgUrl = resolveAssetUrl(template.heroImage);
    const showcaseTitle = template.id === 'graduations'
      ? 'HCT Grand Ceremonies — UAE-Wide'
      : template.id === 'fitouts'
        ? 'Velocity Commercial Workspaces'
        : 'Philips Stand — DWTC Dubai';
    const showcaseBadge = template.id === 'graduations'
      ? '4,500+ Graduates'
      : template.id === 'fitouts'
        ? 'Corporate Fitout'
        : 'Recent Build';
    const showcaseCaption = template.id === 'graduations'
      ? 'Panoramic ceremonial stage, curved high-res LED backdrop & VIP royal protocol.'
      : template.id === 'fitouts'
        ? 'Turnkey joinery, glass partitions, executive acoustic panelling & 3D signage.'
        : 'Custom dual-level structure, 3D illuminated branding & certified DWTC build.';

    showcaseHtml = `
    <!-- RECENT WORK SHOWCASE (PRIMARY INBOX OPTIMIZED EMBED) -->
    <div style="margin: 22px 0 18px 0; max-width: 560px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: separate; border-spacing: 0; background-color: #FAFAF9; border: 1px solid #E8E5DF; border-radius: 8px; overflow: hidden;">
        <tr>
          <td style="padding: 0; line-height: 0; background-color: #111111;">
            <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: block; text-decoration: none;">
              <img src="${showcaseImgUrl}" alt="${showcaseTitle}" width="560" style="width: 100%; max-width: 560px; height: auto; max-height: 280px; object-fit: cover; display: block; border: 0;" />
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding: 9px 13px; background-color: #F8F6F2; border-top: 1px solid #E8E5DF;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="vertical-align: middle;">
                  <span style="display: inline-block; background-color: #D9262E; color: #FFFFFF; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 6px; border-radius: 3px; font-family: Arial, Helvetica, sans-serif; margin-right: 6px;">${showcaseBadge}</span>
                  <strong style="font-size: 12px; color: #111111; font-family: Arial, Helvetica, sans-serif;">${showcaseTitle}</strong>
                  <span style="font-size: 11px; color: #666666; font-family: Arial, Helvetica, sans-serif; margin-left: 4px;">&middot; ${showcaseCaption}</span>
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
  <title>${resolvedSubject || 'Exhibit Graphic Sign'}</title>
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
              <a href="${ctaUrl}" style="color: #D9262E; text-decoration: none; font-weight: 500;">exhibitgraphicsign.com</a>
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
