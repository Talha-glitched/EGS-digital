import { Router } from 'express';
import multer from 'multer';
import { recordEmailOpen, computeVendorMatrix } from '../services/analyticsCronService.js';
import {
  parseSpreadsheetBuffer,
  suggestFieldMapping,
  ingestLeads,
  previewIngestion,
  buildCompanyRows,
  COMPANY_FIELDS,
  CONTACT_FIELDS,
  blendAndIngestLeads,
  previewBlendAndIngestLeads,
} from '../services/ingestionService.js';
import { exportCampaignToBuffer } from '../services/excelExportService.js';
import db from '../db/index.js';
import { sendAuthenticatedMail, getFromIdentity } from '../services/mailTransport.js';
import { getSystemSettings, updateSystemSettings } from '../services/systemSettingsService.js';
import { getResendMetrics } from '../services/resendService.js';
import { syncAllResendReplies } from '../services/resendAutoSyncService.js';
import { assignReplyReview, completeReplyReview, resolveReplyReview } from '../services/replyReviewTaskService.js';
import {
  getTodayReviewStatus,
  completeDailyReview,
  getMonthlyReviewHistory,
  getDashboardWorkingViewData,
} from '../services/dailyReviewService.js';
import { sendJobNow } from '../services/sendWorker.js';
import {
  listOngoingJobs,
  createOngoingJob,
  updateOngoingJob,
  getOngoingJob,
  getOngoingJobTimeline,
  getPipelineConfig,
  updatePipelineConfig,
  deleteTask,
  restoreTask,
  deleteOngoingJob,
  restoreOngoingJob,
  deleteTasks,
  deleteOngoingJobs,
  getWorkspaceSummary,
  listOpportunities,
  createOpportunity,
  updateOpportunity,
  getOpportunity,
  getOpportunityTimeline,
  deleteOpportunity,
  restoreOpportunity,
  deleteOpportunities,
} from '../services/salesService.js';
import {
  listUnifiedTasks,
  getUnifiedTask,
  createUnifiedTask,
  updateUnifiedTask,
  getTaskJobContext,
  addTaskEvidence,
} from '../services/unifiedTaskService.js';
import { getTodayWorkspace, submitFieldAction } from '../services/fieldExecutionService.js';
import { getJobActivationWorkspace, activateJobDelivery } from '../services/jobActivationService.js';
import { getCommunicationJobWorkspace, createCommunicationJobAction } from '../services/communicationJobService.js';
import { getCommunicationsWorkspace } from '../services/communicationsWorkspaceService.js';
import { getAccountWorkspace } from '../services/accountWorkspaceService.js';
import { globalSearch } from '../services/searchService.js';
import {
  listCompletedJobs,
  getCompletedJob,
  createCompletedJob,
  updateCompletedJob,
  deleteCompletedJob,
  restoreCompletedJob,
  listJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  restoreJob,
} from '../services/completedJobService.js';
import { runJobSeeding } from '../../scripts/seedJobsFromSheet.mjs';
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
  getFinanceOverview,
  getGlobalAnalytics,
  getProjectAnalytics,
  blacklistLead,
  markLeadWon,
  getCrmAdminStatus,
  listAllLeads,
  getLeadById,
  updateLeadById,
  listAllCompanies,
  getCompanyDetails,
  updateCompanyDetails,
  createCompany,
  createStandaloneLead,
  addLeadToCompany,
  setKeyRelationshipConfirmation,
  assignLeadToCampaign,
  getComprehensiveAnalytics,
  recalculateAllCampaignCoverageStats,
  deleteLead,
  restoreLead,
  deleteCompany,
  restoreCompany,
  deleteProject,
  restoreProject,
  deleteProjects,
  deleteLeads,
  deleteCompanies,
  syncCampaignResponseCounts,
} from '../services/projectService.js';
import { getLeadTimeline, getCompanyTimeline } from '../services/contactTimelineService.js';
import {
  createInteraction,
  updateInteraction,
  deleteInteraction,
  restoreInteraction,
} from '../services/interactionService.js';
import {
  listSequences,
  listAllSequences,
  getSequenceWithStats,
  previewAudience,
  getMailboxUsageStats,
  listSentEmails,
  getSentEmail,
  listSendDeliveryIssues,
  getSequenceDeliverySummary,
  createSequence,
  updateSequence,
  deleteSequence,
  deleteSequences,
  restoreSequence,
  enrollProjectLeads,
  launchSequence,
  listLaunchBatches,
  listLaunchBatchJobs,
  removeLaunchBatchJobs,
  sendLaunchBatchJobs,
  getLaunchBatchSendProgress,
  sendCampaignQueueJobs,
  resetSequenceEnrollments,
  listCampaignQueueJobs,
  removeSendJob,
  removeCampaignQueueJobs,
} from '../services/sequenceService.js';
import {
  clearAdminCookie,
  isAdminConfigured,
  readAdminCookie,
  requireAdmin,
  setAdminCookie,
  loginAdmin,
} from '../utils/adminAuth.js';
import { userHasPermission } from '../services/authService.js';
import { permissionForRequest } from '../constants/userRoles.js';
import { getActor } from '../utils/actor.js';
import { writeAuditLog, listAuditLogs, getUserActivitySummary, getAuditLogById } from '../services/auditService.js';
import { selectCampaignContactFocus } from '../services/campaignContactCoordinationService.js';
import {
  listJobMemory,
  listJobMemoryVersions,
  createJobMemoryEntry,
  reviseJobMemoryEntry,
} from '../services/jobMemoryService.js';
import {
  getJobDeliveryWorkspace,
  createJobPhase,
  updateJobPhase,
  archiveJobPhase,
  createJobLocation,
  updateJobLocation,
  archiveJobLocation,
  createWorkPackage,
  updateWorkPackage,
  archiveWorkPackage,
} from '../services/jobDeliveryService.js';
import {
  getJobCommercialArtifacts,
  createDesignSet,
  addDesignVersion,
  createQuote,
  addQuoteVersion,
  recordArtifactDecision,
} from '../services/jobCommercialArtifactService.js';
import {
  getProductionWorkspace,
  createProductionRelease,
  revokeProductionRelease,
  createJobActivity,
  updateJobActivity,
  archiveJobActivity,
  addActivityUpdate,
  getPlanCalendar,
} from '../services/productionExecutionService.js';
import {
  getProcurementWorkspace,
  getSupplierDirectory,
  createSupplier,
  createSupplierRfq,
  updateSupplierRfq,
  updateSupplierProfile,
  createSupplierQuote,
  createSupplierCommitment,
  updateSupplierCommitment,
  addSupplierCommitmentUpdate,
} from '../services/supplierProcurementService.js';
import {
  getResourceWorkspace,
  createResource,
  updateResource,
  assignResource,
  removeResourceAssignment,
  addAvailabilityBlock,
  startProjectTimer,
  stopProjectTimer,
  createManualTimeEntry,
  correctTimeEntry,
} from '../services/resourceTimeService.js';
import {
  getEmployeeOperationsWorkspace,
  createEmployee,
  updateEmployee,
  linkUserToEmployee,
  createEmployeeFromUser,
  createCertification,
  archiveCertification,
  createTeamMembership,
  endTeamMembership,
} from '../services/employeeOperationsService.js';
import {
  getInventoryWorkspace,
  createInventoryItem,
  createInventoryLocation,
  createInventoryAsset,
  recordInventoryMovement,
  createInventoryReservation,
  createPackingList,
  addPackingLine,
  updatePackingListStatus,
} from '../services/inventoryService.js';
import {
  getJobCloseout,
  saveJobHandover,
  uploadCloseoutEvidence,
  createJobSnag,
  updateJobSnag,
} from '../services/jobCloseoutService.js';
import { getOperationalReport } from '../services/operationalReportingService.js';
import {
  getJobCosting,
  createCostEstimate,
  updateCostEstimate,
  archiveCostEstimate,
  createOtherActualCost,
  voidOtherActualCost,
  confirmJobCosts,
  reopenJobCosts,
} from '../services/jobCostingService.js';
import {
  getJobSettlement,
  setPhysicalDelivery,
  saveMilestone,
  deleteMilestone,
  getSettlementQueues,
} from '../services/jobSettlementService.js';
import { getEmailDeliveryStatus, sendUserCredentialsEmail } from '../services/userEmailService.js';
import {
  listUsers,
  listActiveUsers,
  getUserById,
  createUser,
  updateUser,
  setUserPassword,
  issueUserCredentials,
  changeOwnPassword,
  getRoleOptions,
} from '../services/userService.js';
import {
  listRevisions,
  listRecentRevisions,
  rollbackToRevision,
  restoreRecord,
  getRevisionById,
} from '../services/revisionService.js';
import { Task } from '../models/Task.js';
import { ContactInteraction } from '../models/ContactInteraction.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const blockedJobMemoryExtensions = new Set(['.bat', '.cmd', '.com', '.cpl', '.exe', '.html', '.htm', '.js', '.mjs', '.php', '.ps1', '.sh']);
const jobMemoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, callback) => {
    const extension = String(file.originalname || '').toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    if (blockedJobMemoryExtensions.has(extension)) {
      const error = new Error(`File type ${extension} is not allowed.`);
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});
const jobArtifactUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = String(file.originalname || '').toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    if (blockedJobMemoryExtensions.has(extension)) {
      const error = new Error(`File type ${extension} is not allowed.`);
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});
const activityEvidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = String(file.originalname || '').toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    if (blockedJobMemoryExtensions.has(extension)) return callback(Object.assign(new Error(`File type ${extension} is not allowed.`), { status: 400 }));
    return callback(null, true);
  },
});
const taskEvidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = String(file.originalname || '').toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    if (blockedJobMemoryExtensions.has(extension)) return callback(Object.assign(new Error(`File type ${extension} is not allowed.`), { status: 400 }));
    return callback(null, true);
  },
});
const fieldPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowed.includes(String(file.mimetype || '').toLowerCase())) return callback(Object.assign(new Error('Field evidence must be a JPG, PNG, WebP, HEIC, or HEIF image.'), { status: 400 }));
    return callback(null, true);
  },
});
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

