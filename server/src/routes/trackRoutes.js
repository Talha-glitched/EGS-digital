import { Router } from 'express';
import { recordEmailOpen } from '../services/analyticsCronService.js';

const router = Router();

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

router.get('/open/:leadId/:stepId', async (req, res) => {
  try {
    await recordEmailOpen(req.params.leadId, req.params.stepId);
  } catch {
    /* still return pixel */
  }
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.send(PIXEL);
});

export default router;
