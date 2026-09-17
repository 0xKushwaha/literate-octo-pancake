/**
 * Single source of truth for the site's security posture.
 *
 * Consumed by:
 *   - vite.config.js  — injects the meta CSP (production build only) and emits
 *                       dist/_headers for Netlify / Cloudflare Pages
 *   - scripts/gen-headers.js — writes vercel.json and deploy/nginx.conf
 *
 * Keeping it in one place is the point: a CSP that drifts between the meta tag
 * and the real headers is worse than no CSP, because it looks enforced.
 */

import { jsonLdHash } from './seo.config.js';

export const csp = {
  'default-src': ["'self'"],
  // Vite emits an external module bundle, so the only inline script is the
  // JSON-LD block — pinned by hash rather than opened up with 'unsafe-inline'.
  // The hash is derived from the exact string that gets injected, so the two
  // cannot drift.
  'script-src': ["'self'", jsonLdHash],
  // Split rather than blanket-relaxed.
  //
  // style-src-elem must allow inline because react-remove-scroll-bar (a
  // transitive dep of Radix Dialog) injects a <style> element to lock body
  // scroll, and its padding-right is computed from the visitor's scrollbar
  // width — so there is no stable hash to pin, and a nonce needs a server we
  // do not have on a static deploy.
  //
  // style-src-attr stays 'none': nothing here writes a style *attribute*.
  // React, Radix and motion all set styles through the CSSOM, which CSP does
  // not govern, so the common injection vector stays closed.
  'style-src': ["'self'"],
  'style-src-elem': ["'self'", "'unsafe-inline'"],
  'style-src-attr': ["'none'"],
  // Photos are admin-editable fields holding any https URL (the defaults are
  // Unsplash), so the host cannot be enumerated here. Images are inert — they
  // cannot execute — and every other directive stays locked down.
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'"],
  // Supabase API calls from the browser.
  'connect-src': ["'self'", 'https://*.supabase.co'],
  'object-src': ["'none'"],
  'base-uri': ["'none'"],
  'form-action': ["'self'"],
  // youtube-nocookie.com: embeds without tracking cookies. Used in the video modal.
  'frame-src': ['https://www.youtube-nocookie.com'],
  'manifest-src': ["'self'"],
  // Ignored inside a <meta> tag — only meaningful as a real header.
  'frame-ancestors': ["'none'"],
  'report-uri': ['/api/csp-report'],
  'upgrade-insecure-requests': [],
};

/** Directives that a <meta http-equiv> CSP cannot enforce. */
const META_UNSUPPORTED = new Set(['frame-ancestors', 'report-uri', 'report-to', 'sandbox']);

export function serializeCsp({ forMeta = false } = {}) {
  return Object.entries(csp)
    .filter(([directive]) => !(forMeta && META_UNSUPPORTED.has(directive)))
    .map(([directive, values]) => (values.length ? `${directive} ${values.join(' ')}` : directive))
    .join('; ');
}

export const securityHeaders = {
  'Content-Security-Policy': serializeCsp(),
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'X-Frame-Options': 'DENY',
  'X-DNS-Prefetch-Control': 'off',
};

/** Sent on /admin and everything under it. */
export const noIndexHeaders = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'no-store',
};

export const cacheHeaders = {
  '/assets/*': { 'Cache-Control': 'public, max-age=31536000, immutable' },
  '/index.html': { 'Cache-Control': 'no-cache' },
};
