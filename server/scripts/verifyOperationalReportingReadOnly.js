import db from '../src/db/index.js';
import { getOperationalReport } from '../src/services/operationalReportingService.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const report = await getOperationalReport();

  assert(report?.summary, 'Report summary is missing');
  assert(Array.isArray(report.jobs), 'Job coverage rows are missing');
  assert(Array.isArray(report.supplierPerformance), 'Supplier performance rows are missing');
  assert(Array.isArray(report.servicePerformance), 'Service usage rows are missing');
  assert(report.exceptions && Object.values(report.exceptions).every(Array.isArray), 'Exception lists are incomplete');
  assert(report.jobs.every((job) => job.coveragePercent >= 0 && job.coveragePercent <= 100), 'Coverage must be between 0 and 100');

  console.log(JSON.stringify({
    result: 'PASS',
    mode: 'read-only',
    activeJobs: report.summary.activeJobs,
    doneJobsInPeriod: report.summary.doneJobs,
    jobCoverageRows: report.jobs.length,
    averageCoverage: report.summary.averageCoverage,
    blockedActivities: report.summary.blockedActivities,
    overdueSupplierCommitments: report.summary.overdueSupplierCommitments,
    overdueSnags: report.summary.overdueSnags,
    upcomingInstallations: report.summary.upcomingInstallations,
    lowStockItems: report.summary.lowStockItems,
    supplierRows: report.supplierPerformance.length,
    serviceRows: report.servicePerformance.length,
  }, null, 2));
} finally {
  await db.getPool().end();
}
