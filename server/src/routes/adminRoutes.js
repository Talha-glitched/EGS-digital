import { Router } from 'express';
import multer from 'multer';
import { recordEmailOpen } from '../services/analyticsCronService.js';
import {
  parseSpreadsheetBuffer,
  suggestFieldMapping,
  ingestLeads,
  previewIngestion,
  buildCompanyRows,
  COMPANY_FIELDS,
} from '../services/ingestionService.js';
import {
  listInboxThreads,
  getInboxThread,
  syncImapMailbox,
} from '../services/imapWatcherService.js';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  importTargetCompanies,
  listProjectCompanies,
  listProjectLeads,
  logRevenue,
  updateOverhead,
  getGlobalAnalytics,
  getProjectAnalytics,
  blacklistLead,
  markLeadWon,
  getCrmAdminStatus,
} from '../services/projectService.js';
import {
  listSequences,
  createSequence,
  updateSequence,
  enrollProjectLeads,
} from '../services/sequenceService.js';
import {
  clearAdminCookie,
  isAdminConfigured,
  readAdminCookie,
  requireAdmin,
  setAdminCookie,
  validateAdminCredentials,
} from '../utils/adminAuth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

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
    ...getCrmAdminStatus(),
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

router.get('/projects', requireAdmin, asyncRoute(async (_req, res) => {
  res.json(await listProjects());
}));

router.post('/projects', requireAdmin, asyncRoute(async (req, res) => {
  const project = await createProject(req.body || {});
  res.status(201).json(project);
}));

router.get('/projects/:id', requireAdmin, asyncRoute(async (req, res) => {
  res.json(await getProject(req.params.id));
}));

router.patch('/projects/:id', requireAdmin, asyncRoute(async (req, res) => {
  res.json(await updateProject(req.params.id, req.body || {}));
}));

router.get('/projects/:id/companies', requireAdmin, asyncRoute(async (req, res) => {
  res.json(await listProjectCompanies(req.params.id, req.query));
}));

router.post('/projects/:id/companies', requireAdmin, asyncRoute(async (req, res) => {
  const rows = req.body?.rows || req.body?.companies || [];
  res.json(await importTargetCompanies(req.params.id, rows));
}));

router.post(
  '/projects/:id/companies/preview',
  requireAdmin,
  upload.single('file'),
  asyncRoute(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'File is required.' });
    }
    const sheets = parseSpreadsheetBuffer(req.file.buffer);
    const headers = sheets[0]?.headers || [];
    const { suggestedMapping } = suggestFieldMapping(headers, COMPANY_FIELDS);
    const rowCount = sheets.reduce((sum, sheet) => sum + sheet.dataRows.length, 0);
    const sample = sheets[0]?.dataRows?.slice(0, 5) || [];
    res.json({ headers, suggestedMapping, rowCount, sample, fields: COMPANY_FIELDS });
  })
);

router.post(
  '/projects/:id/companies/upload',
  requireAdmin,
  upload.single('file'),
  asyncRoute(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'File is required.' });
    }
    const sheets = parseSpreadsheetBuffer(req.file.buffer);
    let fieldMapping = req.body.fieldMapping ? JSON.parse(req.body.fieldMapping) : null;
    if (!fieldMapping || !Object.keys(fieldMapping).length) {
      fieldMapping = suggestFieldMapping(sheets[0]?.headers || [], COMPANY_FIELDS).suggestedMapping;
    }
    const rows = buildCompanyRows(sheets, fieldMapping);
    res.json(await importTargetCompanies(req.params.id, rows));
  })
);

router.get('/projects/:id/leads', requireAdmin, asyncRoute(async (req, res) => {
  res.json(await listProjectLeads(req.params.id, req.query));
}));

