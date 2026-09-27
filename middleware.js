/**
 * Vercel Routing Middleware, for the home page only.
 *
 * Crawlers asking for any other public page are sent to api/page.js by a
 * rewrite in vercel.json, but "/" cannot be rewritten there: index.html exists
 * on disk and the file wins. This does the same job for "/": a link-preview
 * bot or search crawler is served api/page.js (the admin's title, description
 * and preview picture in the tags); everyone else passes straight through to
 * the static page, untouched.
 */
import { CRAWLER_UA } from './crawlers.config.js';

export const config = { matcher: '/' };

const CRAWLER = new RegExp(`^${CRAWLER_UA}$`);

export default function middleware(request) {
  try {
    if (!CRAWLER.test(request.headers.get('user-agent') || '')) return undefined;
    const target = new URL('/api/page?path=%2F', request.url);
    return new Response(null, { headers: { 'x-middleware-rewrite': target.href } });
  } catch {
    return undefined;
  }
}