function getLoginAttemptState(req) {
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    const fresh = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttempts.set(key, fresh);
    return { key, state: fresh };
  }
  return { key, state: current };
}

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function requireRoutePermission(req, res, next) {
  const perm = permissionForRequest(req.method, req.path);
  if (!userHasPermission(req.user, perm)) {
    return res.status(403).json({ message: 'You do not have permission to perform this action.' });
  }
  return next();
}

const PUBLIC_PATHS = new Set(['/status', '/login', '/logout']);

router.use((req, res, next) => {
  if (PUBLIC_PATHS.has(req.path)) return next();
  return requireAdmin(req, res, () => requireRoutePermission(req, res, next));
});

router.post('/sync/resend-replies', asyncRoute(async (req, res) => {
  const stats = await syncAllResendReplies();
  res.json(stats);
}));

router.get('/status', asyncRoute(async (req, res) => {
  const session = readAdminCookie(req);
  const delivery = await getEmailDeliveryStatus();
  res.json({
    authenticated: Boolean(session),
    username: session?.displayName || session?.username || null,
    user: session
      ? {
          id: session.userId,
          email: session.email,
          displayName: session.displayName,
          role: session.role,
          permissions: session.permissions || [],
          mustChangePassword: Boolean(session.mustChangePassword),
        }
      : null,
    adminConfigured: isAdminConfigured(),
    ...getCrmAdminStatus(),
    useResend: delivery.useResend,
    resendReady: delivery.resendReady,
    emailDeliveryReady: delivery.emailDeliveryReady,
  });
}));

router.post('/login', asyncRoute(async (req, res) => {
  const { key, state } = getLoginAttemptState(req);
  if (state.count >= LOGIN_MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((state.resetAt - Date.now()) / 1000));
    res.setHeader('Retry-After', retryAfterSeconds);
    return res.status(429).json({ message: 'Too many login attempts. Try again later.' });
  }
  const { username, password } = req.body || {};
  const ip = req.ip || req.socket?.remoteAddress || null;
  const session = await loginAdmin(username, password, ip);
  if (!session) {
    state.count += 1;
    loginAttempts.set(key, state);
    await writeAuditLog({
      userDisplayName: String(username || 'unknown'),
      action: 'login_failed',
      summary: 'Failed login attempt',
      ip,
      userAgent: req.headers['user-agent'] || null,
    }).catch(() => {});
    return res.status(401).json({ message: 'Invalid credentials.' });
  }
  loginAttempts.delete(key);
  setAdminCookie(res, session);
  await writeAuditLog({
    userId: session.userId || null,
    userDisplayName: session.displayName,
    action: 'login',
    summary: `${session.displayName} signed in`,
    ip,
    userAgent: req.headers['user-agent'] || null,
  }).catch(() => {});
  return res.json({ ok: true, user: session });
}));

router.post('/logout', asyncRoute(async (req, res) => {
  const actor = getActor(req);
  clearAdminCookie(res);
  await writeAuditLog({
    userId: actor.userId,
    userDisplayName: actor.displayName,
    action: 'logout',
    summary: `${actor.displayName} signed out`,
    ip: req.ip || null,
    userAgent: req.headers['user-agent'] || null,
  }).catch(() => {});
  return res.json({ ok: true });
}));

router.get('/projects', asyncRoute(async (req, res) => {
  res.json(await listProjects({ summary: req.query.summary === 'true' }));
}));


router.post('/projects/recalculate-coverage', asyncRoute(async (_req, res) => {
  res.json(await recalculateAllCampaignCoverageStats());
}));

router.post('/projects', asyncRoute(async (req, res) => {
  const project = await createProject(req.body || {});
  res.status(201).json(project);
}));

router.get('/projects/:id', asyncRoute(async (req, res) => {
  res.json(await getProject(req.params.id));
}));

router.patch('/projects/:id', asyncRoute(async (req, res) => {
  res.json(await updateProject(req.params.id, req.body || {}));
}));

router.delete('/projects/:id', asyncRoute(async (req, res) => {
  res.json(await deleteProject(req.params.id, getActor(req)));
}));

router.post('/projects/:id/restore', asyncRoute(async (req, res) => {
  res.json(await restoreProject(req.params.id, getActor(req)));
}));

