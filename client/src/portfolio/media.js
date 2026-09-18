export const PHOTO_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
export const VIDEO_EXTS = ['mp4', 'mov', 'webm'];

export function mediaTypeForFilename(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (PHOTO_EXTS.includes(ext)) return 'photo';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  return null;
}

export function resolveMediaUrl(url) {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  const ext = url.split('.').pop().toLowerCase();
  const isVideo = VIDEO_EXTS.includes(ext);
  const isPhoto = PHOTO_EXTS.includes(ext);
  if (!isVideo && !isPhoto) {
    return url;
  }

  const envApiUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '';
  const clean = url.startsWith('/') ? url : `/${url}`;
  const uploadPath = clean.startsWith('/uploads/') ? clean : `/uploads${clean}`;

  if (envApiUrl) {
    return `${envApiUrl.replace(/\/$/, '')}${uploadPath}`;
  }

  // In production, videos must stream directly from the API server to ensure proper
  // HTTP 206 byte-range streaming without being truncated or corrupted by Vercel edge proxy caching
  if (
    typeof window !== 'undefined' &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')
  ) {
    return `https://api.exhibitgraphicsign.com${uploadPath}`;
  }

  return clean;
}

// Promo-style cuts lead each ceremony's gallery and back its hover background
export function heroRank(name) {
  const n = name.toLowerCase();
  // Penalize .mov files because Chromium on Windows/Android does not support QuickTime (.mov) containers
  const isMov = n.endsWith('.mov');
  const basePenalty = isMov ? 10 : 0;

  if (n.includes('promo')) return 0 + basePenalty;
  if (n.includes('highlight')) return 1 + basePenalty;
  if (n.includes('ceremony')) return 2 + basePenalty;
  if (n.includes('teaser') || n.includes('opener')) return 3 + basePenalty;
  return 4 + basePenalty;
}

export function buildClient({ id, name, category, location, year, items, facts }) {
  const photos = items
    .filter((m) => m.type === 'photo')
    .sort((a, b) => a.name.localeCompare(b.name));
  const videos = items
    .filter((m) => m.type === 'video')
    .sort((a, b) => heroRank(a.name) - heroRank(b.name) || a.name.localeCompare(b.name));

  const hero = videos[0] || photos[0] || null;
  const media = videos.length > 0 ? [videos[0], ...photos, ...videos.slice(1)] : [...photos];
  const cover = photos[0] || hero;

  return { id, name, category, location, year, media, hero, cover, facts, meta: `${location} · ${year}` };
}
