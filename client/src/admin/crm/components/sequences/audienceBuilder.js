export const EMPTY_AUDIENCE = {
  importedCampaignIds: [],
  includeCompanyIds: [],
  includeContactIds: [],
  excludeCompanyIds: [],
  excludeContactIds: [],
};

export function audienceToApiParams(audience = EMPTY_AUDIENCE) {
  const params = {};
  if (audience.importedCampaignIds?.length) {
    params.importedCampaignIds = audience.importedCampaignIds;
  } else if (audience.importCampaign) {
    params.importCampaign = true;
  }
  if (audience.includeCompanyIds?.length) params.includeCompanyIds = audience.includeCompanyIds;
  if (audience.includeContactIds?.length) params.includeLeadIds = audience.includeContactIds;
  if (audience.excludeCompanyIds?.length) params.excludeCompanyIds = audience.excludeCompanyIds;
  if (audience.excludeContactIds?.length) params.excludeLeadIds = audience.excludeContactIds;
  return params;
}

export function buildAudienceSummary(audience, preview, campaignLabels = {}) {
  const parts = [];
  const subs = [];

  const imported = audience.importedCampaignIds || [];
  if (imported.length) {
    const names = imported.map((id) => campaignLabels[id] || 'campaign').join(', ');
    parts.push(`imported ${imported.length} list${imported.length === 1 ? '' : 's'} (${names})`);
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
    subs.push(`${n} compan${n === 1 ? 'y' : 'ies'}`);
  }

  if (audience.excludeContactIds?.length) {
    const n = audience.excludeContactIds.length;
    subs.push(`${n} contact${n === 1 ? '' : 's'}`);
  }

  if (!parts.length && !subs.length) {
    return 'Import a campaign list or add companies / contacts to build your audience.';
  }

  let text = parts.join(' ');
  if (subs.length) {
    text += `, excluding ${subs.join(' and ')}`;
  }

  const net = preview?.netNew ?? 0;
  const alreadySent = preview?.alreadySent ?? 0;
  const alreadyInQueue = preview?.alreadyInQueue ?? 0;
  const restarting = preview?.willRestart ?? 0;
  if (alreadyInQueue > 0 && net === 0) {
    text += `. ${alreadyInQueue} already queued — open Email → Outbox to send the remaining batch.`;
  } else if (alreadySent > 0 && alreadyInQueue > 0 && net > 0) {
    text += `. ${net} new will enroll (${alreadySent} already sent, ${alreadyInQueue} already queued).`;
  } else if (alreadySent > 0 && net > 0) {
    text += `. ${net} new will enroll (${alreadySent} already sent — won’t be emailed again).`;
  } else if (alreadySent > 0 && net === 0) {
    text += `. ${alreadySent} already sent — open Email → Outbox to send any remaining queue.`;
  } else if (restarting > 0 && net > 0) {
    text += `. ${net} will enroll (${restarting} will restart from step 1).`;
  } else if (net > 0) {
    text += `. ${net} will enroll.`;
  } else {
    text += `. 0 will enroll.`;
  }
  return text;
}

export function buildImportedListLabels(audience, campaignLabels = {}) {
  return (audience.importedCampaignIds || []).map((id) => ({
    id,
    label: campaignLabels[id] || 'Campaign list',
  }));
}
