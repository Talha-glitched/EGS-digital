/** Resend list API and bulk send operations must not exceed 100 per request. */
export const RESEND_MAX_EMAILS_PER_REQUEST = 100;

export function capResendBatchSize(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return RESEND_MAX_EMAILS_PER_REQUEST;
  return Math.min(Math.floor(parsed), RESEND_MAX_EMAILS_PER_REQUEST);
}
