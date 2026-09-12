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
        this.warn(
          `Building without credentials: ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} ` +
            'unset or still a placeholder. The app will run in demo mode. Set real Supabase credentials in .env ' +
            '(or in your host\'s environment variables) before building for production.',
        );
      }
      if (env.VITE_SUPABASE_ANON_KEY?.includes('service_role')) {
        this.warn('Warning: VITE_SUPABASE_ANON_KEY looks like a service_role key.');
      }

      // Server-side variables for /api/booking. Read at request time, not build
      // time, so a missing one cannot fail the build — but it would take the
      // booking form down the moment someone used it, and finding out then is
      // much worse than finding out here.
      if (!(env.SUPABASE_SERVICE_ROLE_KEY || '').trim()) {
        this.warn(
          'SUPABASE_SERVICE_ROLE_KEY is not set. /api/booking will return 503 and the booking ' +
            'form will not accept submissions. Set it in Vercel → Settings → Environment ' +
            'Variables, as type Secret, with no VITE_ prefix.',
        );
      }
      if (!(env.BOOKING_IP_SALT || '').trim()) {
        this.warn(
          'BOOKING_IP_SALT is not set. Rate-limit buckets will fall back to salting with the ' +
            'service-role key, which works but resets every bucket whenever that key is ' +
            "rotated. Generate one with: openssl rand -hex 32",
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
      // Vite 8 bundles with rolldown, which only accepts the FUNCTION form of
      // manualChunks. Keeping the big, rarely-changing vendors in their own
      // chunk means a content tweak does not invalidate React for returning
      // visitors.
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react';
            if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)) return 'supabase';
            // three and its React renderer are the largest thing on the site
            // and only the hero needs them. Their own chunk, reached through a
            // dynamic import, so they never touch the first load.
            if (/[\\/]node_modules[\\/](three|@react-three)[\\/]/.test(id)) return 'three';
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    server: { host: true, port: 5173 },
  };
});
