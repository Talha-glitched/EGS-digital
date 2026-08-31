import { Router } from 'express';

const router = Router();

router.post('/resend', (req, res) => {
  res.status(200).json({ received: true });
});

export default router;