router.post('/projects/bulk-delete', asyncRoute(async (req, res) => {
  const ids = req.body?.ids || [];
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ message: 'ids array is required.' });
  }
  res.json(await deleteProjects(ids, getActor(req)));
}));

router.get('/projects/:id/companies', asyncRoute(async (req, res) => {
  res.json(await listProjectCompanies(req.params.id, req.query));
}));

router.post('/projects/:id/companies', asyncRoute(async (req, res) => {
  const rows = req.body?.rows || req.body?.companies || [];
  res.json(await importTargetCompanies(req.params.id, rows));
}));

router.post(
  '/projects/:id/companies/preview',
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

router.get('/projects/:id/leads', asyncRoute(async (req, res) => {
  res.json(await listProjectLeads(req.params.id, req.query));
}));

router.post('/projects/:id/ingest/preview', upload.any(), asyncRoute(async (req, res) => {
  const file = req.files?.[0];
  if (!file) {
    return res.status(400).json({ message: 'File is required.' });
  }

  const sheets = parseSpreadsheetBuffer(file.buffer);
  const headers = sheets[0]?.headers || [];
  const { suggestedMapping, detectedVendor } = suggestFieldMapping(headers, CONTACT_FIELDS);
  const rowCount = sheets.reduce((sum, sheet) => sum + sheet.dataRows.length, 0);
  const sample = sheets[0]?.dataRows?.slice(0, 5) || [];

  let fieldMapping = null;
  try {
    fieldMapping = req.body.fieldMapping ? JSON.parse(req.body.fieldMapping) : null;
  } catch {
    fieldMapping = null;
  }

  // When a mapping is provided, return a dry-run blend preview too.
  if (fieldMapping && Object.keys(fieldMapping).length) {
    const vendor = req.body.vendor || detectedVendor || 'Manual';
    const stats = await previewBlendAndIngestLeads(req.params.id, [{
      sheets,
      fieldMapping,
      vendor,
    }]);
    return res.json({
      headers,
      suggestedMapping,
      detectedVendor,
      rowCount,
      sample,
      fields: CONTACT_FIELDS,
      ...stats,
    });
  }

  res.json({
    headers,
    suggestedMapping,
    detectedVendor,
    rowCount,
    sample,
    fields: CONTACT_FIELDS,
  });
}));

router.post('/projects/:id/ingest', upload.any(), asyncRoute(async (req, res) => {
  if (!req.files || !req.files.length) {
    return res.status(400).json({ message: 'At least one file is required.' });
  }

  let customMappings = {};
  try {
    customMappings = req.body.fieldMappings ? JSON.parse(req.body.fieldMappings) : {};
  } catch {
    customMappings = {};
  }

  let sharedMapping = null;
  try {
    sharedMapping = req.body.fieldMapping ? JSON.parse(req.body.fieldMapping) : null;
  } catch {
    sharedMapping = null;
  }

  const sharedVendor = req.body.vendor || null;
  let customVendors = {};
  try {
    customVendors = typeof req.body.vendors === 'string'
      ? JSON.parse(req.body.vendors)
      : (req.body.vendors || {});
  } catch {
    customVendors = {};
  }

  const uploads = [];
  for (const file of req.files) {
    const sheets = parseSpreadsheetBuffer(file.buffer);
    const headers = sheets[0]?.headers || [];
    const suggestion = suggestFieldMapping(headers, CONTACT_FIELDS);
    const mapping = customMappings[file.originalname]
      || sharedMapping
      || suggestion.suggestedMapping;
    const vendor = customVendors[file.originalname]
      || sharedVendor
      || suggestion.detectedVendor
      || 'Manual';

    uploads.push({
      sheets,
      fieldMapping: mapping,
      vendor,
    });
  }

  const stats = await blendAndIngestLeads(req.params.id, uploads);
  res.json(stats);
}));

router.get('/projects/:id/export', asyncRoute(async (req, res) => {
  const buffer = await exportCampaignToBuffer(req.params.id);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=EGS_Outreach_Tracker_${req.params.id}.xlsx`);
  res.send(buffer);
}));

router.get('/mailbox-usage', asyncRoute(async (req, res) => {
  res.json(await getMailboxUsageStats());
}));

router.get('/sequences', asyncRoute(async (req, res) => {
  res.json(await listAllSequences());
}));

router.get('/sequences/:id/delivery-summary', asyncRoute(async (req, res) => {
  res.json(await getSequenceDeliverySummary(req.params.id));
}));

router.get('/sequences/:id', asyncRoute(async (req, res) => {
  res.json(await getSequenceWithStats(req.params.id));
}));

router.get('/projects/:id/audience-preview', asyncRoute(async (req, res) => {
  const {
    sequenceId,
    leadIds,
    companyIds,
    includeCompanyIds,
    includeLeadIds,
    excludeCompanyIds,
    excludeLeadIds,
    importedCampaignIds,
    importCampaign,
    full,
  } = req.query || {};
  const parseIds = (value) => (value ? String(value).split(',').filter(Boolean) : []);
  const parseBool = (value) => value === 'true' || value === '1';
  res.json(await previewAudience(req.params.id, {
    sequenceId: sequenceId || undefined,
    leadIds: parseIds(leadIds),
    companyIds: parseIds(companyIds),
    includeCompanyIds: parseIds(includeCompanyIds),
    includeLeadIds: parseIds(includeLeadIds),
    excludeCompanyIds: parseIds(excludeCompanyIds),
    excludeLeadIds: parseIds(excludeLeadIds),
    importedCampaignIds: parseIds(importedCampaignIds),
    importCampaign: parseBool(importCampaign),
    full: parseBool(full),
  }));
}));

router.get('/projects/:id/sequences', asyncRoute(async (req, res) => {
  res.json(await listSequences(req.params.id));
}));

router.post('/projects/:id/sequences', asyncRoute(async (req, res) => {
  const seq = await createSequence(req.params.id, req.body || {});
  res.status(201).json(seq);
}));

router.patch('/sequences/:id', asyncRoute(async (req, res) => {
  res.json(await updateSequence(req.params.id, req.body || {}));
}));

router.delete('/sequences/:id', asyncRoute(async (req, res) => {
  res.json(await deleteSequence(req.params.id, getActor(req)));
}));

router.post('/sequences/:id/restore', asyncRoute(async (req, res) => {
  res.json(await restoreSequence(req.params.id, getActor(req)));
}));

router.post('/sequences/bulk-delete', asyncRoute(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (!ids.length) {
    return res.status(400).json({ message: 'ids array is required.' });
  }
  res.json(await deleteSequences(ids));
}));

router.post('/projects/:id/enroll', asyncRoute(async (req, res) => {
  const { sequenceId, confirmEnrollment, leadIds, companyIds } = req.body || {};
  if (!sequenceId) {
    return res.status(400).json({ message: 'sequenceId is required.' });
  }
  const result = await enrollProjectLeads(req.params.id, sequenceId, {
    confirmEnrollment,
    leadIds,
    companyIds,
    includeCompanyIds: req.body?.includeCompanyIds,
    includeLeadIds: req.body?.includeLeadIds,
    excludeCompanyIds: req.body?.excludeCompanyIds,
    excludeLeadIds: req.body?.excludeLeadIds,
    importedCampaignIds: req.body?.importedCampaignIds,
    importCampaign: req.body?.importCampaign,
    actor: getActor(req),
  });
  res.json(result);
}));

router.post('/sequences/:id/launch', asyncRoute(async (req, res) => {
  const result = await launchSequence(req.params.id, {
    confirmEnrollment: req.body?.confirmEnrollment,
    restart: req.body?.restart === true,
    leadIds: req.body?.leadIds,
    companyIds: req.body?.companyIds,
    includeCompanyIds: req.body?.includeCompanyIds,
    includeLeadIds: req.body?.includeLeadIds,
    excludeCompanyIds: req.body?.excludeCompanyIds,
    excludeLeadIds: req.body?.excludeLeadIds,
    importedCampaignIds: req.body?.importedCampaignIds,
    importCampaign: req.body?.importCampaign,
    actor: getActor(req),
  });
  res.json(result);
}));

router.get('/email/launch-batches', asyncRoute(async (req, res) => {
  res.json(await listLaunchBatches({
    sequenceId: req.query.sequenceId,
    launchBatchId: req.query.batch,
    page: req.query.page,
    limit: req.query.limit,
  }));
}));

router.get('/email/launch-batches/:batchId/jobs', asyncRoute(async (req, res) => {
  res.json(await listLaunchBatchJobs(req.params.batchId, {
    status: req.query.status,
  }));
}));

router.post('/email/launch-batches/:batchId/remove', asyncRoute(async (req, res) => {
  const jobIds = Array.isArray(req.body?.jobIds) ? req.body.jobIds : [];
  const all = req.body?.all === true;
  res.json(await removeLaunchBatchJobs(req.params.batchId, { jobIds, all }));
}));

router.post('/email/launch-batches/:batchId/send', asyncRoute(async (req, res) => {
  res.json(await sendLaunchBatchJobs(req.params.batchId, {
    maxCount: req.body?.maxCount,
    background: req.body?.background,
  }));
}));

router.get('/email/launch-batches/:batchId/send-status', asyncRoute(async (req, res) => {
  res.json(await getLaunchBatchSendProgress(req.params.batchId));
}));

router.get('/audience-preview', asyncRoute(async (req, res) => {
  const {
    sequenceId,
    leadIds,
    companyIds,
    includeCompanyIds,
    includeLeadIds,
    excludeCompanyIds,
    excludeLeadIds,
    importedCampaignIds,
    importCampaign,
    full,
  } = req.query || {};
  const parseIds = (value) => (value ? String(value).split(',').filter(Boolean) : []);
  const parseBool = (value) => value === 'true' || value === '1';
  res.json(await previewAudience(null, {
    sequenceId: sequenceId || undefined,
    leadIds: parseIds(leadIds),
    companyIds: parseIds(companyIds),
    includeCompanyIds: parseIds(includeCompanyIds),
    includeLeadIds: parseIds(includeLeadIds),
    excludeCompanyIds: parseIds(excludeCompanyIds),
    excludeLeadIds: parseIds(excludeLeadIds),
    importedCampaignIds: parseIds(importedCampaignIds),
    importCampaign: parseBool(importCampaign),
    full: parseBool(full),
  }));
}));

router.post('/sequences', asyncRoute(async (req, res) => {
  const seq = await createSequence(null, req.body || {});
  res.status(201).json(seq);
}));

router.post('/sequences/:id/reset-enrollments', asyncRoute(async (req, res) => {
  const leadIds = Array.isArray(req.body?.leadIds) ? req.body.leadIds : [];
  res.json(await resetSequenceEnrollments(req.params.id, leadIds));
}));

router.get('/leads/:id', asyncRoute(async (req, res) => {
  res.json(await getLeadById(req.params.id));
}));

router.patch('/leads/:id', asyncRoute(async (req, res) => {
  res.json(await updateLeadById(req.params.id, req.body || {}, getActor(req)));
}));

router.post('/leads/:id/key-relationship/confirm', asyncRoute(async (req, res) => {
  res.json(await setKeyRelationshipConfirmation(req.params.id, true, getActor(req)));
}));

router.post('/leads/:id/key-relationship/remove', asyncRoute(async (req, res) => {
  res.json(await setKeyRelationshipConfirmation(req.params.id, false, getActor(req)));
}));

router.post('/campaigns/:campaignId/contacts/:personId/focus', asyncRoute(async (req, res) => {
  res.json(await selectCampaignContactFocus({ campaignId: req.params.campaignId, personId: req.params.personId, actor: getActor(req) }));
}));

router.delete('/leads/:id', asyncRoute(async (req, res) => {
  res.json(await deleteLead(req.params.id, getActor(req)));
}));

router.post('/leads/:id/restore', asyncRoute(async (req, res) => {
  res.json(await restoreLead(req.params.id, getActor(req)));
}));

router.post('/leads/bulk-delete', asyncRoute(async (req, res) => {
  const ids = req.body?.ids || [];
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ message: 'ids array is required.' });
  }
  res.json(await deleteLeads(ids, getActor(req)));
}));

router.get('/sent-emails', asyncRoute(async (req, res) => {
  res.json(await listSentEmails({
    limit: req.query.limit,
    page: req.query.page,
    campaignId: req.query.campaignId,
    sequenceId: req.query.sequenceId,
    q: req.query.q || req.query.search,
    repliedOnly: req.query.repliedOnly,
    includeAllStatuses: req.query.includeAllStatuses,
  }));
}));

router.get('/sent-emails/:id', asyncRoute(async (req, res) => {
  res.json(await getSentEmail(req.params.id));
}));

router.get('/send-delivery/issues', asyncRoute(async (req, res) => {
  res.json(await listSendDeliveryIssues({
    limit: req.query.limit,
    page: req.query.page,
    campaignId: req.query.campaignId,
    sequenceId: req.query.sequenceId,
    status: req.query.status || req.query.view,
    q: req.query.q || req.query.search,
  }));
}));

router.get('/sent-emails/:id/thread', asyncRoute(async (req, res) => {
  const msgRes = await db.query(
    `SELECT m.id, m.conversation_id, m.direction, m.subject, m.body, m.occurred_at,
            p.id AS person_id, p.display_name AS poc_name, por.title AS designation,
            o.canonical_name AS company_name,
            COALESCE(pcm.normalized_value, cp.endpoint_value_snapshot) AS recipient_email
     FROM messages m
     JOIN conversations conv ON m.conversation_id = conv.id
     LEFT JOIN campaign_contacts cc ON cc.id = conv.campaign_contact_id
     LEFT JOIN LATERAL (
       SELECT person_contact_method_id, endpoint_value_snapshot
       FROM conversation_participants
       WHERE conversation_id = conv.id AND participant_role = 'recipient'
       ORDER BY id LIMIT 1
     ) cp ON TRUE
     LEFT JOIN person_contact_methods pcm ON cp.person_contact_method_id = pcm.id
     LEFT JOIN people p ON pcm.person_id = p.id
     LEFT JOIN person_organization_roles por ON por.id = cc.role_id
     LEFT JOIN campaign_accounts ca ON ca.id = cc.campaign_account_id
     LEFT JOIN organizations o ON o.id = ca.organization_id
     WHERE m.id::text = $1 OR conv.id::text = $1 LIMIT 1`,
    [String(req.params.id)]
  );

  if (!msgRes.rows.length) return res.status(404).json({ error: 'Email not found.' });
  const msg = msgRes.rows[0];

  const threadRes = await db.query(
    `SELECT m.id, m.direction, m.subject, m.body, m.occurred_at AS timestamp
     FROM messages m
     WHERE m.conversation_id = $1::uuid
       AND COALESCE(m.is_migration_duplicate, false) = false
     ORDER BY m.occurred_at ASC`,
    [msg.conversation_id]
  );

  const history = threadRes.rows.map((m) => ({
    type: m.direction,
    subject: m.subject || '',
    body: m.body || '',
    timestamp: m.timestamp,
    messageId: m.id,
  }));

  res.json({
    threadId: msg.conversation_id,
    leadId: msg.person_id,
    pocName: msg.poc_name || msg.recipient_email,
    designation: msg.designation || '',
    companyName: msg.company_name || '',
    phoneNumber: '',
    recipientEmail: msg.recipient_email,
    subject: msg.subject,
    history,
  });
}));

router.post('/sent-emails/:id/reply', asyncRoute(async (req, res) => {
  const { body } = req.body;
  if (!body || !String(body).trim()) {
    return res.status(400).json({ error: 'Reply body is required.' });
  }

  const msgRes = await db.query(
    `SELECT m.id, m.conversation_id, m.subject,
            cp.endpoint_value_snapshot AS recipient_email, conv.campaign_id
     FROM messages m
     JOIN conversations conv ON m.conversation_id = conv.id
     LEFT JOIN LATERAL (
       SELECT endpoint_value_snapshot FROM conversation_participants
       WHERE conversation_id = conv.id AND participant_role = 'recipient'
       ORDER BY id LIMIT 1
     ) cp ON TRUE
     WHERE m.id::text = $1 LIMIT 1`,
    [String(req.params.id)]
  );

  if (!msgRes.rows.length) return res.status(404).json({ error: 'Email not found.' });
  const job = msgRes.rows[0];
  if (!job.recipient_email) return res.status(409).json({ error: 'This thread has no verified recipient email.' });

  const { fromEmail, fromName } = getFromIdentity(null);

  let subject = job.subject || 'Follow up';
  if (!subject.toLowerCase().startsWith('re:')) {
    subject = `Re: ${subject}`;
  }

  const result = await sendAuthenticatedMail({
    fromName,
    fromEmail,
    to: job.recipient_email,
    subject,
    text: body,
    html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.5;color:#333;">
      <p>${String(body).replace(/\n/g, '<br>')}</p>
    </div>`,
  });

  const messageId = String(result?.messageId || '').trim();

  const inserted = await db.query(
    `INSERT INTO messages (conversation_id, direction, external_message_id, subject, body, delivery_state, occurred_at)
     VALUES ($1::uuid, 'outbound', $2, $3, $4, 'sent', CURRENT_TIMESTAMP)
     RETURNING id, direction, subject, body, occurred_at AS timestamp`,
    [job.conversation_id, messageId, subject, body]
  );

  res.json({ success: true, messageId, replyMessage: { ...inserted.rows[0], type: inserted.rows[0].direction } });
}));

