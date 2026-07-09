import { RESEND_MAX_SENDS_PER_REQUEST } from '../constants/resendLimits.js';

/**
 * Calls sendFn repeatedly (max 100 emails per call) until the queue is clear or progress stalls.
 */
export async function runBatchedSendLoop(sendFn, { onProgress } = {}) {
  let totalSent = 0;
  let totalFailed = 0;
  let remaining = 1;
  let queuedBefore = 0;
  let iteration = 0;
  const maxIterations = 1000;

  while (remaining > 0 && iteration < maxIterations) {
    iteration += 1;
    onProgress?.({
      totalSent,
      totalFailed,
      remaining: remaining > 0 ? remaining : queuedBefore || 1,
      queuedBefore: queuedBefore || 0,
      batchSent: 0,
      iteration,
      starting: true,
    });

    const result = await sendFn({ maxCount: RESEND_MAX_SENDS_PER_REQUEST });
    totalSent += result.sent || 0;
    totalFailed += result.failed || 0;
    remaining = result.remaining ?? 0;
    if (!queuedBefore && result.queuedBefore) {
      queuedBefore = result.queuedBefore;
    }

    onProgress?.({
      totalSent,
      totalFailed,
      remaining,
      queuedBefore: queuedBefore || result.queuedBefore || 0,
      batchSent: result.sent || 0,
      iteration,
    });

    if (remaining <= 0) break;
    if ((result.sent || 0) === 0 && (result.failed || 0) === 0) break;

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  return {
    totalSent,
    totalFailed,
    remaining,
    queuedBefore,
    iterations: iteration,
  };
}
