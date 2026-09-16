/**
 * POST /api/booking — the only write path into booking_submissions.
 *
 * Why this exists rather than the browser talking to Supabase directly:
 * the table takes free-text mental-health disclosures from an unauthenticated
 * form. A public INSERT policy means every field bound, every rate limit and
 * every bot check lives in code the submitter controls. Here they live on the
 * server, the service-role key never reaches the browser, and migration 006
 * removes the anonymous INSERT policy so this is the only door.
 *
 * Runs as a Vercel Node serverless function.
 *
 * Environment variables (Project Settings → Environment Variables):
 *   SUPABASE_SERVICE_ROLE_KEY  — required. Server-only; no VITE_ prefix, ever.
 *   BOOKING_IP_SALT            — optional but recommended. Any long random
 *                                string; salts the IP hash. See hashIp below
 *                                for what happens when it is absent.
 *
 * The project URL is NOT a separate variable. Every project environment
 * variable is visible to the function runtime as process.env, prefix or no
 * prefix — VITE_ only means something to Vite at build time. So this reads
 * VITE_SUPABASE_URL directly rather than making you maintain the same URL
 * twice under two names that can drift apart.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { LIMITS, isEmail, isPhone, normalise, MIN_FILL_MS } from '../src/booking/validate.js';

// ── Bounds the client cannot argue with ─────────────────────────────────────
const MAX_BODY_BYTES = 16 * 1024;
const MAX_CONCERNS = 12;
const RATE_MAX = 3; // submissions
const RATE_WINDOW_SECONDS = 900; // per 15 minutes, per IP

const ALLOWED_WHO = ['individual', 'couples', 'teen', 'psychiatry'];
const ALLOWED_FORMAT = ['video', 'phone', 'in-person'];
const ALLOWED_CADENCE = ['weekly', 'fortnightly', 'monthly', 'once'];

// ── CORS ────────────────────────────────────────────────────────────────────
// Without origin validation any website can POST here on behalf of its
// visitors, flooding the inbox or exhausting rate-limit buckets for real users.
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);
// Always allow the Vite dev server so `npm run dev` keeps working.
ALLOWED_ORIGINS.add('http://localhost:5173');

function corsHeaders(req, res) {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin or non-browser client — allow
  if (!ALLOWED_ORIGINS.has(origin)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  return true;
}

/** The project URL, under whichever name it is configured. */
function projectUrl() {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
}

let cachedClient = null;
function admin() {
  if (cachedClient) return cachedClient;
  const url = projectUrl();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url) throw new Error('booking api: no project URL (set VITE_SUPABASE_URL)');
  if (!key) throw new Error('booking api: SUPABASE_SERVICE_ROLE_KEY not set');
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

/**
 * Vercel sets x-forwarded-for; the left-most entry is the client as seen by the
 * edge. Never trust it for authorisation — it is only ever a rate-limit bucket.
 */
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

/**
 * The raw IP is never stored. Salted SHA-256 gives a stable bucket for rate
 * limiting and abuse review without keeping an identifier for a table of
 * mental-health enquiries.
 */
