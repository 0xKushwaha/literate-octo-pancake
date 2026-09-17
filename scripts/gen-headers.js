/** Regenerates vercel.json and deploy/nginx.conf from security.config.js. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { cacheHeaders, noIndexHeaders, securityHeaders } from '../security.config.js';
import { APP_ROUTES } from '../seo.config.js';

// The SPA fallback, for the app's own routes only.
//
// It used to be a catch-all, so every made-up address answered 200 with the
// home page shell. Now only real routes are rewritten to index.html; anything
// else falls through to 404.html (a copy of index.html emitted by the build),
// which Vercel serves with a genuine 404 status. /api/* and /assets/* are never
// rewritten, so a missing function or chunk is a plain 404 too.
const rewrites = APP_ROUTES.filter((r) => r !== '/').map((source) => ({
  source,
  destination: '/index.html',
}));

// The booking endpoint handles health data. Nothing between the function and
// the browser may hold on to a response.
const apiHeaders = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

const asHeaderList = (obj) => Object.entries(obj).map(([key, value]) => ({ key, value }));

const vercel = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  // The booking function does two round trips to Postgres (rate limit, then
  // insert) and nothing else. 10s is generous; the default 300s just means a
  // stuck request sits there burning the function budget.
  functions: {
    'api/**/*.js': { maxDuration: 10, memory: 1024 },
  },
  // /services/ → /services, so each page has one address and the rewrites
  // above (which list paths without a slash) always match.
  trailingSlash: false,
  rewrites,
  headers: [
    // More specific sources first: Vercel applies every match, and the
    // narrower Cache-Control here must not be re-broadened by a later rule.
    { source: '/api/(.*)', headers: asHeaderList(apiHeaders) },
    { source: '/(.*)', headers: asHeaderList(securityHeaders) },
    // The admin panel has no business in search results.
    { source: '/admin', headers: asHeaderList(noIndexHeaders) },
    { source: '/admin/(.*)', headers: asHeaderList(noIndexHeaders) },
    ...Object.entries(cacheHeaders).map(([source, h]) => ({
      source: source.replace('*', '(.*)'),
      headers: asHeaderList(h),
    })),
  ],
};
writeFileSync('vercel.json', JSON.stringify(vercel, null, 2) + '\n');

const nginx = [
  '# Generated from security.config.js — do not edit by hand.',
  '# include this file from your server{} block.',
  '',
  ...Object.entries(securityHeaders).map(([k, v]) => `add_header ${k} "${v}" always;`),
  '',
  '# SPA fallback. /api/ is excluded: it is proxied to the function runtime.',
  'error_page 404 /404.html;',
  'location / {',
  '  try_files $uri $uri/ =404;',
  '}',
  ...APP_ROUTES.filter((r) => r !== '/' && !r.startsWith('/admin')).map(
    (r) => `location ~ ^${r.replace(/:[a-z]+\*/g, '.*').replace(/:[a-z]+/g, '[^/]+')}/?$ { try_files /index.html =404; }`,
  ),
  'location /admin {',
  ...Object.entries(noIndexHeaders).map(([k, v]) => `  add_header ${k} "${v}" always;`),
  '  try_files /index.html =404;',
  '}',
  'location /assets/ {',
  `  add_header Cache-Control "${cacheHeaders['/assets/*']['Cache-Control']}" always;`,
  '}',
  'location = /index.html {',
  `  add_header Cache-Control "${cacheHeaders['/index.html']['Cache-Control']}" always;`,
  '}',
  'location /api/ {',
  ...Object.entries(apiHeaders).map(([k, v]) => `  add_header ${k} "${v}" always;`),
  '}',
].join('\n');
mkdirSync('deploy', { recursive: true });
writeFileSync('deploy/nginx.conf', nginx + '\n');

console.log('wrote vercel.json and deploy/nginx.conf');