router.get('/inbox', asyncRoute(async (req, res) => {
  res.json(await listInboxThreads({ limit: req.query.limit, campaignId: req.query.campaignId }));
}));

router.get('/inbox/:threadId', asyncRoute(async (req, res) => {
  res.json(await getInboxThread(req.params.threadId));
}));
router.get('/communications/:conversationId/job-workspace', asyncRoute(async (req, res) => {
  res.json(await getCommunicationJobWorkspace(req.params.conversationId, req.query || {}, getActor(req)));
}));
router.get('/communications-workspace', asyncRoute(async (req, res) => {
  res.json(await getCommunicationsWorkspace(req.query || {}, getActor(req)));
}));
router.post('/communications-workspace/reviews/:reviewItemId/resolve', asyncRoute(async (req, res) => {
  res.json(await resolveReplyReview(req.params.reviewItemId, req.body || {}, getActor(req)));
}));
router.post('/communications-workspace/reviews/:reviewItemId/assign', asyncRoute(async (req, res) => {
  res.json(await assignReplyReview(req.params.reviewItemId, req.body?.ownerUserId, getActor(req)));
}));
router.post('/communications/:conversationId/job-actions', asyncRoute(async (req, res) => {
  res.status(201).json(await createCommunicationJobAction(req.params.conversationId, req.body || {}, getActor(req)));
}));

