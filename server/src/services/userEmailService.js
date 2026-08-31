import { sendAuthenticatedMail, getBaseUrl, getMailConfigStatus } from './mailTransport.js';
import { ROLE_LABELS } from '../constants/userRoles.js';

function getCrmLoginUrl() {
  const client = process.env.CLIENT_URL || 'http://localhost:5174';
  return `${String(client).replace(/\/$/, '')}/admin/crm`;
}

function assertSmtpReady() {
  const { smtpReady, smtp2Ready } = getMailConfigStatus();
  if (!smtpReady && !smtp2Ready) {
    const error = new Error('Email is not configured. Set EMAIL_SMTP_* variables on the server.');
    error.status = 503;
    throw error;
  }
}

function buildCredentialsEmail({ displayName, email, password, role, welcome = false }) {
  const loginUrl = getCrmLoginUrl();
  const roleLabel = ROLE_LABELS[role] || role || 'Team member';
  const subject = welcome
    ? 'Your EGS CRM account is ready'
    : 'Your EGS CRM password has been reset';

  const intro = welcome
    ? `Hi ${displayName},\n\nAn administrator created your EGS CRM account. Use the details below to sign in.`
    : `Hi ${displayName},\n\nAn administrator reset your EGS CRM password. Use the temporary password below to sign in.`;

  const text = `${intro}

Login URL: ${loginUrl}
Email: ${email}
Temporary password: ${password}
Role: ${roleLabel}

You will be asked to change your password after signing in.

If you did not expect this email, contact your administrator immediately.

— Exhibit Graphic Sign CRM`;

  const html = `
    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
      <div style="padding:24px 24px 8px;border-bottom:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">EGS CRM</p>
        <h1 style="margin:12px 0 0;font-size:22px;line-height:1.3;">${welcome ? 'Your account is ready' : 'Password reset'}</h1>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">Hi ${displayName},</p>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155;">
          ${welcome
    ? 'An administrator created your CRM account. Sign in using the credentials below.'
    : 'An administrator reset your CRM password. Sign in with this temporary password.'}
        </p>
        <div style="border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:16px 18px;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Sign-in details</p>
          <p style="margin:0 0 8px;font-size:13px;"><strong>URL:</strong> <a href="${loginUrl}" style="color:#2563eb;">${loginUrl}</a></p>
          <p style="margin:0 0 8px;font-size:13px;"><strong>Email:</strong> ${email}</p>
          <p style="margin:0 0 8px;font-size:13px;"><strong>Temporary password:</strong> <code style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:2px 6px;">${password}</code></p>
          <p style="margin:0;font-size:13px;"><strong>Role:</strong> ${roleLabel}</p>
        </div>
        <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
          You will be prompted to change your password after signing in.
        </p>
        <a href="${loginUrl}" style="display:inline-block;margin-top:20px;background:#d9262e;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:10px 16px;border-radius:8px;">
          Open CRM
        </a>
      </div>
      <p style="padding:0 24px 24px;margin:0;font-size:12px;color:#94a3b8;">Exhibit Graphic Sign · Commercial CRM</p>
    </div>
  `;

  return { subject, text, html };
}

export async function sendUserCredentialsEmail({ user, password, welcome = false }) {
  assertSmtpReady();
  const fromName = process.env.EMAIL_FROM_NAME || 'Exhibit Graphic Sign';
  const { subject, text, html } = buildCredentialsEmail({
    displayName: user.displayName,
    email: user.email,
    password,
    role: user.role,
    welcome,
  });

  await sendAuthenticatedMail({
    fromName,
    to: user.email,
    subject,
    text,
    html,
  });

  return { ok: true, loginUrl: getCrmLoginUrl() };
}

export async function getEmailDeliveryStatus() {
  const mail = getMailConfigStatus();
  return {
    ...mail,
    emailDeliveryReady: mail.smtpReady,
  };
}
