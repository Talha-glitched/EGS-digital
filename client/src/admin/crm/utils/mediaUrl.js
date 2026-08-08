export function getMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const apiUrl = import.meta.env.VITE_API_URL || '';
  if (apiUrl) {
    return `${apiUrl.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
  }
  return url;
}
