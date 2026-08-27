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
          return `<div style="margin: 4px 0 4px 12px; line-height: 1.55;">• ${bulletContent}</div>`;
        }
        return line;
      });
      return `<p style="margin: 0 0 16px 0; line-height: 1.62; font-size: 15px; color: #2A2522;">${lines.join('<br>')}</p>`;
    })
    .join('');
}

/**
 * Builds the complete responsive HTML document for an email template.
 * Content flow: Text First -> Capability Pillars -> Two Showcase Works at the Bottom -> Action Buttons -> Signature.
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

  // Capability strip HTML
  let capabilitiesHtml = '';
  if (template.capabilities && template.capabilities.length > 0) {
    const capCards = template.capabilities.map((cap) => `
      <td width="33.33%" style="vertical-align: top; padding: 12px; background-color: #FAF7F2; border-radius: 8px; border: 1px solid #EAE4D9;">
        <div style="font-size: 18px; margin-bottom: 6px;">${cap.icon}</div>
        <div style="font-size: 12px; font-weight: 700; color: #1A1715; margin-bottom: 4px; line-height: 1.3;">${cap.title}</div>
        <div style="font-size: 11px; color: #5A514A; line-height: 1.4;">${cap.desc}</div>
      </td>
    `).join('<td width="10" style="width: 10px;"></td>');

    capabilitiesHtml = `
      <!-- CAPABILITIES STRIP -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
        <tr>
          ${capCards}
        </tr>
      </table>
    `;
  }

  // Trust / Proof banner
  let proofHtml = '';
  if (template.proofText) {
    proofHtml = `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0;">
        <tr>
          <td style="background-color: #F2EDE4; border-left: 3px solid ${template.accentColor}; padding: 10px 14px; border-radius: 0 6px 6px 0;">
            <span style="font-size: 11px; font-weight: 600; color: #4A423B; line-height: 1.45; display: block;">
              ✦ ${template.proofText}
            </span>
          </td>
        </tr>
      </table>
    `;
  }

  // Two Works Showcase HTML (at bottom of email)
  let worksShowcaseHtml = '';
  if (template.showcaseWorks && template.showcaseWorks.length >= 2) {
    const [work1, work2] = template.showcaseWorks;
    const work1Img = resolveAssetUrl(work1.image);
    const work2Img = resolveAssetUrl(work2.image);

    worksShowcaseHtml = `
      <!-- SHOWCASE OF 2 RECENT WORKS (AT BOTTOM) -->
      <div style="margin: 28px 0 20px 0; padding-top: 22px; border-top: 1px solid #EAE4D9;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
          <tr>
            <td>
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #8B8178; display: block;">
                ✦ Recent Deliveries &amp; Project Showcase
              </span>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: separate;">
          <tr>
            <!-- WORK 1 -->
            <td width="48%" style="vertical-align: top; background-color: #FAF7F2; border-radius: 10px; border: 1px solid #EAE4D9; overflow: hidden;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="line-height: 0; overflow: hidden; background-color: #1A1715;">
                    <img src="${work1Img}" alt="${work1.title}" width="270" style="width: 100%; max-width: 270px; height: 140px; object-fit: cover; display: block; border: 0;" />
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px;">
                    <span style="display: inline-block; background-color: ${template.accentColor}; color: #ffffff; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 2px 6px; border-radius: 3px; margin-bottom: 5px;">${work1.badge}</span>
                    <div style="font-size: 12px; font-weight: 700; color: #1A1715; line-height: 1.35; margin-bottom: 3px;">${work1.title}</div>
                    <div style="font-size: 11px; color: #5A514A; line-height: 1.4;">${work1.desc}</div>
                  </td>
                </tr>
              </table>
            </td>
            <td width="4%" style="width: 4%;"></td>
            <!-- WORK 2 -->
            <td width="48%" style="vertical-align: top; background-color: #FAF7F2; border-radius: 10px; border: 1px solid #EAE4D9; overflow: hidden;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="line-height: 0; overflow: hidden; background-color: #1A1715;">
                    <img src="${work2Img}" alt="${work2.title}" width="270" style="width: 100%; max-width: 270px; height: 140px; object-fit: cover; display: block; border: 0;" />
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px;">
                    <span style="display: inline-block; background-color: ${template.secondaryColor || '#2F3193'}; color: #ffffff; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 2px 6px; border-radius: 3px; margin-bottom: 5px;">${work2.badge}</span>
                    <div style="font-size: 12px; font-weight: 700; color: #1A1715; line-height: 1.35; margin-bottom: 3px;">${work2.title}</div>
                    <div style="font-size: 11px; color: #5A514A; line-height: 1.4;">${work2.desc}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  // Action Buttons
  const buttonsHtml = `
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0 16px 0;">
      <tr>
        <td style="padding-right: 12px;">
          <a href="${template.ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: ${template.accentColor}; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 11px 22px; border-radius: 6px; text-align: center; box-shadow: 0 2px 6px rgba(0,0,0,0.12);">
            ${template.ctaText} →
          </a>
        </td>
        <td>
          <a href="https://wa.me/971524587992?text=${encodeURIComponent(`Hi EGS, I am inquiring about ${template.name}`)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 11px 18px; border-radius: 6px; text-align: center;">
            💬 ${template.whatsappText}
          </a>
        </td>
      </tr>
    </table>
  `;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${resolvedSubject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1EA; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; color: #1A1715;">
  <center style="width: 100%; background-color: #F5F1EA; padding: 24px 8px;">
    <!-- CONTAINER -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; margin: 0 auto; background-color: #FFFFFF; border-radius: 14px; border: 1px solid #EAE4D9; overflow: hidden; box-shadow: 0 6px 24px rgba(26,23,21,0.06);">
      
      <!-- HEADER -->
      <tr>
        <td style="padding: 24px 28px 18px 28px; background-color: #FFFFFF; border-bottom: 1px solid #F0ECE4;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align: middle;">
                <a href="https://exhibitgraphicsign.com" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block;">
                  <img src="${logoUrl}" alt="Exhibit Graphic Sign (EGS)" width="132" style="width: 132px; max-width: 132px; height: auto; display: block; border: 0;" />
                </a>
              </td>
              <td align="right" style="vertical-align: middle;">
                <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #8B8178; display: block;">
                  ${template.category.toUpperCase()}
                </span>
                <span style="font-size: 10px; font-weight: 600; color: ${template.accentColor};">
                  UAE · KSA
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- BODY CONTENT -->
      <tr>
        <td style="padding: 28px 28px 20px 28px;">
          <!-- 1. EMAIL TEXT (FIRST) -->
          <div style="font-size: 15px; line-height: 1.62; color: #2A2522; margin-bottom: 20px;">
            ${bodyHtml}
          </div>

          <!-- 2. CAPABILITY PILLARS -->
          ${capabilitiesHtml}

          <!-- 3. PROOF STATEMENT -->
          ${proofHtml}

          <!-- 4. TWO SHOWCASE WORKS (AT BOTTOM) -->
          ${worksShowcaseHtml}

          <!-- 5. CALL TO ACTION BUTTONS -->
          ${buttonsHtml}

          <!-- 6. SIGNATURE BLOCK -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #EAE4D9;">
            <tr>
              <td width="48" style="vertical-align: top; padding-right: 14px;">
                <div style="width: 44px; height: 44px; border-radius: 50%; background-color: #1A1715; color: #ffffff; text-align: center; line-height: 44px; font-weight: 700; font-size: 14px;">
                  MR
                </div>
              </td>
              <td style="vertical-align: top;">
                <div style="font-size: 14px; font-weight: 700; color: #1A1715;">Masuood-ul-Rasheed</div>
                <div style="font-size: 12px; color: #5A514A; margin-top: 1px;">Project Director · Exhibit Graphic Sign LLC</div>
                <div style="font-size: 11px; color: #8B8178; margin-top: 3px;">
                  <span>Direct: +971 52 458 7992</span> · 
                  <a href="https://exhibitgraphicsign.com" style="color: ${template.accentColor}; text-decoration: none;">exhibitgraphicsign.com</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="padding: 18px 28px; background-color: #F8F5EF; border-top: 1px solid #EAE4D9; font-size: 11px; color: #8B8178; line-height: 1.5;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align: middle;">
                <strong style="color: #5A514A;">Exhibit Graphic Sign LLC</strong><br>
                Dubai Production Facility & Head Office · Al Quoz & Dubai Industrial City, UAE.
              </td>
              <td align="right" style="vertical-align: middle;">
                <a href="https://exhibitgraphicsign.com" style="color: #5A514A; text-decoration: underline; margin-right: 8px;">Website</a>
                <a href="mailto:info@exhibitgraphicsign.com" style="color: #5A514A; text-decoration: underline;">Contact</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- OPT-OUT NOTE -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; margin: 12px auto 0 auto;">
      <tr>
        <td align="center" style="font-size: 10px; color: #A39B92; line-height: 1.4;">
          This message was sent to ${context.name || 'you'} regarding commercial opportunities with Exhibit Graphic Sign LLC.
        </td>
      </tr>
    </table>
    
    ${trackingPixel}
  </center>
</body>
</html>`;
}
