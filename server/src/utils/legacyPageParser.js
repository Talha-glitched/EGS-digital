import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..', '..');

const LEGACY_PAGES = [
  { slug: 'home', fileName: 'index.html', route: '/' },
  { slug: 'exhibitions', fileName: 'exhibitions.html', route: '/exhibitions' },
  { slug: 'events', fileName: 'events.html', route: '/events' },
];

const LINK_REWRITES = [
  ['href="index.html"', 'href="/"'],
  ['href="exhibitions.html"', 'href="/exhibitions"'],
  ['href="events.html"', 'href="/events"'],
  ['href="fitouts.html"', 'href="/fitouts"'],
  ['href="retail.html"', 'href="/retail"'],
  ['href="hct-case-study.html"', 'href="/hct-case-study"'],
  ['src="uploads/', 'src="/uploads/'],
  ['href="uploads/', 'href="/uploads/'],
];

function extractFirstMatch(content, pattern, fallback = '') {
  const match = content.match(pattern);
  return match?.[1]?.trim() ?? fallback;
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&nbsp;', ' ');
}

function rewriteLegacyLinks(html) {
  return LINK_REWRITES.reduce(
    (updated, [from, to]) => updated.replaceAll(from, to),
    html
  );
}

function stripScripts(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').trim();
}

function extractScripts(bodyHtml, sharedJs) {
  const scripts = [];
  const scriptPattern = /<script(?:\s+src="([^"]+)")?[^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of bodyHtml.matchAll(scriptPattern)) {
    const src = match[1];
    const inlineCode = match[2]?.trim();

    if (src === 'shared.js') {
      scripts.push(sharedJs);
      continue;
    }

    if (inlineCode) {
      scripts.push(inlineCode);
    }
  }

  return scripts;
}

async function parseLegacyPage(page, sharedCss, sharedJs) {
  const filePath = path.join(projectRoot, page.fileName);
  const rawHtml = await readFile(filePath, 'utf8');

  const title = decodeHtmlEntities(
    extractFirstMatch(rawHtml, /<title>([\s\S]*?)<\/title>/i, 'EGS')
  );
  const pageCss = extractFirstMatch(rawHtml, /<style>([\s\S]*?)<\/style>/i, '');
  const bodyHtml = extractFirstMatch(rawHtml, /<body[^>]*>([\s\S]*?)<\/body>/i, '');
  const scripts = extractScripts(bodyHtml, sharedJs);

  return {
    slug: page.slug,
    route: page.route,
    fileName: page.fileName,
    title,
    sourceFile: page.fileName,
    sharedCss,
    pageCss,
    bodyHtml: rewriteLegacyLinks(stripScripts(bodyHtml)),
    scripts,
    seedSource: 'legacy-html',
  };
}

export async function parseLegacyPages() {
  const sharedCssPath = path.join(projectRoot, 'shared.css');
  const sharedJsPath = path.join(projectRoot, 'shared.js');
  const [sharedCss, sharedJs] = await Promise.all([
    readFile(sharedCssPath, 'utf8'),
    readFile(sharedJsPath, 'utf8'),
  ]);

  return Promise.all(
    LEGACY_PAGES.map((page) => parseLegacyPage(page, sharedCss, sharedJs))
  );
}
