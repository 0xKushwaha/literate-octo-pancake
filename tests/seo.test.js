import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { escapeHtml, sitemapXml, siteNameFrom, withArticleMeta } from '../api/_lib/seo.js';
import blogPage from '../api/blog-page.js';
import sitemap, { sitemapEntries } from '../api/sitemap.js';
import { CRAWLER_UA, SITEMAP_ROUTES, SITE_URL } from '../seo.config.js';
import { summarize } from '../src/lib/textSummary.js';
import { titleForPath } from '../src/lib/pageMeta.js';

// The head exactly as the production build writes it (description tag across lines).
const SHELL = `<!doctype html>
<html lang="en-IN">
  <head>
    <title>zehnspaces — Therapy that meets you where you are</title>
    <meta
      name="description"
      content="Site description."
    />
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="zehnspaces">
    <meta property="og:title" content="zehnspaces — Therapy that meets you where you are">
    <meta property="og:description" content="Site description.">
    <meta property="og:url" content="https://www.zehnspaces.com">
    <meta property="og:image" content="https://www.zehnspaces.com/og.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="zehnspaces — Therapy that meets you where you are">
    <meta name="twitter:description" content="Site description.">
    <meta name="twitter:image" content="https://www.zehnspaces.com/og.png">
  </head>
  <body><div id="root"></div></body>
</html>`;

const tag = (html, attr, name) => new RegExp(`<meta\\s+${attr}="${name}"\\s+content="([^"]*)"`).exec(html)?.[1];

describe('withArticleMeta', () => {
  const out = withArticleMeta(SHELL, {
    title: 'Sleep & "worry" <at> 2am · zehnspaces',
    description: 'Costs $1 and $& nothing.',
    url: 'https://www.zehnspaces.com/blog/sleep',
    image: 'https://x.supabase.co/storage/v1/object/public/media/articles/a.webp',
  });

  it('replaces the title and every title tag, escaped', () => {
    expect(out).toContain('<title>Sleep &amp; &quot;worry&quot; &lt;at&gt; 2am · zehnspaces</title>');
    expect(tag(out, 'property', 'og:title')).toBe('Sleep &amp; &quot;worry&quot; &lt;at&gt; 2am · zehnspaces');
    expect(tag(out, 'name', 'twitter:title')).toBe('Sleep &amp; &quot;worry&quot; &lt;at&gt; 2am · zehnspaces');
  });

  it('replaces the multi-line description and keeps $ literal', () => {
    expect(tag(out, 'name', 'description')).toBe('Costs $1 and $&amp; nothing.');
    expect(tag(out, 'property', 'og:description')).toBe('Costs $1 and $&amp; nothing.');
  });

  it('marks it an article with a canonical URL, added once', () => {
    expect(tag(out, 'property', 'og:type')).toBe('article');
    expect(tag(out, 'property', 'og:url')).toBe('https://www.zehnspaces.com/blog/sleep');
    expect(out.match(/rel="canonical"/g)).toHaveLength(1);
    expect(withArticleMeta(out, { url: 'https://www.zehnspaces.com/blog/sleep' }).match(/rel="canonical"/g)).toHaveLength(1);
  });

  it('uses the cover and drops the og.png dimensions', () => {
    expect(tag(out, 'property', 'og:image')).toContain('/articles/a.webp');
    expect(tag(out, 'name', 'twitter:image')).toContain('/articles/a.webp');
    expect(out).not.toContain('og:image:width');
  });

  it('keeps the shell image and dimensions when there is no cover', () => {
    const plain = withArticleMeta(SHELL, { title: 'T' });
    expect(tag(plain, 'property', 'og:image')).toBe('https://www.zehnspaces.com/og.png');
    expect(plain).toContain('og:image:width');
  });

  it('reads the site name from the shell', () => {
    expect(siteNameFrom(SHELL)).toBe('zehnspaces');
    expect(siteNameFrom('<html></html>', 'fallback')).toBe('fallback');
  });
});

describe('summarize', () => {
  it('strips tags and entities', () => {
    expect(summarize('<p>Hello&nbsp;<b>world</b> &amp; more</p><script>x()</script>')).toBe('Hello world & more');
  });
  it('cuts on a word boundary with an ellipsis', () => {
    const s = summarize('word '.repeat(80), 40);
    expect(s.length).toBeLessThanOrEqual(40);
    expect(s.endsWith('…')).toBe(true);
    expect(s).not.toMatch(/\s…$/);
  });
  it('handles empty input', () => {
    expect(summarize(null)).toBe('');
  });
});

describe('titleForPath', () => {
  const base = 'zehnspaces — Therapy';
  it('keeps the site title on the home page', () => {
    expect(titleForPath('/', 'ZehnSpaces', base)).toBe(base);
  });
  it('names each page', () => {
    expect(titleForPath('/services', 'ZehnSpaces', base)).toBe('Services · ZehnSpaces');
    expect(titleForPath('/blog/', 'ZehnSpaces', base)).toBe('Blog · ZehnSpaces');
  });
  it('leaves self-titled pages alone', () => {
    expect(titleForPath('/blog/some-post', 'Z', base)).toBeNull();
    expect(titleForPath('/privacy', 'Z', base)).toBeNull();
    expect(titleForPath('/terms', 'Z', base)).toBeNull();
  });
  it('calls anything else not found', () => {
    expect(titleForPath('/nope', 'Z', base)).toBe('Page not found · Z');
  });
});