function hashIp(ip) {
  // An unsalted SHA-256 of an IP address is not anonymisation: the whole IPv4
  // space is about 4 billion values, so anyone holding the table can hash every
  // address and recover the originals in minutes. The salt is what makes the
  // hash a bucket label rather than a reversible identifier.
  //
  // BOOKING_IP_SALT is the right answer. Falling back to the service-role key
  // keeps the property that matters — a long, server-only, stable secret — so
  // an unset salt degrades to "still not reversible" rather than "silently
  // useless". Rotating that key resets the rate-limit buckets, which is a
  // one-off annoyance and not a correctness problem.
  const salt = (process.env.BOOKING_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return createHash('sha256').update(`lumen:${salt}:${ip}`).digest('hex').slice(0, 32);
}

/** LM-XXXXXXXX. Generated here so a client cannot choose or collide its own. */
function makeReference() {
  return `LM-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function pickEnum(value, allowed) {
  const v = normalise(value, { maxLength: 32 }).toLowerCase();
  return allowed.includes(v) ? v : null;
}

/** YYYY-MM-DD, today or later, inside a sane horizon. */
function cleanDate(value) {
  const v = normalise(value, { maxLength: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const parsed = Date.parse(`${v}T00:00:00Z`);
  if (Number.isNaN(parsed)) return null;
  const today = Date.now() - 86400000;
  const horizon = Date.now() + 365 * 86400000;
  return parsed >= today && parsed <= horizon ? v : null;
}

async function readJson(req) {
  // Vercel parses JSON bodies for us, but only up to its own limit and only
  // when the content-type is right. Handle the raw case so a hand-rolled
  // request cannot slip past by sending text/plain.
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

  // ── Bot heuristics, repeated server-side ──────────────────────────────────
  // The client runs these too, for instant feedback. Running them again here is
  // the point: the client's copy is a courtesy, this one is the rule.
  if (!isEmptyHoneypot(body.company)) {
    // Answer as if it worked. Telling a bot why it failed is free tuning data.
    return res.status(200).json({ reference: makeReference(), accepted: false });
  }
  const elapsed = Number(body.elapsedMs);
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < MIN_FILL_MS) {
    return res.status(200).json({ reference: makeReference(), accepted: false });
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const name = normalise(body.name, { maxLength: LIMITS.name });
  const email = normalise(body.email, { maxLength: LIMITS.email }).toLowerCase();
  const phone = normalise(body.phone, { maxLength: LIMITS.phone });
  const notes = normalise(body.notes, { maxLength: LIMITS.notes, keepNewlines: true });

  const errors = {};
  if (name.length < 2) errors.name = 'Please give a name we can use.';
  if (!isEmail(email)) errors.email = 'That email address does not look right.';
  if (phone && !isPhone(phone)) errors.phone = 'Check the phone number.';
  if (!body.consent) errors.consent = 'We need your confirmation to continue.';

  const concerns = Array.isArray(body.concerns)
    ? [...new Set(body.concerns.map((c) => normalise(c, { maxLength: 60 })).filter(Boolean))]
        .slice(0, MAX_CONCERNS)
    : [];

  if (Object.keys(errors).length) {
    return res.status(422).json({ error: 'Some details need another look.', fields: errors });
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  const ipHash = hashIp(clientIp(req));
  let db;
  try {
    db = admin();
  } catch (err) {
    console.error('[booking]', err.message);
    return res.status(503).json({ error: 'Bookings are temporarily unavailable. Please call us.' });
  }

  const { data: limit, error: limitError } = await db.rpc('consume_rate_limit', {
    p_key: `booking:${ipHash}`,
    p_max: RATE_MAX,
    p_window_seconds: RATE_WINDOW_SECONDS,
  });

  if (limitError) {
    // Fail closed. An enquiry lost to a database blip is recoverable by phone;
    // an open write path is not.
    console.error('[booking] rate limit check failed', limitError);
    return res.status(503).json({ error: 'Bookings are temporarily unavailable. Please call us.' });
  }

  if (limit && limit.allowed === false) {
    res.setHeader('Retry-After', String(limit.retry_after ?? RATE_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'That is a few requests in a short time. Try again shortly, or call us directly.',
    });
  }

  // ── Insert ────────────────────────────────────────────────────────────────
  const reference = makeReference();
  const { error } = await db.from('booking_submissions').insert({
    reference,
    concerns,
    who: pickEnum(body.who, ALLOWED_WHO),
    format: pickEnum(body.format, ALLOWED_FORMAT),
    cadence: pickEnum(body.cadence, ALLOWED_CADENCE),
    preferred_therapist:
      body.therapist === 'any' || !body.therapist
        ? null
        : normalise(body.therapist, { maxLength: 80 }),
    preferred_date: cleanDate(body.date),
    preferred_time: normalise(body.time, { maxLength: 40 }) || null,
    name,
    email,
    phone: phone || null,
    insurer: normalise(body.insurer, { maxLength: 120 }) || null,
    notes: notes || null,
    ip_hash: ipHash,
  });

  if (error) {
    console.error('[booking] insert failed', error.code, error.message);
    return res.status(500).json({ error: 'We could not save that. Please try again or call us.' });
  }

  return res.status(201).json({ reference, accepted: true });
}
