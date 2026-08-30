export const EMPTY_AUDIENCE = {
  importedCampaignIds: [],
  includeCompanyIds: [],
  includeContactIds: [],
  excludeCompanyIds: [],
  excludeContactIds: [],
};

/** Coerce API/DB campaign ids; String(null) must never become the path segment "null". */
export function normalizeCampaignId(value) {
  if (value == null) return '';
  const id = String(value).trim();
  if (!id || id === 'null' || id === 'undefined' || id === '[object Object]') return '';
  return id;
}

export function audienceWithImportedCampaign(campaignId) {
  const id = normalizeCampaignId(campaignId);
  return id
    ? { ...EMPTY_AUDIENCE, importedCampaignIds: [id] }
    : { ...EMPTY_AUDIENCE };
}

export function audienceToApiParams(audience = EMPTY_AUDIENCE) {
  const params = {};
  if (audience.importedCampaignIds?.length) {
    params.importedCampaignIds = audience.importedCampaignIds;
  } else if (audience.importCampaign) {
    params.importCampaign = true;
  }
  if (audience.campaignSelections && Object.keys(audience.campaignSelections).length) {
    params.campaignSelections = audience.campaignSelections;
  }
  if (audience.includeCompanyIds?.length) params.includeCompanyIds = audience.includeCompanyIds;
  if (audience.includeContactIds?.length) params.includeLeadIds = audience.includeContactIds;
  if (audience.excludeCompanyIds?.length) params.excludeCompanyIds = audience.excludeCompanyIds;
  if (audience.excludeContactIds?.length) params.excludeLeadIds = audience.excludeContactIds;
  return params;
}

export function buildAudienceSummary(audience, preview, campaignLabels = {}) {
  const parts = [];

  const imported = audience.importedCampaignIds || [];
  let totalSelectedInSelections = 0;
  if (imported.length) {
    const listDescs = imported.map((id) => {
      const name = campaignLabels[id] || 'campaign';
      const selCount = audience.campaignSelections?.[id]?.length;
      if (selCount != null) {
        totalSelectedInSelections += selCount;
        return `${name}: ${selCount} selected`;
      }
      return name;
    });
    parts.push(listDescs.join(', '));
  } else if (audience.importCampaign) {
    parts.push('imported campaign list');
  }

  if (audience.includeCompanyIds?.length) {
    const n = audience.includeCompanyIds.length;
    parts.push(`+ ${n} compan${n === 1 ? 'y' : 'ies'}`);
  }

  if (audience.includeContactIds?.length) {
    const n = audience.includeContactIds.length;
    parts.push(`+ ${n} contact${n === 1 ? '' : 's'}`);
  }

  if (audience.excludeCompanyIds?.length) {
    const n = audience.excludeCompanyIds.length;
    parts.push(`(excluding ${n} compan${n === 1 ? 'y' : 'ies'})`);
  }

  if (!parts.length) {
    return 'Import a campaign list or add contacts to build your audience.';
  }

  const prefix = parts.join(' ');
  const alreadySent = preview?.alreadySent || 0;
  const alreadyInQueue = preview?.alreadyInQueue || 0;
  const restarting = preview?.willRestart || 0;

  // Trust the fetched preview once it exists — even a genuine 0 (e.g. everyone
  // blocked or manually excluded) must win over the raw selection count, or this
  // text contradicts the per-contact breakdown in "See who gets emailed & why".
  const hasPreview = preview && (preview.eligible > 0 || preview.netNew > 0 || preview.blocked > 0 || preview.alreadySent > 0 || preview.alreadyInQueue > 0 || preview.alreadyEnrolled > 0);
  const eligible = hasPreview ? preview.eligible : totalSelectedInSelections;
  const net = hasPreview ? preview.netNew : eligible;

  if (alreadyInQueue > 0 && net === 0) {
    return `${prefix} · All ${alreadyInQueue} contacts are already queued in Email → Outbox.`;
  }
  if (alreadySent > 0 && net === 0) {
    return `${prefix} · 0 new to enroll (${alreadySent} contact${alreadySent === 1 ? '' : 's'} were already emailed in this sequence).`;
  }
  if (alreadySent > 0 && net > 0) {
    return `${prefix} · ${net} new will enroll (${alreadySent} already emailed previously).`;
  }
  if (restarting > 0 && net > 0) {
    return `${prefix} · ${net} will enroll (${restarting} restarting from step 1).`;
  }
  if (net > 0) {
    return `${prefix} · ${net} contact${net === 1 ? '' : 's'} ready to enroll.`;
  }

  return `${prefix} · 0 contacts selected.`;
}

export function buildImportedListLabels(audience, campaignLabels = {}) {
  return (audience.importedCampaignIds || []).map((id) => {
    const baseLabel = campaignLabels[id] || 'Campaign list';
    const selCount = audience.campaignSelections?.[id]?.length;
    return {
      id,
      label: baseLabel,
      selectedCount: selCount,
    };
  });
}

