const GST_OFFSET_MS = 4 * 60 * 60 * 1000;

function toGstDate(date = new Date()) {
  return new Date(date.getTime() + GST_OFFSET_MS);
}

function fromGstParts(gstDate) {
  const y = gstDate.getUTCFullYear();
  const m = gstDate.getUTCMonth();
  const d = gstDate.getUTCDate();
  const h = gstDate.getUTCHours();
  const min = gstDate.getUTCMinutes();
  return new Date(Date.UTC(y, m, d, h - 4, min, 0, 0));
}

export function isWithinUaeBusinessHours(date = new Date()) {
  const gst = toGstDate(date);
  const day = gst.getUTCDay();
  if (day === 0 || day === 6) return false;
  const minutes = gst.getUTCHours() * 60 + gst.getUTCMinutes();
  const start = 8 * 60 + 30;
  const end = 17 * 60 + 30;
  return minutes >= start && minutes < end;
}

export function getNextUaeBusinessWindow(date = new Date()) {
  let cursor = new Date(date);
  for (let i = 0; i < 14; i += 1) {
    const gst = toGstDate(cursor);
    const day = gst.getUTCDay();
    const minutes = gst.getUTCHours() * 60 + gst.getUTCMinutes();
    const start = 8 * 60 + 30;

    if (day >= 1 && day <= 5) {
      if (minutes < start) {
        const y = gst.getUTCFullYear();
        const m = gst.getUTCMonth();
        const d = gst.getUTCDate();
        return fromGstParts(new Date(Date.UTC(y, m, d, 8, 30, 0, 0)));
      }
      if (minutes >= start && minutes < 17 * 60 + 30) {
        return cursor;
      }
    }

    const gstNext = toGstDate(cursor);
    const y = gstNext.getUTCFullYear();
    const m = gstNext.getUTCMonth();
    const d = gstNext.getUTCDate();
    cursor = fromGstParts(new Date(Date.UTC(y, m, d + 1, 8, 30, 0, 0)));
  }
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
}

export function randomSendDelayMs() {
  const min = 60 * 1000;
  const max = 100 * 1000;
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function getGstDateKey(date = new Date()) {
  const gst = toGstDate(date);
  const y = gst.getUTCFullYear();
  const m = String(gst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(gst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** UTC Date range covering the current calendar day in GST (UTC+4). */
export function getGstDayBounds(date = new Date()) {
  const gst = toGstDate(date);
  const y = gst.getUTCFullYear();
  const m = gst.getUTCMonth();
  const d = gst.getUTCDate();
  const start = fromGstParts(new Date(Date.UTC(y, m, d, 0, 0, 0, 0)));
  const end = fromGstParts(new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0)));
  return { start, end };
}
