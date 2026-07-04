export function crmApiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  return fetch(path, {
    ...options,
    credentials: 'include',
    headers: isFormData
      ? { ...(options.headers || {}) }
      : {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
  }).then(async (response) => {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();
    if (!response.ok) {
      if (response.status === 401 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('crm:unauthorized'));
      }
      throw new Error(data?.message || 'Request failed.');
    }
    return data;
  }).catch((error) => {
    if (error?.message === 'Failed to fetch' || error?.name === 'TypeError') {
      throw new Error('Could not reach the API server. Start it with: npm run dev --workspace server');
    }
    throw error;
  });
}

export function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.$oid) return value.$oid;
  if (typeof value === 'object' && value._id) return normalizeId(value._id);
  return String(value);
}

export async function uploadIngestFile(projectId, file, fieldMapping, vendor) {
  const form = new FormData();
  form.append('file', file);
  form.append('fieldMapping', JSON.stringify(fieldMapping || {}));
  form.append('vendor', vendor || 'Manual');
  return crmApiFetch(`/api/admin/projects/${projectId}/ingest`, {
    method: 'POST',
    body: form,
  });
}

export async function previewIngestFile(projectId, file) {
  const form = new FormData();
  form.append('file', file);
  return crmApiFetch(`/api/admin/projects/${projectId}/ingest/preview`, {
    method: 'POST',
    body: form,
  });
}

export async function previewCompaniesFile(projectId, file) {
  const form = new FormData();
  form.append('file', file);
  return crmApiFetch(`/api/admin/projects/${projectId}/companies/preview`, {
    method: 'POST',
    body: form,
  });
}

export async function uploadCompaniesFile(projectId, file, fieldMapping) {
  const form = new FormData();
  form.append('file', file);
  if (fieldMapping) form.append('fieldMapping', JSON.stringify(fieldMapping));
  return crmApiFetch(`/api/admin/projects/${projectId}/companies/upload`, {
    method: 'POST',
    body: form,
  });
}

