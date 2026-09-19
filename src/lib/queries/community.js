import { supabase, isDemo } from '../supabase';

/**
 * Joining the community.
 *
 * The write goes through /api/community rather than straight to Supabase: the
 * table has no anonymous INSERT policy, on purpose (see migration 009). There
 * is no read path here any more — the Community admin screen was removed when
 * the practice moved that job to Discord.
 */

const ENDPOINT = '/api/community';

/** In-memory stand-in so demo mode has something to show. */
const demoRows = [];

/**
 * Records an email address and reports whether it landed.
 *
 * Never throws for a duplicate: someone submitting the same address twice
 * wants the invite, not an error. `already` says which case it was, so the
 * band can say "you were already on the list" instead of "welcome".
 */
export async function joinCommunity({ email, source = null, honeypot = '' } = {}) {
  const address = String(email ?? '').trim().toLowerCase();

  if (isDemo) {
    const already = demoRows.some((r) => r.email === address);
    if (!already) demoRows.unshift({ id: `demo-${demoRows.length + 1}`, email: address, source, created_at: new Date().toISOString() });
    return { joined: true, already };
  }

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: address, source, company: honeypot }),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    // A non-JSON body means something upstream failed; the status still tells
    // us enough to say something true.
  }

  if (!response.ok) {
    throw new Error(payload.error || 'We could not save that. Try again in a moment.');
  }
  return { joined: true, already: Boolean(payload.already) };
}

/*
 * listCommunitySignups / countCommunitySignups / deleteCommunitySignup went
 * with the Community screen. /api/community still records every address, so
 * the list is intact in the database and can be read in the Supabase table
 * editor or exported from there. Nothing in this app reads it.
 */
