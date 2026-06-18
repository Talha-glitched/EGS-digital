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
      throw new Error(data?.message || 'Request failed.');
    }
    return data;
  });
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