router.post('/inbox/sync', asyncRoute(async (_req, res) => {
  res.json(await syncImapMailbox());
}));

router.post('/inbox/:threadId/blacklist', asyncRoute(async (req, res) => {
  const thread = await getInboxThread(req.params.threadId);
  res.json(await blacklistLead(thread.leadId));
}));

router.post('/inbox/:threadId/won', asyncRoute(async (req, res) => {
  const thread = await getInboxThread(req.params.threadId);
  res.json(await markLeadWon(thread.leadId, req.body || {}));
}));

router.get('/analytics/global', asyncRoute(async (_req, res) => {
  res.json(await getGlobalAnalytics());
}));

router.get('/analytics/projects/:id', asyncRoute(async (req, res) => {
  res.json(await getProjectAnalytics(req.params.id));
}));

router.get('/finance/overview', asyncRoute(async (_req, res) => {
  res.json(await getFinanceOverview());
}));

router.post('/finance/revenue', asyncRoute(async (req, res) => {
  res.json(await logRevenue(req.body || {}));
}));

router.post('/finance/overhead', asyncRoute(async (req, res) => {
  res.json(await updateOverhead(req.body || {}));
}));

router.get('/search', asyncRoute(async (req, res) => {
  res.json(await globalSearch(req.query.q, { limit: req.query.limit }));
}));

// Global Directories & In-depth Analytics Endpoints
router.get('/leads', asyncRoute(async (req, res) => {
  res.json(await listAllLeads(req.query));
}));

router.post('/leads', asyncRoute(async (req, res) => {
  res.status(201).json(await createStandaloneLead(req.body || {}));
}));

router.get('/leads/:id', asyncRoute(async (req, res) => {
  res.json(await getLeadById(req.params.id));
}));

router.get('/leads/:id/timeline', asyncRoute(async (req, res) => {
  res.json(await getLeadTimeline(req.params.id));
}));

router.post('/leads/:id/interactions', asyncRoute(async (req, res) => {
  res.status(201).json(await createInteraction(req.params.id, req.body || {}, req.admin?.username));
}));

router.patch('/interactions/:id', asyncRoute(async (req, res) => {
  res.json(await updateInteraction(req.params.id, req.body || {}, req.admin?.username));
}));

router.delete('/interactions/:id', asyncRoute(async (req, res) => {
  res.json(await deleteInteraction(req.params.id, getActor(req)));
}));

router.post('/interactions/:id/restore', asyncRoute(async (req, res) => {
  res.json(await restoreInteraction(req.params.id, getActor(req)));
}));

router.get('/companies', asyncRoute(async (req, res) => {
  res.json(await listAllCompanies(req.query));
}));

router.post('/companies', asyncRoute(async (req, res) => {
  res.status(201).json(await createCompany(req.body || {}));
}));

