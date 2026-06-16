/** Shortlist assets omitted from the portfolio gallery. */
const EXCLUDED_FILENAME_PATTERNS = [
  /2b stand/i,
  /buser/i,
  /cares/i,
  /fosroc/i,
  /freshy exhi stand/i,
];

export function isExcludedAsset(filename) {
  const nameLower = filename.toLowerCase();
  return EXCLUDED_FILENAME_PATTERNS.some((pattern) => pattern.test(nameLower));
}
