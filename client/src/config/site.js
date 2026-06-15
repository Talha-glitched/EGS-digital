export const SITE_ORIGIN = 'https://www.exhibitgraphicsign.com';

export function siteUrl(pathname = '/') {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${SITE_ORIGIN}${normalizedPath}`;
}
