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
 *                                string; salts the IP hash. See hashIp in
 *                                api/_lib/http.js for what happens when it is absent.
 *   ALLOWED_ORIGINS            — optional. Extra sites allowed to post here,
 *                                comma separated. The site's own domain is
 *                                always allowed.
 *   RESEND_API_KEY, NOTIFY_EMAIL_TO, NOTIFY_EMAIL_FROM — optional; see
 *                                api/_lib/notify.js.
 *
 * The project URL is NOT a separate variable. Every project environment
 * variable is visible to the function runtime as process.env, prefix or no
 * prefix — VITE_ only means something to Vite at build time. So this reads
 * VITE_SUPABASE_URL directly rather than making you maintain the same URL
 * twice under two names that can drift apart.
 */

import { randomBytes } from 'node:crypto';
import { LIMITS, isEmail, isPhone, normalise, MIN_FILL_MS } from '../src/booking/validate.js';
import {
  BodyError,
  adminDb,
  clientIp,
  consumeRateLimit,
  guardRequest,
  hashIp,
  isEmptyHoneypot,
  readJson,
} from './_lib/http.js';
import { adminLink, notifyPractice } from './_lib/notify.js';
import { isFeatureOn } from '../src/lib/featureFlag.js';

/**
 * The default of the Booking switch (features.booking in
 * src/data/contentSchema.js — that file cannot be loaded here, it uses
 * Vite-only imports). tests/bookingApi.test.js fails if the two ever differ.
 */
export const BOOKING_SWITCH_DEFAULT = 'off';

/**
 * Whether the practice is taking bookings. With the switch off the site shows
 * no form, and the Bookings admin screen is gone, so anything accepted here
 * would sit unread in the table — this endpoint refuses instead. An empty
 * stored value means "use the default", exactly as the site reads it.
 */
export async function bookingOpen(db) {
  const { data, error } = await db.from('site_content').select('value').eq('key', 'features.booking').maybeSingle();
  if (error) throw error;
  const stored = data?.value;
  return isFeatureOn(stored == null || String(stored).trim() === '' ? BOOKING_SWITCH_DEFAULT : stored);
}

// ── Bounds the client cannot argue with ─────────────────────────────────────
const MAX_BODY_BYTES = 16 * 1024;
const MAX_CONCERNS = 12;
const RATE_MAX = 3; // submissions
const RATE_WINDOW_SECONDS = 900; // per 15 minutes, per IP

const ALLOWED_WHO = ['individual', 'couples', 'teen', 'psychiatry'];
const ALLOWED_FORMAT = ['video', 'phone', 'in-person'];
const ALLOWED_CADENCE = ['weekly', 'fortnightly', 'monthly', 'once'];

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

export default async function handler(req, res) {
  if (!guardRequest(req, res)) return;

  let body;
  try {
    body = await readJson(req, MAX_BODY_BYTES);
  } catch (err) {
    const tooBig = err instanceof BodyError && err.message === 'payload too large';
    return res.status(tooBig ? 413 : 400).json({ error: 'Could not read that request.' });
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
  if (body.consent !== true) errors.consent = 'We need your confirmation to continue.';

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
    db = adminDb();
  } catch (err) {
    console.error('[booking]', err.message);
    return res.status(503).json({ error: 'Bookings are temporarily unavailable. Please call us.' });
  }

  try {
    if (!(await bookingOpen(db))) {
      return res.status(403).json({ error: 'Booking is not open at the moment.' });
    }
  } catch (err) {
    console.error('[booking] could not read the booking switch', err?.code || err?.message);
    return res.status(503).json({ error: 'Bookings are temporarily unavailable. Please call us.' });
  }

  try {
    const limit = await consumeRateLimit(db, `booking:${ipHash}`, RATE_MAX, RATE_WINDOW_SECONDS);
    if (!limit.ok) {
      res.setHeader('Retry-After', String(limit.retryAfter));
      return res.status(429).json({
        error: 'That is a few requests in a short time. Try again shortly, or call us directly.',
      });
    }
  } catch (err) {
    // Fail closed. An enquiry lost to a database blip is recoverable by phone;
    // an open write path is not.
    console.error('[booking] rate limit check failed', err?.code || err?.message);
    return res.status(503).json({ error: 'Bookings are temporarily unavailable. Please call us.' });
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
    console.error('[booking] insert failed', error.code);
    return res.status(500).json({ error: 'We could not save that. Please try again or call us.' });
  }

  // No personal details in the email, only that a request arrived.
  await notifyPractice({
    subject: `New booking request ${reference}`,
    lines: [
      `A new booking request (${reference}) came in through the website.`,
      '',
      `Read it in the admin panel: ${adminLink('/admin/bookings')}`,
    ],
  });

  return res.status(201).json({ reference, accepted: true });
}
