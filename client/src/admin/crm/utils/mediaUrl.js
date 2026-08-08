export function getMediaUrl(url) {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  const envApiUrl = import.meta.env.VITE_API_URL || '';
  const cleanPath = url.startsWith('/') ? url : `/${url}`;

  if (envApiUrl) {
    return `${envApiUrl.replace(/\/$/, '')}${cleanPath}`;
  }

  return cleanPath;
}