router.get('/companies/:id/timeline', asyncRoute(async (req, res) => {
  res.json(await getCompanyTimeline(req.params.id));
}));

router.get('/companies/:id/workspace', asyncRoute(async (req, res) => {
  res.json(await getAccountWorkspace(req.params.id, getActor(req)));
}));

router.get('/companies/:id', asyncRoute(async (req, res) => {
  res.json(await getAccountWorkspace(req.params.id, getActor(req)));
}));

router.patch('/companies/:id', asyncRoute(async (req, res) => {
  res.json(await updateCompanyDetails(req.params.id, req.body || {}));
}));

router.delete('/companies/:id', asyncRoute(async (req, res) => {
  res.json(await deleteCompany(req.params.id, getActor(req)));
}));

router.post('/companies/:id/restore', asyncRoute(async (req, res) => {
  res.json(await restoreCompany(req.params.id, getActor(req)));
}));

router.post('/companies/bulk-delete', asyncRoute(async (req, res) => {
  const ids = req.body?.ids || [];
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ message: 'ids array is required.' });
  }
  res.json(await deleteCompanies(ids, getActor(req)));
}));

router.post('/companies/:id/leads', asyncRoute(async (req, res) => {
  res.json(await addLeadToCompany(req.params.id, req.body || {}));
}));

router.get('/analytics/comprehensive', asyncRoute(async (req, res) => {
  const force = req.query.forceRefresh === 'true' || req.query.refresh === 'true';
  res.json(await getComprehensiveAnalytics(force));
}));

router.get('/daily-reviews/today', asyncRoute(async (_req, res) => {
  res.json(await getTodayReviewStatus());
}));

router.post('/daily-reviews/complete', asyncRoute(async (req, res) => {
  const { section } = req.body || {};
  const user = req.user || req.admin || { username: 'admin' };
  res.json(await completeDailyReview(section, user));
}));

router.get('/daily-reviews/month', asyncRoute(async (req, res) => {
  const { year, month } = req.query;
  res.json(await getMonthlyReviewHistory(year, month));
}));

router.get('/dashboard/working-view', asyncRoute(async (_req, res) => {
  res.json(await getDashboardWorkingViewData());
}));

router.get('/sales/pipeline-config', asyncRoute(async (_req, res) => {
  res.json(await getPipelineConfig());
}));

router.patch('/sales/pipeline-config', asyncRoute(async (req, res) => {
  res.json(await updatePipelineConfig(req.body || {}, req.admin?.username));
}));

const handleListOngoingJobs = asyncRoute(async (req, res) => {
  const query = { ...req.query };
  if (req.user?.role === 'designer') {
    query._designerUser = req.user;
  }
  const result = await listOngoingJobs(query);
  if (req.user?.role === 'designer') {
    result.items = result.items.map((item) => ({
      ...item,
      valueAed: undefined,
      probability: undefined,
      primaryLeadId: undefined,
      stakeholderLeadIds: undefined,
      notes: undefined,
      budgetBand: undefined,
    }));
  }
  res.json(result);
});

router.get('/sales/ongoing-jobs', handleListOngoingJobs);
router.get('/sales/opportunities', handleListOngoingJobs);

const handleGetOngoingJob = asyncRoute(async (req, res) => {
  res.json(await getOngoingJob(req.params.id));
});
router.get('/sales/ongoing-jobs/:id', handleGetOngoingJob);
router.get('/sales/opportunities/:id', handleGetOngoingJob);

const handleGetOngoingJobTimeline = asyncRoute(async (req, res) => {
  res.json(await getOngoingJobTimeline(req.params.id));
});
router.get('/sales/ongoing-jobs/:id/timeline', handleGetOngoingJobTimeline);
router.get('/sales/opportunities/:id/timeline', handleGetOngoingJobTimeline);

const handleCreateOngoingJob = asyncRoute(async (req, res) => {
  const job = await createOngoingJob(req.body || {}, req.admin?.username);
  res.status(201).json(job);
});
router.post('/sales/ongoing-jobs', handleCreateOngoingJob);
router.post('/sales/opportunities', handleCreateOngoingJob);

const handleUpdateOngoingJob = asyncRoute(async (req, res) => {
  res.json(await updateOngoingJob(req.params.id, req.body || {}, req.admin?.username));
});
router.patch('/sales/ongoing-jobs/:id', handleUpdateOngoingJob);
router.patch('/sales/opportunities/:id', handleUpdateOngoingJob);

const handleDeleteOngoingJob = asyncRoute(async (req, res) => {
  res.json(await deleteOngoingJob(req.params.id, getActor(req)));
});
router.delete('/sales/ongoing-jobs/:id', handleDeleteOngoingJob);
router.delete('/sales/opportunities/:id', handleDeleteOngoingJob);

const handleRestoreOngoingJob = asyncRoute(async (req, res) => {
  res.json(await restoreOngoingJob(req.params.id, getActor(req)));
});
router.post('/sales/ongoing-jobs/:id/restore', handleRestoreOngoingJob);
router.post('/sales/opportunities/:id/restore', handleRestoreOngoingJob);

const handleBulkDeleteOngoingJobs = asyncRoute(async (req, res) => {
  const ids = req.body?.ids || [];
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ message: 'ids array is required.' });
  }
  res.json(await deleteOngoingJobs(ids, getActor(req)));
});
router.post('/sales/ongoing-jobs/bulk-delete', handleBulkDeleteOngoingJobs);
router.post('/sales/opportunities/bulk-delete', handleBulkDeleteOngoingJobs);

router.get('/sales/ongoing-jobs/:id/artifacts', asyncRoute(async (req, res) => {
  res.json(await getJobCommercialArtifacts(req.params.id));
}));
router.post('/sales/ongoing-jobs/:id/artifacts/designs', asyncRoute(async (req, res) => {
  res.status(201).json(await createDesignSet(req.params.id, req.body || {}, getActor(req)));
}));
router.post('/sales/ongoing-jobs/:id/artifacts/designs/:designSetId/versions', jobArtifactUpload.single('file'), asyncRoute(async (req, res) => {
  res.status(201).json(await addDesignVersion(req.params.id, req.params.designSetId, req.body || {}, req.file, getActor(req)));
}));
router.post('/sales/ongoing-jobs/:id/artifacts/quotations', asyncRoute(async (req, res) => {
  res.status(201).json(await createQuote(req.params.id, req.body || {}, getActor(req)));
}));
router.post('/sales/ongoing-jobs/:id/artifacts/quotations/:quoteId/versions', jobArtifactUpload.single('file'), asyncRoute(async (req, res) => {
  res.status(201).json(await addQuoteVersion(req.params.id, req.params.quoteId, req.body || {}, req.file, getActor(req)));
}));
router.post('/sales/ongoing-jobs/:id/artifacts/decisions', asyncRoute(async (req, res) => {
  res.status(201).json(await recordArtifactDecision(req.params.id, req.body || {}, getActor(req)));
}));

