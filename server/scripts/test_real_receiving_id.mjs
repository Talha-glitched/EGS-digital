import dotenv from 'dotenv';
dotenv.config();

function extractTextFromEml(emlString) {
  if (!emlString) return '';

  const bodyMatch = emlString.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let htmlOrText = bodyMatch ? bodyMatch[1] : '';

  if (!htmlOrText) {
    const parts = emlString.split(/\r?\n\r?\n/);
    if (parts.length > 1) {
      htmlOrText = parts.slice(1).join('\n\n');
    }
  }

  let decoded = htmlOrText
    .replace(/=\r?\n/g, '')
    .replace(/=3D/gi, '=')
    .replace(/=20/g, ' ')
    .replace(/=0A/gi, '\n')
    .replace(/=0D/gi, '\r');

  let plain = decoded
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#\d+;/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');

  return plain.split('\n').map(line => line.trim()).filter(Boolean).join('\n');
}

async function run() {
  const apiKey = process.env.RESEND_API_KEY;

  console.log('Testing Tornike Jobava raw download parse...');
  const res2 = await fetch('https://api.resend.com/emails/receiving/9eb5bde2-aebd-466c-a1ad-86a1517cdaef', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data2 = await res2.json();

  if (data2.raw?.download_url) {
    const rawRes = await fetch(data2.raw.download_url);
    const emlText = await rawRes.text();
    const cleanText = extractTextFromEml(emlText);
    console.log('=== EXTRACTED CLEAN TEXT FOR TORNIKE ===');
    console.log(cleanText);
  }

  console.log('\nTesting Raed Aoude raw download parse...');
  const listRes = await fetch('https://api.resend.com/emails/receiving?limit=100', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const listJson = await listRes.json();
  const raedItem = (listJson.data || []).find(e => String(e.from).toLowerCase().includes('raed'));
  if (raedItem?.id) {
    const raedDetailRes = await fetch(`https://api.resend.com/emails/receiving/${raedItem.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const raedDetail = await raedDetailRes.json();
    if (raedDetail.raw?.download_url) {
      const rawRes = await fetch(raedDetail.raw.download_url);
      const emlText = await rawRes.text();
      const cleanText = extractTextFromEml(emlText);
      console.log('=== EXTRACTED CLEAN TEXT FOR RAED AOUDE ===');
      console.log(cleanText);
    }
  }
}

run().catch(console.error);
