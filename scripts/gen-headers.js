/** Regenerates vercel.json and deploy/nginx.conf from security.config.js. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { cacheHeaders, securityHeaders } from '../security.config.js';

const vercel = {
  headers: [
    { source: '/(.*)', headers: Object.entries(securityHeaders).map(([key, value]) => ({ key, value })) },
    ...Object.entries(cacheHeaders).map(([source, h]) => ({
      source: source.replace('*', '(.*)'),
      headers: Object.entries(h).map(([key, value]) => ({ key, value })),
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
  'location /assets/ {',
  `  add_header Cache-Control "${cacheHeaders['/assets/*']['Cache-Control']}" always;`,
  '}',
  'location = /index.html {',
  `  add_header Cache-Control "${cacheHeaders['/index.html']['Cache-Control']}" always;`,
  '}',
].join('\n');
mkdirSync('deploy', { recursive: true });
writeFileSync('deploy/nginx.conf', nginx + '\n');

console.log('wrote vercel.json and deploy/nginx.conf');
