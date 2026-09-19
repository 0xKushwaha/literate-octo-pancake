/**
 * GET /api/cron/prune-rate-limits — housekeeping, run on a schedule.
 *
 * `consume_rate_limit` writes a row per bucket per window and nothing ever
 * removed them. Migration 006 shipped `prune_rate_limits()` to do it and
 * nothing called it, so the table grew for the life of the project. Small and
 * slow, but unbounded, which is the part that eventually matters.
 *
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. The check
 * is not optional: without it this is a public endpoint that writes to the
 * database, and an unset CRON_SECRET must fail closed rather than wave
 * everyone through. Vercel's own scheduler is the only intended caller.
 */

import { timingSafeEqual } from 'node:crypto';
import { adminDb } from '../_lib/http.js';

/** Constant-time compare that does not leak the secret's length. */
function secretMatches(given, expected) {
  const a = Buffer.from(String(given ?? ''));
  const b = Buffer.from(String(expected ?? ''));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expected = (process.env.CRON_SECRET || '').trim();
  if (!expected) {
    console.error('[cron] CRON_SECRET is not set; refusing to run');
    return res.status(503).json({ error: 'Not configured' });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!secretMatches(token, expected)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let db;
  try {
    db = adminDb();
  } catch (err) {
    console.error('[cron]', err.message);
    return res.status(503).json({ error: 'Database not configured' });
  }

  const { error } = await db.rpc('prune_rate_limits');
  if (error) {
    console.error('[cron] prune failed', error.code);
    return res.status(500).json({ error: 'Prune failed' });
  }

  return res.status(200).json({ pruned: true });
}