router.get('/inventory', asyncRoute(async (req, res) => {
  res.json(await getInventoryWorkspace());
}));
router.post('/inventory/items', asyncRoute(async (req, res) => {
  res.status(201).json(await createInventoryItem(req.body || {}, getActor(req)));
}));
router.post('/inventory/locations', asyncRoute(async (req, res) => {
  res.status(201).json(await createInventoryLocation(req.body || {}, getActor(req)));
}));
router.post('/inventory/assets', asyncRoute(async (req, res) => {
  res.status(201).json(await createInventoryAsset(req.body || {}, getActor(req)));
}));
router.post('/inventory/movements', asyncRoute(async (req, res) => {
  res.status(201).json(await recordInventoryMovement(req.body || {}, getActor(req)));
}));
router.post('/inventory/reservations', asyncRoute(async (req, res) => {
  res.status(201).json(await createInventoryReservation(req.body || {}, getActor(req)));
}));
router.post('/inventory/packing-lists', asyncRoute(async (req, res) => {
  res.status(201).json(await createPackingList(req.body || {}, getActor(req)));
}));
router.post('/inventory/packing-lists/:packingListId/lines', asyncRoute(async (req, res) => {
  res.status(201).json(await addPackingLine(req.params.packingListId, req.body || {}, getActor(req)));
}));
router.patch('/inventory/packing-lists/:packingListId/status', asyncRoute(async (req, res) => {
  res.json(await updatePackingListStatus(req.params.packingListId, req.body?.status, getActor(req)));
}));

router.get('/sales/ongoing-jobs/:id/closeout', asyncRoute(async (req, res) => {
  res.json(await getJobCloseout(req.params.id));
}));
router.patch('/sales/ongoing-jobs/:id/closeout/handover', asyncRoute(async (req, res) => {
  res.json(await saveJobHandover(req.params.id, req.body || {}, getActor(req)));
}));
router.post('/sales/ongoing-jobs/:id/closeout/evidence', jobMemoryUpload.array('files', 20), asyncRoute(async (req, res) => {
  res.status(201).json(await uploadCloseoutEvidence(req.params.id, req.body || {}, req.files || [], getActor(req)));
}));

router.get('/sales/tasks', asyncRoute(async (req, res) => {
  const query = { ...req.query };
  if (req.user?.role === 'designer') query.mine = '1';
  query.currentUserId = req.user?.userId || null;
  res.json(await listUnifiedTasks(query));
}));

router.post('/sales/tasks', asyncRoute(async (req, res) => {
  res.status(201).json(await createUnifiedTask(req.body || {}, getActor(req)));
}));

router.get('/sales/tasks/:id', asyncRoute(async (req, res) => {
  res.json(await getUnifiedTask(req.params.id));
}));

router.patch('/sales/tasks/:id', asyncRoute(async (req, res) => {
  res.json(await updateUnifiedTask(req.params.id, req.body || {}, getActor(req)));
}));

router.get('/sales/tasks/context/job/:jobId', asyncRoute(async (req, res) => {
  res.json(await getTaskJobContext(req.params.jobId));
}));

router.post('/sales/tasks/:id/evidence', taskEvidenceUpload.single('file'), asyncRoute(async (req, res) => {
  res.status(201).json(await addTaskEvidence(req.params.id, req.body || {}, req.file, getActor(req)));
}));

router.delete('/sales/tasks/:id', asyncRoute(async (req, res) => {
  res.json(await deleteTask(req.params.id, getActor(req)));
}));

router.post('/sales/tasks/:id/complete-reply-review', asyncRoute(async (req, res) => {
  const result = await completeReplyReview(req.params.id, { ...req.body, actor: getActor(req) });
  res.json(result);
}));

router.post('/sales/tasks/:id/restore', asyncRoute(async (req, res) => {
  res.json(await restoreTask(req.params.id, getActor(req)));
}));

router.post('/sales/tasks/bulk-delete', asyncRoute(async (req, res) => {
  const ids = req.body?.ids || [];
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ message: 'ids array is required.' });
  }
  res.json(await deleteTasks(ids, getActor(req)));
}));

const handleListCompletedJobs = asyncRoute(async (req, res) => {
  res.json(await listCompletedJobs(req.query));
});
router.get('/sales/completed-jobs', handleListCompletedJobs);
router.get('/sales/jobs', handleListCompletedJobs);

const handleGetCompletedJob = asyncRoute(async (req, res) => {
  res.json(await getCompletedJob(req.params.id));
});
router.get('/sales/completed-jobs/:id', handleGetCompletedJob);
router.get('/sales/jobs/:id', handleGetCompletedJob);

const handleCreateCompletedJob = asyncRoute(async (req, res) => {
  res.status(201).json(await createCompletedJob(req.body || {}));
});
router.post('/sales/completed-jobs', handleCreateCompletedJob);
router.post('/sales/jobs', handleCreateCompletedJob);

const handleUpdateCompletedJob = asyncRoute(async (req, res) => {
  res.json(await updateCompletedJob(req.params.id, req.body || {}));
});
router.patch('/sales/completed-jobs/:id', handleUpdateCompletedJob);
router.patch('/sales/jobs/:id', handleUpdateCompletedJob);

const handleDeleteCompletedJob = asyncRoute(async (req, res) => {
  res.json(await deleteCompletedJob(req.params.id, getActor(req)));
});
router.delete('/sales/completed-jobs/:id', handleDeleteCompletedJob);
router.delete('/sales/jobs/:id', handleDeleteCompletedJob);

const handleRestoreCompletedJob = asyncRoute(async (req, res) => {
  res.json(await restoreCompletedJob(req.params.id, getActor(req)));
});
router.post('/sales/completed-jobs/:id/restore', handleRestoreCompletedJob);
router.post('/sales/jobs/:id/restore', handleRestoreCompletedJob);

const handleSeedCompletedJobs = asyncRoute(async (_req, res) => {
  await runJobSeeding();
  res.json({ ok: true });
});
router.post('/sales/completed-jobs/seed', handleSeedCompletedJobs);
router.post('/sales/jobs/seed', handleSeedCompletedJobs);

router.get('/users', asyncRoute(async (_req, res) => {
  res.json(await listUsers());
}));

router.get('/users/active', asyncRoute(async (_req, res) => {
  res.json(await listActiveUsers());
}));

router.get('/users/roles', asyncRoute(async (_req, res) => {
  res.json(getRoleOptions());
}));

router.get('/users/email-status', asyncRoute(async (_req, res) => {
  res.json(await getEmailDeliveryStatus());
}));

router.get('/users/:id/activity', asyncRoute(async (req, res) => {
  const actor = getActor(req);
  const isSelf = actor.userId && String(actor.userId) === String(req.params.id);
  if (!isSelf && !userHasPermission(req.user, 'audit:read')) {
    return res.status(403).json({ message: 'You do not have permission to view this activity.' });
  }
  const [feed, summary] = await Promise.all([
    listAuditLogs({ ...req.query, userId: req.params.id }),
    getUserActivitySummary(req.params.id),
  ]);
  res.json({ ...feed, summary });
}));

router.get('/users/:id', asyncRoute(async (req, res) => {
  res.json(await getUserById(req.params.id));
}));

