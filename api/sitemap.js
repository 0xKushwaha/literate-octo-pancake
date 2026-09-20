/**
 * GET /sitemap.xml (rewritten here by vercel.json).
 *
 * The build used to write a fixed sitemap of the main pages, so no article
 * was ever listed. This adds every published article, straight from the
 * database, so a new post is discoverable without a redeploy. If the database
 * cannot be reached it still answers with the main pages.
 */

import { SITEMAP_ROUTES, SITE_URL } from '../seo.config.js';
import { publicDbConfig, sitemapXml } from './_lib/seo.js';

export async function fetchPublishedPosts(fetchImpl = fetch) {
  const db = publicDbConfig();
  if (!db) throw new Error('Supabase URL or anon key is not set');
  const res = await fetchImpl(
    `${db.url}/rest/v1/articles?select=slug,updated_at,published_at&is_published=eq.true&order=published_at.desc&limit=1000`,
    { headers: { apikey: db.key, Authorization: `Bearer ${db.key}` }, signal: AbortSignal.timeout(4000) },
  );
  if (!res.ok) throw new Error(`articles lookup answered ${res.status}`);
  return res.json();
}

export function sitemapEntries(posts = []) {
  const pages = SITEMAP_ROUTES.map((r) => ({ loc: `${SITE_URL}${r}` }));
  const articles = posts
    .filter((p) => p?.slug)
    .map((p) => ({ loc: `${SITE_URL}/blog/${encodeURIComponent(p.slug)}`, lastmod: String(p.updated_at || p.published_at || '').slice(0, 10) || undefined }));
  return [...pages, ...articles];
}

export default async function handler(req, res) {
  let posts = [];
  try {
    posts = await fetchPublishedPosts();
  } catch (err) {
    console.error('[sitemap] could not list articles; serving the main pages only', err);
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.end(sitemapXml(sitemapEntries(posts)));
}