router.post('/projects/:id/ingest/preview', requireAdmin, upload.single('file'), asyncRoute(async (req, res) => {
  const fieldMapping = req.body.fieldMapping ? JSON.parse(req.body.fieldMapping) : {};
  const vendor = req.body.vendor || 'Manual';
  let sheets = req.body.sheets ? JSON.parse(req.body.sheets) : null;

  if (req.file) {
    sheets = parseSpreadsheetBuffer(req.file.buffer);
    if (!fieldMapping || !Object.keys(fieldMapping).length) {
      const suggestion = suggestFieldMapping(sheets[0]?.headers || []);
      return res.json({ sheets, ...suggestion });
    }
  }

  if (!sheets?.length) {
    return res.status(400).json({ message: 'Upload file or provide sheets.' });
  }

  res.json(await previewIngestion(req.params.id, { sheets, fieldMapping, vendor }));
}));

router.post('/projects/:id/ingest', requireAdmin, upload.single('file'), asyncRoute(async (req, res) => {
  const fieldMapping = req.body.fieldMapping ? JSON.parse(req.body.fieldMapping) : {};
  const vendor = req.body.vendor || 'Manual';
  let sheets = req.body.sheets ? JSON.parse(req.body.sheets) : null;

  if (req.file) {
    sheets = parseSpreadsheetBuffer(req.file.buffer);
  }

  if (!sheets?.length) {
    return res.status(400).json({ message: 'Upload file or provide sheets.' });
  }

  if (!Object.keys(fieldMapping).length) {
    const suggestion = suggestFieldMapping(sheets[0]?.headers || []);
    Object.assign(fieldMapping, suggestion.suggestedMapping);
  }

  res.json(await ingestLeads(req.params.id, { sheets, fieldMapping, vendor }));
}));

router.get('/projects/:id/sequences', requireAdmin, asyncRoute(async (req, res) => {
  res.json(await listSequences(req.params.id));
}));

router.post('/projects/:id/sequences', requireAdmin, asyncRoute(async (req, res) => {
  const seq = await createSequence(req.params.id, req.body || {});
  res.status(201).json(seq);
}));

router.patch('/sequences/:id', requireAdmin, asyncRoute(async (req, res) => {
  res.json(await updateSequence(req.params.id, req.body || {}));
}));

router.post('/projects/:id/enroll', requireAdmin, asyncRoute(async (req, res) => {
  const { sequenceId } = req.body || {};
  if (!sequenceId) {
    return res.status(400).json({ message: 'sequenceId is required.' });
  }
  res.json(await enrollProjectLeads(req.params.id, sequenceId));
}));

router.get('/inbox', requireAdmin, asyncRoute(async (req, res) => {
  res.json(await listInboxThreads({ limit: req.query.limit, campaignId: req.query.campaignId }));
}));

router.get('/inbox/:threadId', requireAdmin, asyncRoute(async (req, res) => {
  res.json(await getInboxThread(req.params.threadId));
}));

router.post('/inbox/sync', requireAdmin, asyncRoute(async (_req, res) => {
  res.json(await syncImapMailbox());
}));

router.post('/inbox/:threadId/blacklist', requireAdmin, asyncRoute(async (req, res) => {
  const thread = await getInboxThread(req.params.threadId);
  res.json(await blacklistLead(thread.leadId));
}));

router.post('/inbox/:threadId/won', requireAdmin, asyncRoute(async (req, res) => {
  const thread = await getInboxThread(req.params.threadId);
  res.json(await markLeadWon(thread.leadId, req.body || {}));
}));

router.get('/analytics/global', requireAdmin, asyncRoute(async (_req, res) => {
  res.json(await getGlobalAnalytics());
}));

router.get('/analytics/projects/:id', requireAdmin, asyncRoute(async (req, res) => {
  res.json(await getProjectAnalytics(req.params.id));
}));

router.post('/finance/revenue', requireAdmin, asyncRoute(async (req, res) => {
  res.json(await logRevenue(req.body || {}));
}));

router.post('/finance/overhead', requireAdmin, asyncRoute(async (req, res) => {
  res.json(await updateOverhead(req.body || {}));
}));

export default router;
