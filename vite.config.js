import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
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

/**
 * Fails the production build when the backend is not configured.
 *
 * Without this, `vite build` happily produces a bundle that runs in demo mode:
 * fixture data on the public site and a hard-coded admin password printed on
 * the login screen. That is a fine dev experience and a terrible deploy, and
 * the two are indistinguishable until someone finds the login page.
 */
function requireEnv(env) {
  return {
    name: 'lumen-require-env',
    apply: 'build',
    buildStart() {
      const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((k) => {
        const v = (env[k] || '').trim();
        return !v || /your-project-ref|your-anon-key-here|placeholder/i.test(v);
      });
      if (missing.length) {
        throw new Error(
          `Refusing to build: ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} ` +
            'unset or still a placeholder. Set real Supabase credentials in .env ' +
            '(or in your host\'s environment variables) before building for production.',
        );
      }
      if (env.VITE_SUPABASE_ANON_KEY?.includes('service_role')) {
        throw new Error('Refusing to build: VITE_SUPABASE_ANON_KEY looks like a service_role key.');
      }

      // Server-side variables for /api/booking. These are read at request time,
      // not build time, so a missing one cannot fail the build — but it would
      // take the booking form down the moment someone used it, and finding out
      // then is much worse than finding out here.
      const serverVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'BOOKING_IP_SALT'];
      const missingServer = serverVars.filter((k) => !(env[k] || '').trim());
      if (missingServer.length) {
        this.warn(
          `${missingServer.join(', ')} not set. /api/booking will return 503 and the booking ` +
            'form will not accept submissions. Set these in Vercel → Settings → Environment Variables.',
        );
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), security(), requireEnv(env)],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    build: {
      // three.js + @react-three ship a large amount of code that the homepage
      // hero needs on first paint; splitting it out keeps the shared vendor
      // chunk cacheable across deploys instead of invalidating on every change.
      //
      // Vite 8 bundles with rolldown, which only accepts the FUNCTION form of
      // manualChunks. The object form is silently ignored with a warning, so
      // the split would not have happened at all.
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (/[\\/]node_modules[\\/](three|@react-three)[\\/]/.test(id)) return 'three';
          },
        },
      },
      chunkSizeWarningLimit: 900,
    },
    server: { host: true, port: 5173 },
  };
});
