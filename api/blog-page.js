/**
 * GET /blog/:slug for link-preview bots and search crawlers only.
 *
 * WhatsApp, LinkedIn, Slack, Facebook and friends read a page's raw HTML and
 * never run the app, so every shared article used to preview as the home page.
 * vercel.json sends requests whose user agent matches CRAWLER_UA
 * (seo.config.js) here; everyone else still gets the static index.html, so a
 * problem in this function can never break the page for a person.
 *
 * It fetches the deployed app shell, writes the article's title, summary,
 * cover and canonical URL into the tags, and answers 404 (with the same shell)
 * for a slug that is not a published article. Reads use the public anon key,
 * so RLS keeps drafts out exactly as it does in the browser.
 */

import { SITE_URL } from '../seo.config.js';
import { summarize } from '../src/lib/textSummary.js';
import { publicDbConfig, siteNameFrom, withArticleMeta } from './_lib/seo.js';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,199}$/;
const TIMEOUT_MS = 4000;

/**
 * Only fetch the shell from a host this site is actually served on, so a
 * forged Host header cannot make the function fetch and reflect another site.
 */
function shellHost(req) {
  const main = new URL(SITE_URL).host;
  const raw = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  const apex = main.replace(/^www\./, '');
  if (raw === main || raw === apex || /^[a-z0-9-]+\.vercel\.app$/.test(raw)) return raw;
  return main;
}

/** The published article, null when there is none, or throws when unsure. */
export async function fetchPublishedArticle(slug, fetchImpl = fetch) {
  const db = publicDbConfig();
  if (!db) throw new Error('Supabase URL or anon key is not set');
  const headers = { apikey: db.key, Authorization: `Bearer ${db.key}` };
  const query = (cols) =>
    `${db.url}/rest/v1/articles?select=${cols}&slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&limit=1`;

  let res = await fetchImpl(query('title,slug,excerpt,content,cover_image'), { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  // A database without migration 008 has no cover column; ask again without it.
  if (res.status === 400) {
    res = await fetchImpl(query('title,slug,excerpt,content'), { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  }
  if (!res.ok) throw new Error(`articles lookup answered ${res.status}`);
  const rows = await res.json();
  return rows?.[0] ?? null;
}

export default async function handler(req, res) {
  const slug = String(req.query?.slug ?? '').toLowerCase();

  let shell;
  try {
    const r = await fetch(`https://${shellHost(req)}/index.html`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!r.ok) throw new Error(`index.html answered ${r.status}`);
    shell = await r.text();
  } catch (err) {
    console.error('[blog-page] could not load the app shell', err);
    res.statusCode = 503;
    res.setHeader('Retry-After', '60');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Temporarily unavailable');
    return;
  }

  let status = 200;
  let html = shell;
  if (!SLUG_RE.test(slug)) {
    status = 404;
  } else {
    try {
      const article = await fetchPublishedArticle(slug);
      if (!article) {
        status = 404;
      } else {
        const site = siteNameFrom(shell, 'zehnspaces');
        html = withArticleMeta(shell, {
          title: `${article.title} · ${site}`,
          description: article.excerpt?.trim() || summarize(article.content) || undefined,
          url: `${SITE_URL}/blog/${article.slug}`,
          image: /^https:\/\//.test(article.cover_image || '') ? article.cover_image : undefined,
        });
      }
    } catch (err) {
      // Unsure whether the post exists: serve the plain shell rather than a 404.
      console.error('[blog-page] article lookup failed', err);
    }
  }

  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Short edge cache: an edited title reaches previews within minutes.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  res.end(html);
}
