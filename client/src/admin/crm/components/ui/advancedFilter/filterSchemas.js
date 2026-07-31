import { POC_QUALIFICATION_OPTIONS } from '../../../constants/pocQualification.js';
import { RELATIONSHIP_STATUS_OPTIONS, SERVICE_CATEGORY_OPTIONS } from '../../../constants/relationshipProfile.js';

const DELIVERY_STATUSES = [
  'Pending Inqueue',
  'Emailed Outbound',
  'Replied',
  'Out of Office',
  'Opted Out',
  'Bounced / Invalid',
];

const SOURCES = ['Apollo', 'Hunter', 'Lusha', 'Manual'];
const COMPANY_STATUSES = ['Lead', 'Active Prospect', 'Client Partner', 'Blacklisted'];
const CAMPAIGN_STATUSES = ['Active Planning', 'Active Campaigning', 'Completed', 'Archived'];
const RESPONSE_CHANNELS = ['email', 'linkedin', 'phone', 'whatsapp', 'manual'];
const INBOX_INTENTS = ['Interested', 'Neutral', 'Opt Out'];
const TASK_STATUSES = ['Open', 'Done'];
const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

function applyFieldOptions(groups, fieldOptions = {}) {
  return groups.map((group) => ({
    ...group,
    fields: group.fields.map((field) => {
      const options = fieldOptions[field.key];
      if ((field.type === 'combobox' || field.type === 'arrayIncludes') && options?.length) {
        return { ...field, options };
      }
      if (field.type === 'combobox') {
        return { ...field, options: field.options || [] };
      }
      if (field.type === 'arrayIncludes') {
        return { ...field, options: field.options || [] };
      }
      return field;
    }),
  }));
}

