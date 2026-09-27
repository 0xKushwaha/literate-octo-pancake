/**
 * GET /<page> for link-preview bots and search crawlers only.
 *
 * The admin's Search & sharing fields (home page title, site description,
 * link preview picture, the name of each page) would otherwise only reach
 * visitors who run the app: WhatsApp, LinkedIn, Slack and friends read the raw
 * HTML, which is built once at deploy. vercel.json sends crawler requests for
 * the public pages here, and middleware.js does the same for "/". People
 * always get the static index.html, so a problem in this function can never
 * break a page for a person.
 *
 * Same shape as api/blog-page.js: fetch the deployed shell, write the tags,
 * answer. Any field that is not stored, or cannot be read, keeps what the
 * shell was built with.
 */

import { SITE_URL, CRAWLER_PAGES } from '../seo.config.js';
import { publicDbConfig, siteNameFrom, withArticleMeta } from './_lib/seo.js';
import { DEFAULT_NAMES, PAGE_NAME_KEYS } from '../src/lib/pageMeta.js';

const TIMEOUT_MS = 4000;

const LEGAL = {
  '/privacy': { key: 'legal.privacy_title', fallback: 'Privacy policy' },
  '/terms': { key: 'legal.terms_title', fallback: 'Terms of use' },
};

export const PAGE_KEYS = [
  'brand.name', 'seo.home_title', 'seo.description', 'seo.share_image_url',
  ...Object.values(PAGE_NAME_KEYS).map((k) => `seo.${k}`),
  ...Object.values(LEGAL).map((l) => l.key),
];

function shellHost(req) {
  const main = new URL(SITE_URL).host;
  const raw = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  const apex = main.replace(/^www\./, '');
  if (raw === main || raw === apex || /^[a-z0-9-]+\.vercel\.app$/.test(raw)) return raw;
  return main;
}

/** The stored values for PAGE_KEYS, as { key: value }. Throws when unsure. */
export async function fetchPageContent(fetchImpl = fetch) {
  const db = publicDbConfig();
  if (!db) throw new Error('Supabase URL or anon key is not set');
  const list = PAGE_KEYS.map((k) => `"${k}"`).join(',');
  const res = await fetchImpl(
    `${db.url}/rest/v1/site_content?select=key,value&key=in.(${encodeURIComponent(list)})`,
    { headers: { apikey: db.key, Authorization: `Bearer ${db.key}` }, signal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  if (!res.ok) throw new Error(`site_content lookup answered ${res.status}`);
  const rows = await res.json();
  const out = {};
  for (const row of rows ?? []) {
    const v = typeof row?.value === 'string' ? row.value.trim() : '';
    if (v && v !== 'none') out[row.key] = v;
  }
  return out;
}

/** Title, description and picture for one path, from the stored fields. Pure. */
export function pageMetaFor(path, stored, shellSiteName) {
  const site = stored['brand.name'] || shellSiteName;
  let title;
  if (path === '/') title = stored['seo.home_title'];
  else if (LEGAL[path]) title = `${stored[LEGAL[path].key] || LEGAL[path].fallback} · ${site}`;
  else {
    const key = PAGE_NAME_KEYS[path];
    title = `${stored[`seo.${key}`] || DEFAULT_NAMES[key]} · ${site}`;
  }
  const rawImage = stored['seo.share_image_url'];
  let image;
  if (rawImage) {
    try {
      const abs = new URL(rawImage, SITE_URL);
      if (abs.protocol === 'https:') image = abs.href;
    } catch { /* not a usable address: keep the shell's picture */ }
  }
  return {
    title: title || undefined,
    description: stored['seo.description'] || undefined,
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    image,
  };
}

export default async function handler(req, res) {
  const path = String(req.query?.path ?? '/');
  const known = CRAWLER_PAGES.includes(path);

  let shell;
  try {
    const r = await fetch(`https://${shellHost(req)}/index.html`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!r.ok) throw new Error(`index.html answered ${r.status}`);
    shell = await r.text();
  } catch (err) {
    console.error('[page] could not load the app shell', err);
    res.statusCode = 503;
    res.setHeader('Retry-After', '60');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Temporarily unavailable');
    return;
  }

  let html = shell;
  if (known) {
    let stored = {};
    try {
      stored = await fetchPageContent();
    } catch (err) {
      console.error('[page] content lookup failed', err);
    }
    html = withArticleMeta(shell, pageMetaFor(path, stored, siteNameFrom(shell, 'zehnspaces')));
  }

  res.statusCode = known ? 200 : 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Short edge cache: an edited title reaches previews within minutes.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  res.end(html);
}