export function formatCurrency(value, currency = 'AED') {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatPercent(value) {
  return `${(value || 0).toFixed(1)}%`;
}

export async function updateLead(leadId, payload) {
  return crmApiFetch(`/api/admin/leads/${leadId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchGlobalLeads({
  search,
  campaignId,
  deliveryStatus,
  pocStatus,
  rightPocOnly,
  relationshipStatus,
  serviceCategory,
  followUp,
  sort,
  page,
  limit,
} = {}) {
  const query = new URLSearchParams({
    ...(search && { search }),
    ...(campaignId && { campaignId }),
    ...(deliveryStatus && { deliveryStatus }),
    ...(pocStatus && { pocStatus }),
    ...(rightPocOnly && { rightPocOnly: '1' }),
    ...(relationshipStatus && { relationshipStatus }),
    ...(serviceCategory && { serviceCategory }),
    ...(followUp && { followUp }),
    ...(sort && { sort }),
    ...(page && { page }),
    ...(limit && { limit }),
  }).toString();
  return crmApiFetch(`/api/admin/leads?${query}`);
}

export async function createCompany(payload) {
  return crmApiFetch('/api/admin/companies', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createStandaloneLead(payload) {
  return crmApiFetch('/api/admin/leads', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchGlobalCompanies({ search, page, limit } = {}) {
  const query = new URLSearchParams({
    ...(search && { search }),
    ...(page && { page }),
    ...(limit && { limit }),
  }).toString();
  return crmApiFetch(`/api/admin/companies?${query}`);
}

export async function fetchCompanyDetails(companyId) {
  return crmApiFetch(`/api/admin/companies/${companyId}`);
}

export async function updateCompanyDetails(companyId, payload) {
  return crmApiFetch(`/api/admin/companies/${companyId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function addLeadToCompany(companyId, payload) {
  return crmApiFetch(`/api/admin/companies/${companyId}/leads`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchContactTimeline(leadId) {
  const id = normalizeId(leadId);
  if (!id) throw new Error('Contact ID is missing.');
  return crmApiFetch(`/api/admin/leads/${encodeURIComponent(id)}/timeline`);
}

export async function fetchCompanyTimeline(companyId) {
  const id = normalizeId(companyId);
  if (!id) throw new Error('Company ID is missing.');
  return crmApiFetch(`/api/admin/companies/${encodeURIComponent(id)}/timeline`);
}

export async function createContactInteraction(leadId, payload) {
  const id = normalizeId(leadId);
  return crmApiFetch(`/api/admin/leads/${encodeURIComponent(id)}/interactions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateContactInteraction(interactionId, payload) {
  const id = normalizeId(interactionId);
  return crmApiFetch(`/api/admin/interactions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteContactInteraction(interactionId) {
  const id = normalizeId(interactionId);
  return crmApiFetch(`/api/admin/interactions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function fetchComprehensiveAnalytics() {
  return crmApiFetch('/api/admin/analytics/comprehensive');
}

export async function fetchWorkspaceSearch(query, { limit = 5 } = {}) {
  const params = new URLSearchParams({
    q: query,
    ...(limit && { limit: String(limit) }),
  });
  return crmApiFetch(`/api/admin/search?${params}`);
}

export async function fetchFinanceOverview() {
  return crmApiFetch('/api/admin/finance/overview');
}

export async function fetchMailboxUsage() {
  return crmApiFetch('/api/admin/mailbox-usage');
}

export async function fetchSentEmails({ page, limit, campaignId, q } = {}) {
  const query = new URLSearchParams({
    ...(page && { page: String(page) }),
    ...(limit && { limit: String(limit) }),
    ...(campaignId && { campaignId }),
    ...(q && { q }),
  }).toString();
  return crmApiFetch(`/api/admin/sent-emails${query ? `?${query}` : ''}`);
}

export async function fetchAllSequences() {
  return crmApiFetch('/api/admin/sequences');
}

export async function fetchSequence(sequenceId) {
  return crmApiFetch(`/api/admin/sequences/${sequenceId}`);
}

export async function deleteSequence(sequenceId) {
  return crmApiFetch(`/api/admin/sequences/${sequenceId}`, { method: 'DELETE' });
}

export async function deleteSequences(ids = []) {
  return crmApiFetch('/api/admin/sequences/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export async function previewSequenceAudience(campaignId, options = {}) {
  const params = new URLSearchParams();
  if (options.sequenceId) params.set('sequenceId', options.sequenceId);
  if (options.importCampaign) params.set('importCampaign', 'true');
  if (options.importedCampaignIds?.length) params.set('importedCampaignIds', options.importedCampaignIds.join(','));
  if (options.includeCompanyIds?.length) params.set('includeCompanyIds', options.includeCompanyIds.join(','));
  if (options.includeLeadIds?.length) params.set('includeLeadIds', options.includeLeadIds.join(','));
  if (options.excludeCompanyIds?.length) params.set('excludeCompanyIds', options.excludeCompanyIds.join(','));
  if (options.excludeLeadIds?.length) params.set('excludeLeadIds', options.excludeLeadIds.join(','));
  if (options.leadIds?.length) params.set('leadIds', options.leadIds.join(','));
  if (options.companyIds?.length) params.set('companyIds', options.companyIds.join(','));
  if (options.full) params.set('full', 'true');
  const query = params.toString();
  return crmApiFetch(`/api/admin/projects/${campaignId}/audience-preview${query ? `?${query}` : ''}`);
}

export async function resetSequenceEnrollments(sequenceId, leadIds = []) {
  return crmApiFetch(`/api/admin/sequences/${sequenceId}/reset-enrollments`, {
    method: 'POST',
    body: JSON.stringify({ leadIds }),
  });
}

export async function updateCampaign(campaignId, payload) {
  return crmApiFetch(`/api/admin/projects/${campaignId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateProjectOverhead(campaignId, payload) {
  return crmApiFetch('/api/admin/finance/overhead', {
    method: 'POST',
    body: JSON.stringify({ campaignId, ...payload }),
  });
}

export async function logProjectRevenue(campaignId, payload) {
  return crmApiFetch('/api/admin/finance/revenue', {
    method: 'POST',
    body: JSON.stringify({ campaignId, ...payload }),
  });
}

export async function fetchPipelineConfig() {
  return crmApiFetch('/api/admin/sales/pipeline-config');
}

export async function updatePipelineConfig(payload) {
  return crmApiFetch('/api/admin/sales/pipeline-config', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchOpportunity(opportunityId) {
  return crmApiFetch(`/api/admin/sales/opportunities/${encodeURIComponent(normalizeId(opportunityId))}`);
}

export async function fetchOpportunityTimeline(opportunityId) {
  return crmApiFetch(`/api/admin/sales/opportunities/${encodeURIComponent(normalizeId(opportunityId))}/timeline`);
}

export async function createOpportunity(payload) {
  return crmApiFetch('/api/admin/sales/opportunities', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateOpportunity(opportunityId, payload) {
  return crmApiFetch(`/api/admin/sales/opportunities/${encodeURIComponent(normalizeId(opportunityId))}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchUsers() {
  return crmApiFetch('/api/admin/users');
}

export async function fetchActiveUsers() {
  return crmApiFetch('/api/admin/users/active');
}

export async function fetchUserRoles() {
  return crmApiFetch('/api/admin/users/roles');
}

export async function createUser(payload) {
  return crmApiFetch('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(userId, payload) {
  return crmApiFetch(`/api/admin/users/${encodeURIComponent(normalizeId(userId))}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchEmailDeliveryStatus() {
  return crmApiFetch('/api/admin/users/email-status');
}

export async function sendUserCredentials(userId, payload = {}) {
  return crmApiFetch(`/api/admin/users/${encodeURIComponent(normalizeId(userId))}/send-credentials`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resetUserPassword(userId, { sendEmail = true, password } = {}) {
  return crmApiFetch(`/api/admin/users/${encodeURIComponent(normalizeId(userId))}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ sendEmail, password }),
  });
}

export async function setUserPassword(userId, password) {
  return crmApiFetch(`/api/admin/users/${encodeURIComponent(normalizeId(userId))}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ password }),
  });
}

export async function fetchAuditLog(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return crmApiFetch(`/api/admin/audit-log${qs ? `?${qs}` : ''}`);
}

export async function fetchAuditLogEntry(id) {
  return crmApiFetch(`/api/admin/audit-log/${encodeURIComponent(normalizeId(id))}`);
}

export async function fetchUserActivity(userId, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return crmApiFetch(`/api/admin/users/${encodeURIComponent(normalizeId(userId))}/activity${qs ? `?${qs}` : ''}`);
}

export async function fetchRecentRevisions(limit = 50) {
  return crmApiFetch(`/api/admin/revisions/recent?limit=${limit}`);
}

export async function fetchRevisionEntry(revisionId) {
  return crmApiFetch(`/api/admin/revisions/entry/${encodeURIComponent(normalizeId(revisionId))}`);
}

export async function rollbackRevision(revisionId) {
  return crmApiFetch(`/api/admin/revisions/${encodeURIComponent(revisionId)}/rollback`, {
    method: 'POST',
  });
}

export async function restoreRecord(resourceType, id) {
  return crmApiFetch(`/api/admin/${resourceType}/${encodeURIComponent(normalizeId(id))}/restore`, {
    method: 'POST',
  });
}

export async function deleteTaskWithUndo(id) {
  return crmApiFetch(`/api/admin/sales/tasks/${encodeURIComponent(normalizeId(id))}`, {
    method: 'DELETE',
  });
}

export async function deleteInteractionWithUndo(id) {
  return crmApiFetch(`/api/admin/interactions/${encodeURIComponent(normalizeId(id))}`, {
    method: 'DELETE',
  });
}

export async function deleteSequenceWithUndo(id) {
  return crmApiFetch(`/api/admin/sequences/${encodeURIComponent(normalizeId(id))}`, {
    method: 'DELETE',
  });
}

export async function deleteLeadWithUndo(id) {
  return crmApiFetch(`/api/admin/leads/${encodeURIComponent(normalizeId(id))}`, {
    method: 'DELETE',
  });
}

export async function deleteCompanyWithUndo(id) {
  return crmApiFetch(`/api/admin/companies/${encodeURIComponent(normalizeId(id))}`, {
    method: 'DELETE',
  });
}

export async function deleteOpportunityWithUndo(id) {
  return crmApiFetch(`/api/admin/sales/opportunities/${encodeURIComponent(normalizeId(id))}`, {
    method: 'DELETE',
  });
}
