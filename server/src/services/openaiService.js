const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

function getCostPer1kTokens() {
  return Number(process.env.OPENAI_COST_PER_1K_TOKENS) || 0.00015;
}

export function isOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function chatCompletion(messages, { maxTokens = 800 } = {}) {
  if (!isOpenAiConfigured()) {
    return { content: '', tokensUsed: 0, costUsd: 0 };
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI request failed: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const tokensUsed = data.usage?.total_tokens || 0;
  const costUsd = (tokensUsed / 1000) * getCostPer1kTokens();
  const content = data.choices?.[0]?.message?.content || '';
  return { content, tokensUsed, costUsd };
}

function personalizeTemplate(template, lead, company) {
  const firstName = String(lead.name || '').split(' ')[0] || 'there';
  return String(template || '')
    .replaceAll('[First]', firstName)
    .replaceAll('[First Name]', firstName)
    .replaceAll('{{name}}', lead.name || 'there')
    .replaceAll('[University]', company?.companyName || 'your institution')
    .replaceAll('[Company]', company?.companyName || 'your team')
    .replaceAll('{{company}}', company?.companyName || 'your team')
    .replaceAll('{{email}}', lead.email || '')
    .replaceAll('{{designation}}', lead.designation || '')
    .replaceAll('{{industry}}', company?.industry || '');
}

const PROOF_LIBRARY = `
EGS Approved Proof Points:
1. HCT Graduation Program: EGS successfully delivered 7 HCT grand ceremonies across the UAE (Dubai, Abu Dhabi, Sharjah, RAK, Fujairah) in 2025 for 4,500 graduates and 13,500 guests. In 2024, EGS delivered 8 grand ceremonies for 3,500 graduates and 10,000 guests.
2. HCT Fujairah stage recovery: EGS extended a stage by 5-6 meters at the Zayed Sports Complex ceremony just 10 hours before the event.
3. Graduation Service Scope: EGS handles full physical ceremony production, including design, stage setup, venue branding, backdrops, LED screens, lighting, sound, AV, student registration support, seating, on-site management, and removal.
`;

const COMPLIANCE_CHECKLIST = `
QA Writing Constraints:
- Do not imply private monitoring like "we noticed you did X", do not make unsupported claims, avoid price anchoring, do not compare EGS to competitors, avoid intrusive details.
- Phrase research sources strictly as: "I was looking at your website", "I came across", "public list shows".
- Never claim EGS handled VIPs personally unless explicitly verified; focus on "VIP-scale" event production standards.
`;

export async function generateSequenceEmail({ lead, company, step }) {
  const baseSubject = personalizeTemplate(step.subjectTemplate, lead, company);
  const baseBody = personalizeTemplate(step.bodyTemplate, lead, company);

  if (!step.useAiPersonalization || !isOpenAiConfigured()) {
    return {
      subject: baseSubject,
      body: baseBody,
      tokensUsed: 0,
      costUsd: 0,
    };
  }

  const prompt =
    step.aiPrompt ||
    'Write a concise, professional cold outreach email for UAE exhibition and branding services. Keep it human and specific.';

  const systemPrompt = `You are a compliance-first B2B outreach email personalizer for Exhibit Graphic Sign (EGS).
Your task is to take a base subject and base body, and generate a personalized version with a natural, organic opening hook.

${PROOF_LIBRARY}

${COMPLIANCE_CHECKLIST}

Guidelines:
1. ONLY write a personalized intro hook or customize a specific section of the email body to make it organic. Keep the core EGS proof points and subject lines as defined in the base templates.
2. Never invent fake claims, numbers, or services.
3. Strictly follow the QA Writing Constraints (no banned monitoring phrasing, no price claims, no competitor comparisons).
4. Return JSON only: {"subject": "...", "body": "..."}`;

  const { content, tokensUsed, costUsd } = await chatCompletion([
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: JSON.stringify({
        contactName: lead.name,
        designation: lead.designation,
        companyName: company?.companyName,
        industry: company?.industry,
        prompt,
        baseSubject,
        baseBody,
      }),
    },
  ]);

  try {
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
    return {
      subject: parsed.subject || baseSubject,
      body: parsed.body || baseBody,
      tokensUsed,
      costUsd,
    };
  } catch {
    return { subject: baseSubject, body: content || baseBody, tokensUsed, costUsd };
  }
}

export async function classifyReplyIntent(text) {
  const fallback = { intent: 'Neutral', confidence: 0.5 };

  if (!isOpenAiConfigured()) {
    const lower = String(text || '').toLowerCase();
    if (/not interested|remove me|unsubscribe|stop emailing|wrong person|do not contact/.test(lower)) {
      return { intent: 'Opt Out', confidence: 0.9 };
    }
    if (/interested|let's talk|schedule|call me|sounds good|yes please/.test(lower)) {
      return { intent: 'Interested', confidence: 0.85 };
    }
    return fallback;
  }

  const { content } = await chatCompletion(
    [
      {
        role: 'system',
        content:
          'Classify email reply intent. Return JSON only: {"intent":"Interested"|"Opt Out"|"Neutral"|"Bounce","confidence":0-1}',
      },
      { role: 'user', content: String(text || '').slice(0, 2000) },
    ],
    { maxTokens: 100 }
  );

  try {
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
    const valid = ['Interested', 'Opt Out', 'Neutral', 'Bounce'];
    if (valid.includes(parsed.intent)) {
      return { intent: parsed.intent, confidence: parsed.confidence || 0.8 };
    }
  } catch {
    /* fallback below */
  }
  return fallback;
}

export function calculateTokenCost(tokensUsed) {
  return (tokensUsed / 1000) * getCostPer1kTokens();
}
