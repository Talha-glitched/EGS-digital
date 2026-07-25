import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const apiKey = process.env.RESEND_API_KEY;
  const res = await fetch('https://api.resend.com/emails/receiving', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const json = await res.json();
  console.log('List data items count:', json.data?.length);

  const matched = (json.data || []).filter(e => JSON.stringify(e).toLowerCase().includes('raed') || JSON.stringify(e).toLowerCase().includes('andrew'));
  console.log('Matched items:', matched.length);

  if (matched.length > 0) {
    console.log('First matched item:', JSON.stringify(matched[0], null, 2));
  }
}

run().catch(console.error);
