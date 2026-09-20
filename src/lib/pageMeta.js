/**
 * Per-page browser titles and meta descriptions.
 *
 * index.html carries one title and one description for the whole site, so
 * before this every tab, bookmark and search result read the same thing on
 * every page. The layout sets the title for each route; the blog post page and
 * the legal pages set their own once their content has loaded.
 *
 * This only helps browsers and search engines that run JavaScript. Link
 * previews (WhatsApp, LinkedIn, Slack…) read the raw HTML, which is why blog
 * posts are also served with their own tags by api/blog-page.js.
 */

const hasDom = typeof document !== 'undefined';
const readMeta = (selector) => (hasDom ? document.querySelector(selector)?.getAttribute('content') ?? '' : '');

/** What index.html shipped with, captured before anything changes it. */
export const baseMeta = {
  title: hasDom ? document.title : '',
  description: readMeta('meta[name="description"]'),
};

const PAGE_NAMES = {
  '/services': 'Services',
  '/how-it-works': 'How it works',
  '/therapists': 'Our therapists',
  '/pricing': 'Pricing',
  '/resources': 'Resources',
  '/breathe': 'Breathing exercises',
  '/blog': 'Blog',
};

// Pages that set their own title from content they load themselves.
const SELF_TITLED = [/^\/blog\/[^/]+$/, /^\/(privacy|terms)$/];

/**
 * The title for a route, or null when the page sets its own. The home page
 * keeps the site's full title; anything unknown is the 404 page.
 */
export function titleForPath(pathname, brandName, baseTitle = baseMeta.title) {
  const path = String(pathname || '/').replace(/\/+$/, '') || '/';
  if (path === '/') return baseTitle;
  if (SELF_TITLED.some((re) => re.test(path))) return null;
  return `${PAGE_NAMES[path] ?? 'Page not found'} · ${brandName}`;
}

const TITLE_TAGS = ['meta[property="og:title"]', 'meta[name="twitter:title"]'];
const DESCRIPTION_TAGS = ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]'];

export function setPageMeta({ title, description } = {}) {
  if (!hasDom) return;
  if (title) {
    document.title = title;
    for (const s of TITLE_TAGS) document.querySelector(s)?.setAttribute('content', title);
  }
  if (description) {
    for (const s of DESCRIPTION_TAGS) document.querySelector(s)?.setAttribute('content', description);
  }
}