function leadGroups(extra = {}) {
  return [
    {
      id: 'contact',
      label: 'Contact',
      description: 'Person-level attributes',
      fields: [
        { key: 'name', label: 'Name', type: 'combobox', placeholder: 'Search names…', accessor: (r) => r.name },
        { key: 'email', label: 'Email', type: 'combobox', placeholder: 'Search emails…', accessor: (r) => r.email },
        { key: 'designation', label: 'Job title', type: 'combobox', placeholder: 'Search titles…', accessor: (r) => r.designation },
        { key: 'phone', label: 'Phone', type: 'text', placeholder: 'Contains…', accessor: (r) => r.phone },
        { key: 'linkedinUrl', label: 'LinkedIn', type: 'text', placeholder: 'Contains…', accessor: (r) => r.linkedinUrl },
      ],
    },
    {
      id: 'company',
      label: 'Company',
      description: 'Account-level attributes',
      fields: [
        { key: 'companyName', label: 'Company name', type: 'combobox', placeholder: 'Search companies…', accessor: (r) => r.companyName },
        { key: 'domain', label: 'Domain', type: 'combobox', placeholder: 'Search domains…', accessor: (r) => r.domain },
      ],
    },
    {
      id: 'campaign',
      label: 'Campaign',
      description: 'Source and list membership',
      fields: [
        {
          key: 'campaignId',
          label: 'Campaign',
          type: 'select',
          defaultValue: 'any',
          accessor: (r) => String(r.campaignId?._id || r.campaignId || ''),
          options: [{ value: 'any', label: 'Any campaign' }, ...(extra.campaignOptions || [])],
        },
        {
          key: 'primarySource',
          label: 'Primary source',
          type: 'multi',
          accessor: (r) => r.primarySource,
          options: SOURCES.map((value) => ({ value, label: value })),
        },
        {
          key: 'sources',
          label: 'Discovered via',
          type: 'arrayIncludes',
          accessor: (r) => r.sources || [],
          options: SOURCES.map((value) => ({ value, label: value })),
        },
      ],
    },
    {
      id: 'engagement',
      label: 'Engagement',
      description: 'Outreach, replies, and channel activity',
      fields: [
        { key: '_email_hdr', label: 'Email', type: 'section' },
        {
          key: 'deliveryStatus',
          label: 'Email status',
          type: 'multi',
          accessor: (r) => r.deliveryStatus,
          options: DELIVERY_STATUSES.map((value) => ({ value, label: value })),
        },
        { key: 'hasResponded', label: 'Has responded', type: 'tri', accessor: (r) => r.hasResponded },
        {
          key: 'responseChannels',
          label: 'Response channel',
          type: 'arrayIncludes',
          accessor: (r) => r.responseChannels || [],
          options: [
            { value: 'email', label: 'Email' },
            { value: 'linkedin', label: 'LinkedIn' },
            { value: 'phone', label: 'Phone' },
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'manual', label: 'Logged interaction' },
          ],
        },
        { key: 'outcome', label: 'Outcome', type: 'text', placeholder: 'Contains…', accessor: (r) => r.outcome },
        { key: 'repliedAt', label: 'Reply date', type: 'dateRange', accessor: (r) => r.repliedAt },
        { key: '_linkedin_hdr', label: 'LinkedIn', type: 'section' },
        { key: 'liConnSent', label: 'Connection sent', type: 'tri', accessor: (r) => r.linkedinOutreach?.connSent },
        { key: 'liAccepted', label: 'Connection accepted', type: 'tri', accessor: (r) => r.linkedinOutreach?.accepted },
        { key: 'liInmailSent', label: 'InMail sent', type: 'tri', accessor: (r) => r.linkedinOutreach?.inmailSent },
        { key: 'liInmailResponded', label: 'InMail responded', type: 'tri', accessor: (r) => r.linkedinOutreach?.inmailResponded },
        { key: 'liDmSent', label: 'DM sent', type: 'tri', accessor: (r) => r.linkedinOutreach?.dmSent },
        { key: 'liDmResponded', label: 'DM responded', type: 'tri', accessor: (r) => r.linkedinOutreach?.dmResponded },
        { key: '_phone_hdr', label: 'Phone & WhatsApp', type: 'section' },
        { key: 'ccMade', label: 'Call made', type: 'tri', accessor: (r) => r.coldCall?.made },
        { key: 'ccResponse', label: 'Call response logged', type: 'tri', accessor: (r) => Boolean(String(r.coldCall?.response || '').trim()) },
        { key: 'waSent', label: 'WhatsApp sent', type: 'tri', accessor: (r) => r.whatsapp?.sent },
        { key: 'waResponse', label: 'WhatsApp response logged', type: 'tri', accessor: (r) => Boolean(String(r.whatsapp?.response || '').trim()) },
      ],
    },
    {
      id: 'qualification',
      label: 'Qualification',
      description: 'POC fit and relationship profile',
      fields: [
        {
          key: 'pocStatus',
          label: 'POC fit',
          type: 'multi',
          accessor: (r) => r.pocQualification?.status,
          options: POC_QUALIFICATION_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
        },
        {
          key: 'relationshipStatus',
          label: 'Relationship status',
          type: 'multi',
          accessor: (r) => r.relationshipProfile?.status,
          options: RELATIONSHIP_STATUS_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
        },
        {
          key: 'serviceCategories',
          label: 'Service category',
          type: 'arrayIncludes',
          accessor: (r) => r.relationshipProfile?.serviceCategories || [],
          options: SERVICE_CATEGORY_OPTIONS.map((value) => ({ value, label: value })),
        },
        { key: 'relationshipOwner', label: 'Relationship owner', type: 'text', placeholder: 'Contains…', accessor: (r) => r.relationshipProfile?.owner },
        { key: 'nextFollowUpAt', label: 'Next follow-up', type: 'dateRange', accessor: (r) => r.nextFollowUpAt || r.relationshipProfile?.nextFollowUpAt },
      ],
    },
    {
      id: 'activity',
      label: 'Activity',
      description: 'Record dates',
      fields: [
        { key: 'createdAt', label: 'Date added', type: 'dateRange', accessor: (r) => r.createdAt },
        { key: 'updatedAt', label: 'Last updated', type: 'dateRange', accessor: (r) => r.updatedAt },
      ],
    },
  ];
}

export function buildLeadFilterSchema(options = {}) {
  const { fieldOptions = {}, ...rest } = options;
  return {
    id: 'lead',
    label: 'Contacts',
    groups: applyFieldOptions(leadGroups(rest), fieldOptions),
  };
}

