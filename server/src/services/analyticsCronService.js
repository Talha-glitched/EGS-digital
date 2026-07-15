import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { Lead } from '../models/Lead.js';
import { Company } from '../models/Company.js';
import { SequenceEnrollment } from '../models/SequenceEnrollment.js';
import { AnalyticsSnapshot } from '../models/AnalyticsSnapshot.js';
import { RevenueEntry } from '../models/RevenueEntry.js';

const VENDORS = ['Apollo', 'Hunter', 'Lusha', 'Manual'];

export async function computeVendorMatrix(campaignId) {
  const matrix = [];

  for (const source of VENDORS) {
    const leads = await Lead.find({
      campaignId,
      deletedAt: null,
      $or: [{ primarySource: source }, { sources: source }],
    }).lean();

    if (!leads.length) {
      matrix.push({ source, leadsCount: 0, opens: 0, bounces: 0, replies: 0, revenue: 0 });
      continue;
    }

    const leadIds = leads.map((l) => l._id);
    const opens = leads.reduce((sum, l) => sum + (l.trackingMetrics?.totalOpenCount || 0), 0);
    const bounces = leads.filter((l) => l.deliveryStatus === 'Bounced / Invalid').length;
    const replies = leads.filter((l) => l.deliveryStatus === 'Replied').length;

    const revenueAgg = await RevenueEntry.aggregate([
      { $match: { campaignId, leadId: { $in: leadIds } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    matrix.push({
      source,
      leadsCount: leads.length,
      opens,
      bounces,
      replies,
      revenue: revenueAgg[0]?.total || 0,
    });
  }

  return matrix;
}

async function refreshCampaignCoverageCounters(project) {
  if (!project?._id) return project;

  const [companyCount, pocAgg] = await Promise.all([
    Company.countDocuments({ projectsAssociated: project._id, deletedAt: null }),
    Lead.aggregate([
      { $match: { campaignId: project._id, deletedAt: null } },
      { $group: { _id: '$companyId' } },
      { $count: 'total' },
    ]),
  ]);

  project.targetCompaniesCount = companyCount;
  project.companiesWithPocsFound = pocAgg[0]?.total || 0;
  return project;
}

export async function computeProjectSnapshot(projectId) {
  const project = await ProjectCampaign.findById(projectId);
  if (!project || project.deletedAt) return null;

  await refreshCampaignCoverageCounters(project);

  const target = project.targetCompaniesCount || 0;
  const withPoc = project.companiesWithPocsFound || 0;
  const responded = project.companiesRespondedCount || 0;
  const vendorMatrix = await computeVendorMatrix(projectId);

  project.recalculateCosts();
  await project.save();

  const snapshot = {
    scope: 'project',
    campaignId: projectId,
    pocDiscoveryPercent: target ? (withPoc / target) * 100 : 0,
    interactionProgressPercent: target ? (responded / target) * 100 : 0,
    roiPercent: project.getRoiPercent(),
    totalProjectCost: project.financialLedger?.totalProjectCost || 0,
    validatedRevenueWon: project.financialLedger?.validatedRevenueWon || 0,
    vendorMatrix,
    activeQueues: await SequenceEnrollment.countDocuments({
      campaignId: projectId,
      frozen: false,
      completedAt: null,
    }),
    computedAt: new Date(),
  };

  await AnalyticsSnapshot.create(snapshot);
  return snapshot;
}

export async function computeGlobalSnapshot() {
  const projects = await ProjectCampaign.find().lean();
  const activeQueues = await SequenceEnrollment.countDocuments({ frozen: false, completedAt: null });
  const totalRevenue = projects.reduce((sum, p) => sum + (p.financialLedger?.validatedRevenueWon || 0), 0);
  const totalCost = projects.reduce((sum, p) => sum + (p.financialLedger?.totalProjectCost || 0), 0);
  const roiPercent = totalCost ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

  const snapshot = {
    scope: 'global',
    campaignId: null,
    pocDiscoveryPercent: 0,
    interactionProgressPercent: 0,
    roiPercent,
    totalProjectCost: totalCost,
    validatedRevenueWon: totalRevenue,
    vendorMatrix: [],
    activeQueues,
    projectCount: projects.length,
    leadCount: await Lead.countDocuments(),
    computedAt: new Date(),
  };

  await AnalyticsSnapshot.create(snapshot);
  return snapshot;
}

export async function runAnalyticsCron() {
  const projects = await ProjectCampaign.find({ deletedAt: null }).select('_id');
  for (const project of projects) {
    await computeProjectSnapshot(project._id);
  }
  await computeGlobalSnapshot();
  console.info('Analytics cron completed.');
}

let cronTimer = null;

export function startAnalyticsCron() {
  if (cronTimer) return;
  const fourHours = 4 * 60 * 60 * 1000;
  cronTimer = setInterval(() => {
    runAnalyticsCron().catch((err) => console.error('Analytics cron failed:', err.message));
  }, fourHours);
  runAnalyticsCron().catch(() => {});
}

export function stopAnalyticsCron() {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
}

export async function recordEmailOpen(leadId, stepId) {
  const lead = await Lead.findById(leadId);
  if (!lead) return false;
  lead.trackingMetrics.isOpened = true;
  lead.trackingMetrics.totalOpenCount += 1;
  lead.trackingMetrics.lastOpenTimestamp = new Date();
  await lead.save();
  return true;
}
