export const PHOTO_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
export const VIDEO_EXTS = ['mp4', 'mov', 'webm'];

export function mediaTypeForFilename(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (PHOTO_EXTS.includes(ext)) return 'photo';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  return null;
}

// Promo-style cuts lead each ceremony's gallery and back its hover background
export function heroRank(name) {
  const n = name.toLowerCase();
  if (n.includes('promo')) return 0;
  if (n.includes('highlight')) return 1;
  if (n.includes('ceremony')) return 2;
  if (n.includes('teaser') || n.includes('opener')) return 3;
  return 4;
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