export function withFieldOptions(schema, fieldOptions = {}) {
  if (!fieldOptions || !Object.keys(fieldOptions).length) return schema;
  return {
    ...schema,
    groups: applyFieldOptions(schema.groups, fieldOptions),
  };
}

export const LEAD_FILTER_SCHEMA = buildLeadFilterSchema();

export const CAMPAIGN_LEAD_FILTER_SCHEMA = buildLeadFilterSchema();

export const COMPANY_FILTER_SCHEMA = {
  id: 'company',
  label: 'Companies',
  groups: applyFieldOptions([
    {
      id: 'profile',
      label: 'Profile',
      description: 'Firmographics and contact info',
      fields: [
        { key: 'companyName', label: 'Company name', type: 'combobox', placeholder: 'Search companies…', accessor: (r) => r.companyName },
        { key: 'domain', label: 'Domain', type: 'combobox', placeholder: 'Search domains…', accessor: (r) => r.domain },
        { key: 'industry', label: 'Industry', type: 'combobox', placeholder: 'Search industries…', accessor: (r) => r.industry },
        { key: 'boothNumber', label: 'Booth / stand', type: 'text', placeholder: 'Contains…', accessor: (r) => r.boothNumber },
        { key: 'city', label: 'City', type: 'combobox', placeholder: 'Search cities…', accessor: (r) => r.city },
        { key: 'country', label: 'Country', type: 'combobox', placeholder: 'Search countries…', accessor: (r) => r.country },
        { key: 'genericEmails', label: 'Generic email', type: 'arrayIncludes', accessor: (r) => r.genericEmails || [] },
        { key: 'genericEmailContains', label: 'Generic email contains', type: 'combobox', placeholder: 'Search emails…', accessor: (r) => (r.genericEmails || []).join(' ') },
        { key: 'genericPhone', label: 'Phone', type: 'text', placeholder: 'Contains…', accessor: (r) => r.genericPhone },
        { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Contains…', accessor: (r) => r.notes },
      ],
    },
    {
      id: 'engagement',
      label: 'Engagement',
      description: 'Pipeline status and responses',
      fields: [
        {
          key: 'globalStatus',
          label: 'Global status',
          type: 'multi',
          accessor: (r) => r.globalStatus,
          options: COMPANY_STATUSES.map((value) => ({ value, label: value })),
        },
        { key: 'pocCount', label: 'Known contacts', type: 'range', accessor: (r) => r.pocCount },
        { key: 'hasResponded', label: 'Has responded', type: 'tri', accessor: (r) => r.hasResponded },
        {
          key: 'responseChannels',
          label: 'Response channel',
          type: 'arrayIncludes',
          accessor: (r) => r.responseChannels || [],
          options: RESPONSE_CHANNELS.map((value) => ({
            value,
            label: value.charAt(0).toUpperCase() + value.slice(1),
          })),
        },
        {
          key: 'campaignNames',
          label: 'Associated campaign',
          type: 'multiContains',
          accessor: (r) => (r.campaignNames || []).join(', '),
          options: [],
        },
        { key: 'respondedAt', label: 'First response date', type: 'dateRange', accessor: (r) => r.respondedAt },
      ],
    },
    {
      id: 'activity',
      label: 'Activity',
      description: 'Record dates',
      fields: [
        { key: 'createdAt', label: 'Date added', type: 'dateRange', accessor: (r) => r.createdAt },
        { key: 'updatedAt', label: 'Last updated', type: 'dateRange', accessor: (r) => r.updatedAt },
      ],
    },
  ]),
};

export const CAMPAIGN_COMPANY_FILTER_SCHEMA = {
  id: 'campaign-company',
  label: 'Campaign companies',
  groups: [
    {
      id: 'profile',
      label: 'Profile',
      description: 'Company attributes in this campaign',
      fields: [
        { key: 'companyName', label: 'Company name', type: 'text', placeholder: 'Contains…', accessor: (r) => r.companyName },
        { key: 'domain', label: 'Domain', type: 'text', placeholder: 'Contains…', accessor: (r) => r.domain },
        { key: 'industry', label: 'Industry', type: 'text', placeholder: 'Contains…', accessor: (r) => r.industry },
        { key: 'boothNumber', label: 'Booth / stand', type: 'text', placeholder: 'Contains…', accessor: (r) => r.boothNumber },
        { key: 'city', label: 'City', type: 'text', placeholder: 'Contains…', accessor: (r) => r.city },
        { key: 'country', label: 'Country', type: 'text', placeholder: 'Contains…', accessor: (r) => r.country },
        { key: 'genericEmails', label: 'Generic email', type: 'arrayIncludes', accessor: (r) => r.genericEmails || [] },
        { key: 'genericEmailContains', label: 'Generic email contains', type: 'combobox', placeholder: 'Search emails…', accessor: (r) => (r.genericEmails || []).join(' ') },
      ],
    },
    {
      id: 'engagement',
      label: 'Engagement',
      description: 'Contacts and response',
      fields: [
        { key: 'pocCount', label: 'Contacts discovered', type: 'range', accessor: (r) => r.pocCount },
        { key: 'hasResponded', label: 'Has responded', type: 'tri', accessor: (r) => r.hasResponded },
        {
          key: 'responseChannels',
          label: 'Response channel',
          type: 'arrayIncludes',
          accessor: (r) => r.responseChannels || [],
          options: RESPONSE_CHANNELS.map((value) => ({
            value,
            label: value.charAt(0).toUpperCase() + value.slice(1),
          })),
        },
        { key: 'respondedAt', label: 'First response date', type: 'dateRange', accessor: (r) => r.respondedAt },
        {
          key: 'globalStatus',
          label: 'Global status',
          type: 'multi',
          accessor: (r) => r.globalStatus,
          options: COMPANY_STATUSES.map((value) => ({ value, label: value })),
        },
      ],
    },
  ],
};

export const CAMPAIGN_FILTER_SCHEMA = {
  id: 'campaign',
  label: 'Campaigns',
  groups: [
    {
      id: 'campaign',
      label: 'Campaign',
      description: 'Name, stage, and control',
      fields: [
        { key: 'projectName', label: 'Campaign name', type: 'text', placeholder: 'Contains…', accessor: (r) => r.projectName },
        { key: 'milestone', label: 'Milestone / event', type: 'text', placeholder: 'Contains…', accessor: (r) => r.milestone },
        {
          key: 'status',
          label: 'Stage',
          type: 'multi',
          accessor: (r) => r.status,
          options: CAMPAIGN_STATUSES.map((value) => ({ value, label: value })),
        },
        {
          key: 'statusSource',
          label: 'Stage control',
          type: 'multi',
          accessor: (r) => r.statusSource,
          options: [
            { value: 'auto', label: 'Automatic' },
            { value: 'manual', label: 'Manual override' },
          ],
        },
      ],
    },
    {
      id: 'metrics',
      label: 'Metrics',
      description: 'Coverage and queue counts',
      fields: [
        { key: 'targetCompaniesCount', label: 'Companies found', type: 'range', accessor: (r) => r.targetCompaniesCount },
        { key: 'companiesReached', label: 'Companies reached', type: 'range', accessor: (r) => r.companiesReached },
        { key: 'pocsFound', label: 'POCs found', type: 'range', accessor: (r) => r.pocsFound },
        { key: 'pocsEmailed', label: 'POCs emailed', type: 'range', accessor: (r) => r.pocsEmailed },
        { key: 'pocsResponded', label: 'POCs responded', type: 'range', accessor: (r) => r.pocsResponded },
        { key: 'companiesRespondedCount', label: 'Companies replied', type: 'range', accessor: (r) => r.companiesRespondedCount },
        { key: 'activeQueues', label: 'In queue', type: 'range', accessor: (r) => r.activeQueues },
      ],
    },
    {
      id: 'activity',
      label: 'Activity',
      description: 'Record dates',
      fields: [
        { key: 'createdAt', label: 'Created', type: 'dateRange', accessor: (r) => r.createdAt },
        { key: 'updatedAt', label: 'Last updated', type: 'dateRange', accessor: (r) => r.updatedAt },
      ],
    },
  ],
};

export function buildOngoingJobFilterSchema(stages = []) {
  return {
    id: 'ongoing_job',
    label: 'Ongoing Jobs',
    groups: [
      {
        id: 'deal',
        label: 'Job',
        description: 'Ongoing Job details',
        fields: [
          { key: 'name', label: 'Ongoing Job name', type: 'text', placeholder: 'Contains…', accessor: (r) => r.name },
          { key: 'eventName', label: 'Event / programme', type: 'text', placeholder: 'Contains…', accessor: (r) => r.eventName },
          {
            key: 'stage',
            label: 'Pipeline stage',
            type: 'multi',
            accessor: (r) => r.stage,
            options: stages.map((value) => ({ value, label: value })),
          },
          { key: 'valueAed', label: 'Job value (AED)', type: 'range', accessor: (r) => r.valueAed },
          { key: 'tags', label: 'Tags', type: 'multiContains', accessor: (r) => (r.tags || []).join(', ') },
        ],
      },
      {
        id: 'account',
        label: 'Account',
        description: 'Company and owner',
        fields: [
          { key: 'companyName', label: 'Company', type: 'text', placeholder: 'Contains…', accessor: (r) => r.companyId?.companyName || r.companyName },
          { key: 'owner', label: 'Owner', type: 'text', placeholder: 'Contains…', accessor: (r) => r.owner },
        ],
      },
      {
        id: 'activity',
        label: 'Activity',
        description: 'Timeline',
        fields: [
          { key: 'expectedCloseDate', label: 'Expected close', type: 'dateRange', accessor: (r) => r.expectedCloseDate },
          { key: 'createdAt', label: 'Opened', type: 'dateRange', accessor: (r) => r.createdAt },
          { key: 'updatedAt', label: 'Last updated', type: 'dateRange', accessor: (r) => r.updatedAt },
        ],
      },
    ],
  };
}

export const buildOpportunityFilterSchema = buildOngoingJobFilterSchema;

export function buildTaskFilterSchema(ownerOptions = []) {
  const normalizedOwnerOptions = ownerOptions.map((item) => (
    typeof item === 'string' ? { value: item, label: item } : item
  ));
  return {
    id: 'task',
    label: 'Tasks',
    groups: [
      {
        id: 'task',
        label: 'Task',
        description: 'Status and content',
        fields: [
          { key: 'title', label: 'Title', type: 'text', placeholder: 'Contains…', accessor: (r) => r.title },
          {
            key: 'status',
            label: 'Status',
            type: 'multi',
            accessor: (r) => r.status,
            options: TASK_STATUSES.map((value) => ({ value, label: value })),
          },
          {
            key: 'priority',
            label: 'Priority',
            type: 'multi',
            accessor: (r) => r.priority,
            options: TASK_PRIORITIES.map((value) => ({ value, label: value })),
          },
          {
            key: 'owner',
            label: 'Owner',
            type: 'multi',
            accessor: (r) => r.owner,
            options: normalizedOwnerOptions,
          },
          { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Contains…', accessor: (r) => r.notes },
        ],
      },
      {
        id: 'links',
        label: 'Links',
        description: 'Related records',
        fields: [
          { key: 'campaignName', label: 'Project', type: 'text', placeholder: 'Contains…', accessor: (r) => r.campaignId?.projectName || r.campaignName },
          { key: 'opportunityName', label: 'Opportunity', type: 'text', placeholder: 'Contains…', accessor: (r) => r.opportunityId?.name || r.opportunityName },
          { key: 'companyName', label: 'Company', type: 'text', placeholder: 'Contains…', accessor: (r) => r.companyId?.companyName || r.companyName },
        ],
      },
      {
        id: 'activity',
        label: 'Activity',
        description: 'Dates',
        fields: [
          { key: 'dueAt', label: 'Due date', type: 'dateRange', accessor: (r) => r.dueAt },
          { key: 'createdAt', label: 'Created', type: 'dateRange', accessor: (r) => r.createdAt },
        ],
      },
    ],
  };
}

export const INBOX_FILTER_SCHEMA = {
  id: 'inbox',
  label: 'Inbox threads',
  groups: [
    {
      id: 'people',
      label: 'People',
      description: 'Who the thread is with',
      fields: [
        { key: 'campaignName', label: 'Campaign', type: 'text', placeholder: 'Contains…', accessor: (r) => r.campaignName },
        { key: 'companyName', label: 'Company', type: 'text', placeholder: 'Contains…', accessor: (r) => r.companyName },
        { key: 'pocName', label: 'Contact', type: 'text', placeholder: 'Contains…', accessor: (r) => r.pocName },
      ],
    },
    {
      id: 'message',
      label: 'Message',
      description: 'Content and intent',
      fields: [
        { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Contains…', accessor: (r) => r.subject },
        { key: 'latestMessageBody', label: 'Message body', type: 'text', placeholder: 'Contains…', accessor: (r) => r.latestMessageBody },
        {
          key: 'intent',
          label: 'Intent',
          type: 'multi',
          accessor: (r) => r.intent,
          options: INBOX_INTENTS.map((value) => ({ value, label: value })),
        },
      ],
    },
    {
      id: 'activity',
      label: 'Activity',
      description: 'When received',
      fields: [
        { key: 'receivedAt', label: 'Received', type: 'dateRange', accessor: (r) => r.receivedAt },
      ],
    },
  ],
};

export const VENDOR_FILTER_SCHEMA = {
  id: 'vendor',
  label: 'Source performance',
  groups: [
    {
      id: 'vendor',
      label: 'Vendor metrics',
      fields: [
        {
          key: 'source',
          label: 'Source',
          type: 'multi',
          accessor: (r) => r.source,
          options: SOURCES.map((value) => ({ value, label: value })),
        },
        { key: 'leadsCount', label: 'Leads', type: 'range', accessor: (r) => r.leadsCount },
        { key: 'opens', label: 'Opens', type: 'range', accessor: (r) => r.opens },
        { key: 'bounces', label: 'Bounces', type: 'range', accessor: (r) => r.bounces },
        { key: 'replies', label: 'Replies', type: 'range', accessor: (r) => r.replies },
        { key: 'revenue', label: 'Revenue', type: 'range', accessor: (r) => r.revenue },
      ],
    },
  ],
};

export const REVENUE_FILTER_SCHEMA = {
  id: 'revenue',
  label: 'Revenue entries',
  groups: [
    {
      id: 'revenue',
      label: 'Entry details',
      fields: [
        { key: 'projectName', label: 'Campaign', type: 'text', accessor: (r) => r.campaignId?.projectName },
        { key: 'companyName', label: 'Company', type: 'text', accessor: (r) => r.companyId?.companyName },
        { key: 'description', label: 'Description', type: 'text', accessor: (r) => r.description },
        { key: 'amount', label: 'Amount (AED)', type: 'range', accessor: (r) => r.amount },
        { key: 'createdAt', label: 'Date logged', type: 'dateRange', accessor: (r) => r.closedAt || r.createdAt },
      ],
    },
  ],
};

export const CAMPAIGN_ROI_FILTER_SCHEMA = {
  id: 'campaign-roi',
  label: 'Campaign ROI ledger',
  groups: [
    {
      id: 'ledger',
      label: 'Financial yield',
      fields: [
        { key: 'projectName', label: 'Campaign', type: 'text', accessor: (r) => r.projectName },
        { key: 'milestone', label: 'Milestone', type: 'text', accessor: (r) => r.milestone },
        {
          key: 'status',
          label: 'Stage',
          type: 'multi',
          accessor: (r) => r.status,
          options: CAMPAIGN_STATUSES.map((value) => ({ value, label: value })),
        },
        { key: 'totalCost', label: 'Total cost', type: 'range', accessor: (r) => r.totalCost },
        { key: 'revenueWon', label: 'Revenue won', type: 'range', accessor: (r) => r.revenueWon },
        { key: 'roi', label: 'ROI %', type: 'range', accessor: (r) => r.roi },
      ],
    },
  ],
};
