/**
 * Pure helpers for the two SEO functions (api/blog-page.js, api/sitemap.js).
 * No I/O here, so every rule is unit-tested in tests/seo.test.js.
 */

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sets the content="" of one existing <meta>. The replacement is a function,
 * not a string, so a `$` in an article title cannot be read as a regex
 * back-reference. \s+ spans newlines: index.html writes the description tag
 * across several lines.
 */
function setMeta(html, attr, name, content) {
  const re = new RegExp(`(<meta\\s+${attr}="${name}"\\s+content=")[^"]*(")`, 'i');
  return html.replace(re, (_, open, close) => `${open}${escapeHtml(content)}${close}`);
}

/** The site name the build wrote into og:site_name, so titles match the build. */
export function siteNameFrom(html, fallback = '') {
  return /<meta\s+property="og:site_name"\s+content="([^"]*)"/i.exec(html)?.[1] || fallback;
}

/**
 * The app shell with one article's tags: <title>, description, Open Graph,
 * Twitter card and a canonical link. Anything missing from `meta` keeps the
 * shell's own value.
 */
export function withArticleMeta(html, { title, description, url, image } = {}) {
  let out = html;
  if (title) {
    out = out.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(title)}</title>`);
    out = setMeta(out, 'property', 'og:title', title);
    out = setMeta(out, 'name', 'twitter:title', title);
  }
  if (description) {
    out = setMeta(out, 'name', 'description', description);
    out = setMeta(out, 'property', 'og:description', description);
    out = setMeta(out, 'name', 'twitter:description', description);
  }
  out = setMeta(out, 'property', 'og:type', 'article');
  if (url) {
    out = setMeta(out, 'property', 'og:url', url);
    if (!/<link\s+rel="canonical"/i.test(out)) {
      out = out.replace('</head>', () => `  <link rel="canonical" href="${escapeHtml(url)}">\n  </head>`);
    }
  }
  if (image) {
    out = setMeta(out, 'property', 'og:image', image);
    out = setMeta(out, 'name', 'twitter:image', image);
    // The declared 1200×630 belongs to og.png, not to an uploaded cover.
    out = out.replace(/\s*<meta\s+property="og:image:(width|height)"[^>]*>/gi, '');
  }
  return out;
}

/** entries: [{ loc, lastmod? }] → sitemap XML. lastmod is YYYY-MM-DD or left out. */
export function sitemapXml(entries) {
  const urls = entries.map(({ loc, lastmod }) =>
    `  <url><loc>${escapeHtml(loc)}</loc>${lastmod ? `<lastmod>${escapeHtml(lastmod)}</lastmod>` : ''}</url>`);
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>', ''].join('\n');
}

/** Supabase REST settings for public (anon, RLS-bound) reads. */
export function publicDbConfig(env = process.env) {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const key = (env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim();
  return url && key ? { url, key } : null;
}
