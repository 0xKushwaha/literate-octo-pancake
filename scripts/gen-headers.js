/** Regenerates vercel.json and deploy/nginx.conf from security.config.js. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { cacheHeaders, securityHeaders } from '../security.config.js';

// The SPA fallback. Every route except the hashed asset folder and the
// serverless functions must serve index.html, or /blog/<slug> and /admin/*
// return 404 on a hard refresh.
//
// `api/` has to be excluded explicitly. Without it the rewrite swallows
// /api/booking, the form posts to an HTML page, and the failure surfaces as a
// JSON parse error that points nowhere near the cause.
const rewrites = [{ source: '/((?!api/|assets/).*)', destination: '/index.html' }];

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
  rewrites,
  headers: [
    // More specific sources first: Vercel applies every match, and the
    // narrower Cache-Control here must not be re-broadened by a later rule.
    { source: '/api/(.*)', headers: asHeaderList(apiHeaders) },
    { source: '/(.*)', headers: asHeaderList(securityHeaders) },
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
  'location / {',
  '  try_files $uri $uri/ /index.html;',
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
