const ERROR_RULES = [
  {
    code: 'no_email',
    test: (msg) => msg.includes('No valid target email'),
    title: 'No sendable email',
    description: 'This contact has no confirmed outreach address and no usable email on file.',
    action: 'Add an email on the contact record, then reset enrollment and relaunch.',
    severity: 'error',
  },
  {
    code: 'suppressed',
    test: (msg) => msg === 'suppressed' || /suppress/i.test(msg),
    title: 'Email suppressed',
    description: 'This address is on the suppression list (opt-out or bounce).',
    action: 'Review suppression settings if this contact should receive mail again.',
    severity: 'warning',
  },
  {
    code: 'lead_missing',
    test: (msg) => msg === 'lead missing',
    title: 'Contact not found',
    description: 'The contact linked to this send was deleted or is missing.',
    action: 'Re-link the contact to the campaign or reset enrollment.',
    severity: 'error',
  },
  {
    code: 'blocked_status',
    test: (msg) => msg === 'Bounced / Invalid' || msg === 'Opted Out',
    title: 'Contact blocked',
    description: 'This contact’s delivery status prevents outbound email.',
    action: 'Update the contact status or use a different address.',
    severity: 'warning',
  },
  {
    code: 'smtp_error',
    test: (msg) => /smtp|mail server|authentication|ECONN|ETIMEDOUT|certificate/i.test(msg),
    title: 'SMTP delivery failed',
    description: 'The mail server rejected or could not deliver the message.',
    action: 'Check SMTP credentials in Team Settings, then reset enrollment and relaunch.',
    severity: 'error',
  },
  {
    code: 'worker_stopped',
    test: (msg) => msg.includes('Worker stopped before send completion'),
    title: 'Send interrupted',
    description: 'The server restarted while this message was sending.',
    action: 'Reset enrollment and relaunch, or wait for the worker to retry.',
    severity: 'warning',
  },
  {
    code: 'daily_cap',
    test: (msg) => msg.includes('daily cap'),
    title: 'Daily send limit reached',
    description: 'Sending was deferred because the mailbox daily cap was reached.',
    action: 'Wait for the next send window or raise the daily cap.',
    severity: 'info',
  },
  {
    code: 'business_hours',
    test: (msg) => msg.includes('business hours'),
    title: 'Outside business hours',
    description: 'This send was deferred to the next UAE business-hours window.',
    action: 'No action needed — it will send automatically when the window opens.',
    severity: 'info',
  },
  {
    code: 'sequence_complete',
    test: (msg) => msg === 'sequence complete',
    title: 'Sequence completed',
    description: 'This job was closed because the contact finished the sequence.',
    severity: 'info',
  },
  {
    code: 'enrollment_missing',
    test: (msg) => msg === 'enrollment not found',
    title: 'Enrollment missing',
    description: 'The sequence enrollment for this send no longer exists.',
    action: 'Reset enrollment and relaunch if you still need to reach this contact.',
    severity: 'warning',
  },
  {
    code: 'enrollment_frozen',
    test: (msg) => msg === 'enrollment is frozen',
    title: 'Enrollment frozen',
    description: 'This contact’s sequence enrollment was paused (reply, bounce, or opt-out).',
    action: 'Review the contact timeline before re-enrolling.',
    severity: 'info',
  },
];

const STATUS_LABELS = {
  failed: 'Failed',
  cancelled: 'Cancelled',
  pending: 'Queued',
  processing: 'Sending',
};

export function describeSendDeliveryError(errorMessage = '', status = '') {
  const msg = String(errorMessage || '').trim();
  const rule = ERROR_RULES.find((entry) => entry.test(msg));
  if (rule) {
    return {
      code: rule.code,
      title: rule.title,
      description: rule.description,
      action: rule.action || '',
      severity: rule.severity,
      rawMessage: msg,
    };
  }

  if (msg) {
    return {
      code: 'unknown',
      title: status === 'failed' ? 'Send failed' : 'Delivery issue',
      description: msg,
      action: status === 'failed' ? 'Review the contact and SMTP settings, then reset enrollment and relaunch.' : '',
      severity: status === 'failed' ? 'error' : 'warning',
      rawMessage: msg,
    };
  }

  return {
    code: 'none',
    title: STATUS_LABELS[status] || 'Delivery update',
    description: status === 'pending' || status === 'processing'
      ? 'This message is waiting to be sent.'
      : 'No additional details recorded.',
    action: '',
    severity: 'info',
    rawMessage: '',
  };
}

export function formatDeliveryIssueRow(row) {
  const status = row.status || 'failed';
  const error = describeSendDeliveryError(row.errorMessage, status);

  return {
    _id: row._id,
    status,
    statusLabel: STATUS_LABELS[status] || status,
    scheduledFor: row.scheduledFor || null,
    updatedAt: row.updatedAt || null,
    sentAt: row.sentAt || null,
    recipientEmail: row.recipientEmail || '',
    renderedSubject: row.renderedSubject || '',
    stepIndex: row.stepIndex,
    stepNumber: Number(row.stepIndex) + 1,
    errorMessage: row.errorMessage || '',
    error,
    lead: row.lead
      ? {
          _id: row.lead._id,
          name: row.lead.name || '',
          email: row.lead.email || '',
          deliveryStatus: row.lead.deliveryStatus || '',
        }
      : null,
    company: row.company
      ? {
          _id: row.company._id,
          companyName: row.company.companyName || '',
        }
      : null,
    campaign: row.campaign
      ? {
          _id: row.campaign._id,
          projectName: row.campaign.projectName || '',
        }
      : null,
    sequence: row.sequence
      ? {
          _id: row.sequence._id,
          name: row.sequence.name || '',
        }
      : null,
  };
}
