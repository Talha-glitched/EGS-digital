import { Router } from 'express';
import { unsubscribeByToken } from '../services/campaignService.js';

const router = Router();

router.get('/:token', async (req, res, next) => {
  try {
    const recipient = await unsubscribeByToken(req.params.token);
    if (!recipient) {
      return res.status(404).send('<h1>Unsubscribe link not found.</h1>');
    }

    return res.send(`<!doctype html>
<html>
  <head>
    <title>Unsubscribed | EGS</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="font-family:Arial,sans-serif;background:#F5F1EA;color:#1A1715;padding:40px;">
    <main style="max-width:680px;margin:0 auto;background:#EDE7DC;border:1px solid #D6CBB3;padding:32px;">
      <p style="letter-spacing:.16em;text-transform:uppercase;color:#D9262E;font-weight:700;">Exhibit Graphic Sign</p>
      <h1>You have been unsubscribed.</h1>
      <p>${recipient.email} will be skipped in future EGS outreach campaigns.</p>
    </main>
  </body>
</html>`);
  } catch (error) {
    return next(error);
  }
});

export default router;
