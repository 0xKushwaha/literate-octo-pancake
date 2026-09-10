import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cacheHeaders, securityHeaders, serializeCsp } from './security.config.js';
import { SITE_URL, jsonLdString, meta } from './seo.config.js';

/**
 * Ships the security posture with the build:
 *  - injects the meta CSP into index.html, production only (the dev server
 *    needs an inline module preamble for Fast Refresh, which 'self' forbids)
 *  - emits dist/_headers for Netlify / Cloudflare Pages
 */
function security() {
  return {
    name: 'lumen-security',
    apply: 'build',
    transformIndexHtml(html) {
      const social = [
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Lumen' },
        { property: 'og:title', content: meta.title },
        { property: 'og:description', content: meta.description },
        { property: 'og:url', content: SITE_URL },
        { property: 'og:image', content: meta.ogImage },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: meta.title },
        { name: 'twitter:description', content: meta.description },
        { name: 'twitter:image', content: meta.ogImage },
      ];

      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content: serializeCsp({ forMeta: true }),
            },
            injectTo: 'head-prepend',
          },
          { tag: 'link', attrs: { rel: 'canonical', href: SITE_URL }, injectTo: 'head' },
          ...social.map((attrs) => ({ tag: 'meta', attrs, injectTo: 'head' })),
          {
            tag: 'script',
            attrs: { type: 'application/ld+json' },
            children: jsonLdString,
            injectTo: 'head',
          },
        ],
      };
    },
    generateBundle() {
      const lines = ['# Generated from security.config.js — do not edit by hand.', '', '/*'];
      for (const [k, v] of Object.entries(securityHeaders)) lines.push(`  ${k}: ${v}`);
      for (const [route, headers] of Object.entries(cacheHeaders)) {
        lines.push('', route);
        for (const [k, v] of Object.entries(headers)) lines.push(`  ${k}: ${v}`);
      }
      this.emitFile({ type: 'asset', fileName: '_headers', source: lines.join('\n') + '\n' });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), security()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: { host: true, port: 5173 },
});
