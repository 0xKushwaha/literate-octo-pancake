/**
 * POST /api/community — the only write path into community_signups.
 *
 * An unauthenticated form writing to the database gets no anonymous INSERT
 * policy, because a public policy means every bound, every rate limit and
 * every bot check lives in code the submitter controls. Here they live on the
 * server and the service-role key never reaches the browser.
 *
 * Environment variables: SUPABASE_SERVICE_ROLE_KEY, BOOKING_IP_SALT (shared
 * with the booking endpoint), and optionally the notify.js trio.
 */

import { LIMITS, isEmail, normalise } from '../src/booking/validate.js';
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

const MAX_BODY_BYTES = 4 * 1024;
const RATE_MAX = 5; // submissions
const RATE_WINDOW_SECONDS = 900; // per 15 minutes, per IP

/** Only a site path is kept as the source: never a full URL, never a query. */
function cleanSource(value) {
  const v = normalise(value, { maxLength: 120 });
  return /^\/[A-Za-z0-9/_-]*$/.test(v) ? v : null;
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

  // A bot that filled the hidden field is answered as if it worked. Telling it
  // why it failed is free tuning data.
  if (!isEmptyHoneypot(body.company)) {
    return res.status(200).json({ joined: true });
  }

  const email = normalise(body.email, { maxLength: LIMITS.email }).toLowerCase();
  if (!isEmail(email)) {
    return res.status(422).json({ error: 'That email address does not look right.' });
  }
  const source = cleanSource(body.source);

  const ipHash = hashIp(clientIp(req));
  let db;
  try {
    db = adminDb();
  } catch (err) {
    console.error('[community]', err.message);
    return res.status(503).json({ error: 'Could not reach the database. Try again in a moment.' });
  }

  try {
    const limit = await consumeRateLimit(db, `community:${ipHash}`, RATE_MAX, RATE_WINDOW_SECONDS);
    if (!limit.ok) {
      res.setHeader('Retry-After', String(limit.retryAfter));
      return res.status(429).json({ error: 'That is a few attempts in a short time. Try again shortly.' });
    }
  } catch (err) {
    // Fail closed: an open write path is worse than a signup the visitor can retry.
    console.error('[community] rate limit check failed', err?.code || err?.message);
    return res.status(503).json({ error: 'Could not reach the database. Try again in a moment.' });
  }

  const { error } = await db.from('community_signups').insert({ email, source, ip_hash: ipHash });

  if (error) {
    // 23505 is the unique index on lower(email): they are already on the list.
    // Somebody submitting twice wants the invite, not an error message.
    if (error.code === '23505') return res.status(200).json({ joined: true, already: true });
    console.error('[community] insert failed', error.code);
    return res.status(500).json({ error: 'We could not save that. Try again in a moment.' });
  }

  await notifyPractice({
    subject: 'New community signup',
    lines: [
      'Someone joined the community list on the website.',
      '',
      `See the list: ${adminLink('/admin/community')}`,
    ],
  });

  return res.status(201).json({ joined: true });
}
