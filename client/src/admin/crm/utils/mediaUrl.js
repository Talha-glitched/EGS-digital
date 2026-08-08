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

  // Automatic fallback for production when client and server are on separate domains
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    return `https://api.exhibitgraphicsign.com${cleanPath}`;
  }

  return cleanPath;
}