router.post('/users', asyncRoute(async (req, res) => {
  const { sendWelcomeEmail, ...body } = req.body || {};
  const actor = getActor(req);
  const user = await createUser(body, actor);
  let emailed = false;
  if (sendWelcomeEmail && body.password) {
    await sendUserCredentialsEmail({ user, password: body.password, welcome: true });
    emailed = true;
    await writeAuditLog({
      userId: actor.userId,
      userDisplayName: actor.displayName,
      action: 'update',
      resource: 'user',
      resourceId: user.id,
      summary: `Emailed welcome credentials to ${user.displayName}`,
      metadata: { emailed: true },
    }).catch(() => {});
  }
  await writeAuditLog({
    userId: actor.userId,
    userDisplayName: actor.displayName,
    action: 'create',
    resource: 'user',
    resourceId: user.id,
    summary: `Created user ${user.displayName}`,
    metadata: { emailed },
  }).catch(() => {});
  res.status(201).json({ ...user, emailed });
}));

router.patch('/users/:id', asyncRoute(async (req, res) => {
  const user = await updateUser(req.params.id, req.body || {});
  res.json(user);
}));

router.post('/users/:id/send-credentials', asyncRoute(async (req, res) => {
  const actor = getActor(req);
  const result = await issueUserCredentials(req.params.id, {
    password: req.body?.password,
    sendEmail: true,
    mustChangePassword: true,
    welcome: Boolean(req.body?.welcome),
  });
  await writeAuditLog({
    userId: actor.userId,
    userDisplayName: actor.displayName,
    action: 'update',
    resource: 'user',
    resourceId: req.params.id,
    summary: `Emailed login credentials to ${result.user.displayName}`,
    metadata: { emailed: true },
  }).catch(() => {});
  res.json(result);
}));

router.post('/users/:id/reset-password', asyncRoute(async (req, res) => {
  const actor = getActor(req);
  const sendEmail = req.body?.sendEmail !== false;
  const result = await issueUserCredentials(req.params.id, {
    password: req.body?.password,
    sendEmail,
    mustChangePassword: true,
    welcome: false,
  });
  await writeAuditLog({
    userId: actor.userId,
    userDisplayName: actor.displayName,
    action: 'update',
    resource: 'user',
    resourceId: req.params.id,
    summary: sendEmail
      ? `Reset password and emailed credentials to ${result.user.displayName}`
      : `Reset password for ${result.user.displayName}`,
    metadata: { emailed: result.emailed },
  }).catch(() => {});
  res.json(result);
}));

router.patch('/users/:id/password', asyncRoute(async (req, res) => {
  const actor = getActor(req);
  const isSelf = actor.userId && String(actor.userId) === String(req.params.id);
  if (!isSelf && !userHasPermission(req.user, 'users:manage')) {
    return res.status(403).json({ message: 'You do not have permission to reset this password.' });
  }
  await setUserPassword(req.params.id, req.body?.password);
  res.json({ ok: true });
}));

router.patch('/profile/password', asyncRoute(async (req, res) => {
  const actor = getActor(req);
  if (!actor.userId) {
    return res.status(400).json({ message: 'Password change is only available for database users.' });
  }
  await changeOwnPassword(actor.userId, req.body?.currentPassword, req.body?.newPassword);
  res.json({ ok: true });
}));

router.get('/audit-log', asyncRoute(async (req, res) => {
  res.json(await listAuditLogs(req.query));
}));

router.get('/audit-log/:id', asyncRoute(async (req, res) => {
  res.json(await getAuditLogById(req.params.id));
}));

router.get('/revisions/recent', asyncRoute(async (req, res) => {
  res.json(await listRecentRevisions({ limit: req.query.limit }));
}));

router.get('/revisions/entry/:revisionId', asyncRoute(async (req, res) => {
  res.json(await getRevisionById(req.params.revisionId));
}));

router.get('/revisions/:resourceType/:resourceId', asyncRoute(async (req, res) => {
  res.json(await listRevisions(req.params.resourceType, req.params.resourceId, req.query));
}));

router.post('/revisions/:revisionId/rollback', asyncRoute(async (req, res) => {
  const restored = await rollbackToRevision(req.params.revisionId, getActor(req));
  res.json(restored);
}));

router.post('/:resourceType/:id/restore', asyncRoute(async (req, res) => {
  const { resourceType, id } = req.params;
  const actor = getActor(req);
  if (resourceType === 'task') {
    return res.json(await restoreTask(id, actor));
  }
  if (resourceType === 'interaction' || resourceType === 'interactions') {
    return res.json(await restoreInteraction(id, actor));
  }
  if (resourceType === 'sequence' || resourceType === 'sequences') {
    return res.json(await restoreSequence(id, actor));
  }
  if (resourceType === 'lead' || resourceType === 'leads') {
    return res.json(await restoreLead(id, actor));
  }
  if (resourceType === 'company' || resourceType === 'companies') {
    return res.json(await restoreCompany(id, actor));
  }
  if (resourceType === 'opportunity' || resourceType === 'opportunities') {
    return res.json(await restoreOpportunity(id, actor));
  }
  if (resourceType === 'project' || resourceType === 'projects') {
    return res.json(await restoreProject(id, actor));
  }
  const modelMap = { task: Task, interaction: ContactInteraction, interactions: ContactInteraction };
  const Model = modelMap[resourceType];
  if (!Model) {
    return res.status(400).json({ message: `Restore not supported for ${resourceType}.` });
  }
  return res.json(await restoreRecord({ Model, resourceType, id, actor }));
}));

router.get('/system-settings', asyncRoute(async (_req, res) => {
  res.json(await getSystemSettings());
}));

router.patch('/system-settings', asyncRoute(async (req, res) => {
  res.json(await updateSystemSettings(req.body || {}));
}));

router.get('/resend/metrics', asyncRoute(async (req, res) => {
  const { status, search, limit, campaignId } = req.query || {};
  res.json(await getResendMetrics({
    status: status ? String(status) : undefined,
    search: search ? String(search) : undefined,
    limit: limit ? Number(limit) : undefined,
    campaignId: campaignId ? String(campaignId) : undefined,
  }));
}));

router.get('/vendor-performance', asyncRoute(async (req, res) => {
  const { campaignId } = req.query || {};
  res.json(await computeVendorMatrix(campaignId ? String(campaignId) : null));
}));

router.get('/projects/:projectId/queue', asyncRoute(async (req, res) => {
  const { projectId } = req.params;
  const { status } = req.query;
  const items = await listCampaignQueueJobs(projectId, {
    status: status ? String(status) : undefined,
  });
  res.json({ items, total: items.length });
}));

router.post('/send-jobs/:jobId/send', asyncRoute(async (req, res) => {
  const { jobId } = req.params;
  const updatedJob = await sendJobNow(jobId);
  res.json(updatedJob);
}));

router.delete('/send-jobs/:jobId', asyncRoute(async (req, res) => {
  res.json(await removeSendJob(req.params.jobId));
}));

router.post('/projects/:projectId/queue/remove', asyncRoute(async (req, res) => {
  const { projectId } = req.params;
  const jobIds = Array.isArray(req.body?.jobIds) ? req.body.jobIds : [];
  const all = req.body?.all === true;
  res.json(await removeCampaignQueueJobs(projectId, { jobIds, all }));
}));

router.post('/projects/:projectId/queue/send', asyncRoute(async (req, res) => {
  res.json(await sendCampaignQueueJobs(req.params.projectId, {
    maxCount: req.body?.maxCount,
  }));
}));

router.get('/workspace/summary', asyncRoute(async (_req, res) => {
  res.json(await getWorkspaceSummary());
}));

export default router;
