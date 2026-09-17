/**
 * Shared plumbing for the serverless functions in /api.
 *
 * Vercel does not turn files under a folder that starts with an underscore
 * into routes, so nothing in here is reachable from the internet on its own.
 *
 * Everything that used to be copied between booking.js and community.js lives
 * here now, so a fix to one (the origin check was the first) cannot miss the
 * other.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const isProduction = () => process.env.VERCEL_ENV === 'production';

// ── Origin check ────────────────────────────────────────────────────────────
// Browsers send an Origin header on every POST, same-origin included. The
// first version of this check only accepted origins listed in
// ALLOWED_ORIGINS, and with that variable unset the live site's own forms were
// answered 403 — every signup was silently lost. So:
//
//   1. a request from the same host the function is served on is always fine,
//   2. ALLOWED_ORIGINS (comma separated) adds extra sites, e.g. the apex domain
//      when the site itself is served from www,
//   3. localhost is accepted only outside production, for `vercel dev`.
//
// This is a cross-site request forgery guard, not authentication. A script can
// leave the header out entirely; the rate limit and validation handle that.

function hostOf(value) {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

function requestHosts(req) {
  const hosts = new Set();
  for (const h of [req.headers['x-forwarded-host'], req.headers.host]) {
    if (typeof h === 'string' && h) hosts.add(h.split(',')[0].trim().toLowerCase());
  }
  return hosts;
}

export function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // not a browser cross-site request
  const host = hostOf(origin);
  if (!host) return false;
  if (origin.startsWith('https://') && requestHosts(req).has(host)) return true;

  const extra = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, '').toLowerCase())
    .filter(Boolean);
  if (extra.includes(origin.toLowerCase())) return true;

  if (!isProduction() && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return false;
}

/**
 * Common start of every POST handler. Returns true when the handler should
 * carry on, false when a response has already been sent.
 */
export function guardRequest(req, res, { methods = ['POST'] } = {}) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (!isAllowedOrigin(req)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return false;
  }
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
    res.status(204).end?.();
    return false;
  }
  if (!methods.includes(req.method)) {
    res.setHeader('Allow', methods.join(', '));
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  return true;
}

// ── Body ────────────────────────────────────────────────────────────────────

export class BodyError extends Error {}

/**
 * Reads a JSON object body with a hard size cap.
 *
 * Vercel parses JSON for us when the content type says so; the declared length
 * is still checked, because a parsed body skips the streaming cap below. A body
 * that is not a plain object (an array, a string, null) is refused rather than
 * letting `body.name` read off something unexpected.
 */
export async function readJson(req, maxBytes) {
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyError('payload too large');

  let body = req.body;
  if (body === undefined || body === null || typeof body === 'string' || Buffer.isBuffer(body)) {
    let raw = typeof body === 'string' ? body : Buffer.isBuffer(body) ? body.toString('utf8') : null;
    if (raw === null) {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > maxBytes) throw new BodyError('payload too large');
        chunks.push(chunk);
      }
      raw = Buffer.concat(chunks).toString('utf8');
    }
    if (Buffer.byteLength(raw) > maxBytes) throw new BodyError('payload too large');
    if (!raw.trim()) return {};
    try {
      body = JSON.parse(raw);
    } catch {
      throw new BodyError('invalid json');
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BodyError('not an object');
  return body;
}

/** Constant-time "is this empty", so the honeypot check cannot be timed. */
export function isEmptyHoneypot(value) {
  const given = Buffer.from(String(value ?? '').slice(0, 256));
  const empty = Buffer.alloc(given.length);
  return given.length === 0 || timingSafeEqual(given, empty);
}

// ── Client identity (rate-limit bucket only) ────────────────────────────────

/**
 * Vercel overwrites x-real-ip and x-forwarded-for with the address it saw, so
 * a client cannot choose its own bucket there. x-vercel-forwarded-for is the
 * same value under a name nothing upstream can set. Never an authorisation
 * input — it is only ever a rate-limit key.
 */
export function clientIp(req) {
  const pick = (h) => (typeof h === 'string' && h ? h.split(',')[0].trim() : null);
  return (
    pick(req.headers['x-vercel-forwarded-for']) ||
    pick(req.headers['x-real-ip']) ||
    pick(req.headers['x-forwarded-for']) ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Salted SHA-256. An unsalted hash of an IP is not anonymisation (the IPv4
 * space is small enough to enumerate), so the salt is what makes this a bucket
 * label rather than a reversible identifier. Falls back to the service-role
 * key, which is also long, secret and stable.
 */
export function hashIp(ip) {
  const salt = (process.env.BOOKING_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return createHash('sha256').update(`lumen:${salt}:${ip}`).digest('hex').slice(0, 32);
}

// ── Database ────────────────────────────────────────────────────────────────

let cachedClient = null;

/** Service-role client. Throws when the server environment is incomplete. */
export function adminDb() {
  if (cachedClient) return cachedClient;
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url) throw new Error('no project URL (set VITE_SUPABASE_URL)');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

/**
 * One hit against a fixed-window bucket. Resolves to
 * `{ ok: true }`, `{ ok: false, retryAfter }` or throws on a database error so
 * the caller can fail closed.
 */
export async function consumeRateLimit(db, key, max, windowSeconds) {
  const { data, error } = await db.rpc('consume_rate_limit', {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) throw error;
  if (data && data.allowed === false) {
    return { ok: false, retryAfter: data.retry_after ?? windowSeconds };
  }
  return { ok: true };
}