describe('CRAWLER_UA', () => {
  const re = new RegExp(`^${CRAWLER_UA}$`);
  it.each([
    'WhatsApp/2.23.20.0 A',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
    'TelegramBot (like TwitterBot)',
    'Twitterbot/1.0',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  ])('matches %s', (ua) => expect(re.test(ua)).toBe(true));

  it.each([
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36',
  ])('leaves a browser alone: %s', (ua) => expect(re.test(ua)).toBe(false));
});

function mockRes() {
  const r = { statusCode: 0, headers: {}, body: null };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.end = (b) => { r.body = b; return r; };
  return r;
}

const env = { ...process.env };
let calls;
function stubFetch({ shellStatus = 200, rows = [], dbStatus = 200, dbThrows = false } = {}) {
  calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    calls.push(String(url));
    if (String(url).endsWith('/index.html')) return new Response(SHELL, { status: shellStatus });
    if (dbThrows) throw new Error('network down');
    return new Response(JSON.stringify(rows), { status: dbStatus });
  }));
}

beforeEach(() => {
  process.env.VITE_SUPABASE_URL = 'https://db.example.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
});
afterEach(() => { process.env = { ...env }; vi.unstubAllGlobals(); });

describe('api/blog-page', () => {
  const req = (slug, host = 'www.zehnspaces.com') => ({ query: { slug }, headers: { host } });
  const article = { title: 'How to sleep', slug: 'how-to-sleep', excerpt: '', content: '<p>Some <b>tips</b> for rest.</p>', cover_image: 'https://db.example.supabase.co/storage/v1/object/public/media/articles/c.webp' };

  it('serves the article with its own tags', async () => {
    stubFetch({ rows: [article] });
    const res = mockRes();
    await blogPage(req('how-to-sleep'), res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.body).toContain('<title>How to sleep · zehnspaces</title>');
    expect(tag(res.body, 'property', 'og:description')).toBe('Some tips for rest.');
    expect(tag(res.body, 'property', 'og:image')).toContain('/articles/c.webp');
    expect(res.body).toContain(`<link rel="canonical" href="${SITE_URL}/blog/how-to-sleep">`);
    // published only, looked up by slug
    expect(calls.find((u) => u.includes('/rest/v1/articles'))).toMatch(/slug=eq\.how-to-sleep&is_published=eq\.true/);
  });

  it('answers 404 with the plain shell for a post that does not exist', async () => {
    stubFetch({ rows: [] });
    const res = mockRes();
    await blogPage(req('missing'), res);
    expect(res.statusCode).toBe(404);
    expect(res.body).toBe(SHELL);
  });

  it('never queries the database for a malformed slug', async () => {
    stubFetch();
    const res = mockRes();
    await blogPage(req('../../etc<script>'), res);
    expect(res.statusCode).toBe(404);
    expect(calls.some((u) => u.includes('/rest/v1/'))).toBe(false);
  });

  it('serves the plain shell with 200 when the database is unreachable', async () => {
    stubFetch({ dbThrows: true });
    const res = mockRes();
    await blogPage(req('how-to-sleep'), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(SHELL);
  });

  it('refuses to fetch the shell from a forged host', async () => {
    stubFetch({ rows: [article] });
    await blogPage(req('how-to-sleep', 'evil.example'), mockRes());
    expect(calls[0]).toBe('https://www.zehnspaces.com/index.html');
  });

  it('uses the preview deployment host on vercel.app', async () => {
    stubFetch({ rows: [article] });
    await blogPage(req('how-to-sleep', 'literate-octo-pancake.vercel.app'), mockRes());
    expect(calls[0]).toBe('https://literate-octo-pancake.vercel.app/index.html');
  });

  it('answers 503 when the shell itself cannot be loaded', async () => {
    stubFetch({ shellStatus: 500 });
    const res = mockRes();
    await blogPage(req('how-to-sleep'), res);
    expect(res.statusCode).toBe(503);
  });
});

describe('api/sitemap', () => {
  it('lists the main pages and every published article', async () => {
    stubFetch({ rows: [{ slug: 'a-post', updated_at: '2026-09-18T10:00:00Z' }, { slug: 'b', published_at: '2026-09-01T00:00:00Z' }] });
    const res = mockRes();
    await sitemap({ headers: {} }, res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/xml/);
    for (const r of SITEMAP_ROUTES) expect(res.body).toContain(`<loc>${SITE_URL}${r}</loc>`);
    expect(res.body).toContain(`<loc>${SITE_URL}/blog/a-post</loc><lastmod>2026-09-18</lastmod>`);
    expect(res.body).toContain(`<loc>${SITE_URL}/blog/b</loc><lastmod>2026-09-01</lastmod>`);
    expect(calls[0]).toMatch(/is_published=eq\.true/);
  });

  it('still answers with the main pages when the database fails', async () => {
    stubFetch({ dbStatus: 500 });
    const res = mockRes();
    await sitemap({ headers: {} }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.match(/<url>/g)).toHaveLength(SITEMAP_ROUTES.length);
  });

  it('escapes and never lists a row without a slug', () => {
    expect(sitemapEntries([{ slug: null }, { slug: 'x' }]).length).toBe(SITEMAP_ROUTES.length + 1);
    expect(sitemapXml([{ loc: 'https://a/?a=1&b=2' }])).toContain('<loc>https://a/?a=1&amp;b=2</loc>');
    expect(escapeHtml(`<'">`)).toBe('&lt;&#39;&quot;&gt;');
  });
});
