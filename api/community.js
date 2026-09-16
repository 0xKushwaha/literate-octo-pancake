/**
 * POST /api/community — the only write path into community_signups.
 *
 * Same reasoning as /api/booking, and deliberately the same shape: an
 * unauthenticated form writing to the database gets no anonymous INSERT
 * policy, because a public policy means every bound, every rate limit and
 * every bot check lives in code the submitter controls. Here they live on the
 * server and the service-role key never reaches the browser.
 *
 * Lighter than the booking endpoint in one respect only — an email address is
 * not a mental-health disclosure — so it keeps the rate limit, the honeypot
 * and the validation, and skips the rest.
 *
 * Environment variables: SUPABASE_SERVICE_ROLE_KEY, and BOOKING_IP_SALT if set
 * (shared with the booking endpoint; both are only ever used to salt a hash).
 *
 * Runs as a Vercel Node serverless function.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { LIMITS, isEmail, normalise } from '../src/booking/validate.js';

const MAX_BODY_BYTES = 4 * 1024;
const RATE_MAX = 5; // submissions
const RATE_WINDOW_SECONDS = 900; // per 15 minutes, per IP

// ── CORS ────────────────────────────────────────────────────────────────────
// Same origin enforcement as /api/booking. Without it any website can submit
// email addresses on behalf of its visitors.
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);
ALLOWED_ORIGINS.add('http://localhost:5173');

function corsHeaders(req, res) {
  const origin = req.headers.origin;
  if (!origin) return true;
  if (!ALLOWED_ORIGINS.has(origin)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  return true;
}

function projectUrl() {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
}

let cachedClient = null;
function admin() {
  if (cachedClient) return cachedClient;
  const url = projectUrl();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url) throw new Error('community api: no project URL (set VITE_SUPABASE_URL)');
  if (!key) throw new Error('community api: SUPABASE_SERVICE_ROLE_KEY not set');
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

/** Left-most x-forwarded-for entry. Only ever a rate-limit bucket. */
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

/**
 * Salted SHA-256. An unsalted hash of an IP is not anonymisation — the IPv4
 * space is small enough to enumerate — so the salt is what makes this a bucket
 * label rather than a reversible identifier.
 */
function hashIp(ip) {
  const salt = (process.env.BOOKING_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return createHash('sha256').update(`lumen:${salt}:${ip}`).digest('hex').slice(0, 32);
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('payload too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** Constant-time compare so the honeypot check cannot be timed. */
function isEmptyHoneypot(value) {
  const given = Buffer.from(String(value ?? ''));
  const empty = Buffer.alloc(given.length);
  return given.length === 0 || timingSafeEqual(given, empty);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // ── CORS: reject cross-origin requests from unknown sites ─────────────
  if (!corsHeaders(req, res)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    return res.status(400).json({ error: 'Could not read that request.' });
  }

  // A bot that filled the hidden field is answered as if it worked. Telling it
  // why it failed is free tuning data.
  if (!isEmptyHoneypot(body.company)) {
    return res.status(200).json({ joined: true });
  }

  const email = normalise(body.email, { maxLength: LIMITS.email }).toLowerCase();
  if (!isEmail(email)) {
    return res.status(422).json({ error: 'That email address does not look right.' });
  }
  const source = normalise(body.source, { maxLength: 120 }) || null;

  const ipHash = hashIp(clientIp(req));
  let db;
  try {
    db = admin();
  } catch (err) {
    console.error('[community]', err.message);
    return res.status(503).json({ error: 'Could not reach the database. Try again in a moment.' });
  }

  const { data: limit, error: limitError } = await db.rpc('consume_rate_limit', {
    p_key: `community:${ipHash}`,
    p_max: RATE_MAX,
    p_window_seconds: RATE_WINDOW_SECONDS,
  });

  if (limitError) {
    // Fail closed, like the booking endpoint: an open write path is worse than
    // a signup the visitor can retry.
    console.error('[community] rate limit check failed', limitError);
    return res.status(503).json({ error: 'Could not reach the database. Try again in a moment.' });
  }
  if (limit && limit.allowed === false) {
    res.setHeader('Retry-After', String(limit.retry_after ?? RATE_WINDOW_SECONDS));
    return res.status(429).json({ error: 'That is a few attempts in a short time. Try again shortly.' });
  }

  const { error } = await db.from('community_signups').insert({ email, source, ip_hash: ipHash });

  if (error) {
    // 23505 is the unique index on lower(email): they are already on the list.
    // Somebody submitting twice wants the invite, not an error message.
    if (error.code === '23505') return res.status(200).json({ joined: true, already: true });
    console.error('[community] insert failed', error.code, error.message);
    return res.status(500).json({ error: 'We could not save that. Try again in a moment.' });
  }

  return res.status(201).json({ joined: true });
}
