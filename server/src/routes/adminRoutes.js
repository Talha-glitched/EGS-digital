import { Router } from 'express';
import {
  createCampaign,
  duplicateCampaign,
  exportCampaignRecipientsCsv,
  getAdminStatus,
  getCampaign,
  getCampaignOverview,
  listCampaigns,
  listInboxReplies,
  listRawInboxFromImap,
  listSuppressions,
  sendTestEmail,
  syncRepliesNow,
  updateCampaignDraft,
  updateCampaignStatus,
} from '../services/campaignService.js';
import {
  clearAdminCookie,
  isAdminConfigured,
  readAdminCookie,
  requireAdmin,
  setAdminCookie,
  validateAdminCredentials,
} from '../utils/adminAuth.js';

const router = Router();

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

router.get('/status', (req, res) => {
  res.json({
    authenticated: Boolean(readAdminCookie(req)),
    adminConfigured: isAdminConfigured(),
    ...getAdminStatus(),
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!validateAdminCredentials(username, password)) {
    return res.status(401).json({ message: 'Invalid admin credentials.' });
  }

  setAdminCookie(res, username);
  return res.json({ ok: true });
});

router.post('/logout', (_req, res) => {
  clearAdminCookie(res);
  return res.json({ ok: true });
});

router.get(
  '/inbox/raw',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const limit = req.query.limit;
    res.json(await listRawInboxFromImap({ limit: Number(limit) }));
  })
);

router.get(
  '/inbox',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const limit = req.query.limit;
    const campaignId = req.query.campaignId;
    res.json(await listInboxReplies({ limit: Number(limit), campaignId }));
  })
);

router.get(
  '/overview',
  requireAdmin,
  asyncRoute(async (_req, res) => {
    res.json(await getCampaignOverview());
  })
);

router.get(
  '/suppressions',
  requireAdmin,
  asyncRoute(async (req, res) => {
    res.json(await listSuppressions(Number(req.query.limit)));
  })
);

router.post(
  '/send-test',
  requireAdmin,
  asyncRoute(async (req, res) => {
    await sendTestEmail(req.body || {});
    res.json({ ok: true });
  })
);

router.get(
  '/campaigns',
  requireAdmin,
  asyncRoute(async (_req, res) => {
    res.json(await listCampaigns());
  })
);

router.post(
  '/campaigns',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { name, subject, body, contacts } = req.body || {};
    if (!name || !subject || !body || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ message: 'Campaign name, subject, body, and contacts are required.' });
    }

    const campaign = await createCampaign({ name, subject, body, contacts });
    return res.status(201).json(campaign);
  })
);

router.patch(
  '/campaigns/:id',
  requireAdmin,
  asyncRoute(async (req, res) => {
    res.json(await updateCampaignDraft(req.params.id, req.body || {}));
  })
);

router.post(
  '/campaigns/:id/duplicate',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const campaign = await duplicateCampaign(req.params.id);
    return res.status(201).json(campaign);
  })
);

router.get(
  '/campaigns/:id/recipients-export',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const csv = await exportCampaignRecipientsCsv(req.params.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${req.params.id}-recipients.csv"`);
    res.send(csv);
  })
);

router.get(
  '/campaigns/:id',
  requireAdmin,
  asyncRoute(async (req, res) => {
    res.json(await getCampaign(req.params.id));
  })
);

router.post(
  '/campaigns/:id/start',
  requireAdmin,
  asyncRoute(async (req, res) => {
    res.json(await updateCampaignStatus(req.params.id, 'running'));
  })
);

router.post(
  '/campaigns/:id/pause',
  requireAdmin,
  asyncRoute(async (req, res) => {
    res.json(await updateCampaignStatus(req.params.id, 'paused'));
  })
);

router.post(
  '/campaigns/:id/resume',
  requireAdmin,
  asyncRoute(async (req, res) => {
    res.json(await updateCampaignStatus(req.params.id, 'running'));
  })
);

router.post(
  '/campaigns/:id/cancel',
  requireAdmin,
  asyncRoute(async (req, res) => {
    res.json(await updateCampaignStatus(req.params.id, 'cancelled'));
  })
);

router.post(
  '/replies/sync',
  requireAdmin,
  asyncRoute(async (_req, res) => {
    const stats = await syncRepliesNow();
    res.json({ ok: true, ...stats });
  })
);

export default router;
