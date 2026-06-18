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
  return String(template || '')
    .replaceAll('{{name}}', lead.name || 'there')
    .replaceAll('{{company}}', company?.companyName || 'your team')
    .replaceAll('{{email}}', lead.email || '')
    .replaceAll('{{designation}}', lead.designation || '')
    .replaceAll('{{industry}}', company?.industry || '');
}

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
    'Write a concise, professional cold outreach email for UAE exhibition and branding services. Keep it human and specific. No unsubscribe footer.';

  const { content, tokensUsed, costUsd } = await chatCompletion([
    {
      role: 'system',
      content: `${prompt}\n\nReturn JSON: {"subject":"...","body":"..."}`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        contactName: lead.name,
        designation: lead.designation,
        companyName: company?.companyName,
        industry: company?.industry,
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
