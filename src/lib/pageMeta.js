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

/**
 * Which `seo.*` field names each route in the browser tab. The words
 * themselves are admin fields (Site content → Everywhere → Search & sharing);
 * these defaults match the schema's and only matter before content loads.
 */
export const PAGE_NAME_KEYS = {
  '/services': 'page_services',
  '/how-it-works': 'page_how',
  '/therapists': 'page_therapists',
  '/pricing': 'page_pricing',
  '/resources': 'page_resources',
  '/breathe': 'page_breathe',
  '/blog': 'page_blog',
};

export const DEFAULT_NAMES = {
  page_services: 'Services',
  page_how: 'How it works',
  page_therapists: 'Our therapists',
  page_pricing: 'Pricing',
  page_resources: 'Resources',
  page_breathe: 'Breathing exercises',
  page_blog: 'Blog',
  page_notfound: 'Page not found',
};

// Pages that set their own title from content they load themselves.
const SELF_TITLED = [/^\/blog\/[^/]+$/, /^\/(privacy|terms)$/];

/**
 * The title for a route, or null when the page sets its own. The home page
 * keeps the site's full title; anything unknown is the 404 page.
 */
export function titleForPath(pathname, brandName, baseTitle = baseMeta.title, names = {}) {
  const path = String(pathname || '/').replace(/\/+$/, '') || '/';
  if (path === '/') return baseTitle;
  if (SELF_TITLED.some((re) => re.test(path))) return null;
  const key = PAGE_NAME_KEYS[path] ?? 'page_notfound';
  return `${names[key] || DEFAULT_NAMES[key]} · ${brandName}`;
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

const IMAGE_TAGS = ['meta[property="og:image"]', 'meta[name="twitter:image"]'];

/** Points the share-preview tags at a picture (made absolute for crawlers). */
export function setShareImage(url) {
  if (!hasDom || !url) return;
  const absolute = new URL(url, window.location.origin).href;
  for (const s of IMAGE_TAGS) document.querySelector(s)?.setAttribute('content', absolute);
}

/** Swaps the browser-tab icon. The type is dropped so a PNG is not read as SVG. */
export function setFavicon(url) {
  if (!hasDom || !url) return;
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  if (link.getAttribute('href') === url) return;
  link.removeAttribute('type');
  link.setAttribute('href', url);
}
