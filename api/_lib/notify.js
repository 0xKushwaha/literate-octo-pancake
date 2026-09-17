/**
 * "Something new arrived" emails to the practice.
 *
 * Optional. With these three variables set in Vercel, every new booking and
 * every new community signup sends a short email; with any of them missing,
 * nothing is sent and nothing fails.
 *
 *   RESEND_API_KEY     from resend.com (free tier is plenty)
 *   NOTIFY_EMAIL_TO    where the alert goes, e.g. hello@zehnspaces.com
 *   NOTIFY_EMAIL_FROM  a sender on a domain verified in Resend,
 *                      e.g. "zehnspaces <alerts@zehnspaces.com>"
 *
 * The email deliberately carries NO personal details: no name, no notes, no
 * concerns. Email is not a safe place for mental-health disclosures, so it
 * only says that something arrived and where to read it (the admin panel,
 * behind a login).
 */

const TIMEOUT_MS = 3000;

export async function notifyPractice({ subject, lines = [] }) {
  const key = (process.env.RESEND_API_KEY || '').trim();
  const to = (process.env.NOTIFY_EMAIL_TO || '').trim();
  const from = (process.env.NOTIFY_EMAIL_FROM || '').trim();
  if (!key || !to || !from) return { sent: false, reason: 'not configured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: to.split(',').map((s) => s.trim()).filter(Boolean),
        subject,
        text: lines.join('\n'),
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error('[notify] resend answered', response.status);
      return { sent: false, reason: `status ${response.status}` };
    }
    return { sent: true };
  } catch (err) {
    // Never let an email problem turn a saved submission into an error.
    console.error('[notify] failed', err?.name || err);
    return { sent: false, reason: 'error' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Where an admin reads the thing the email is about. A fixed base rather than
 * the request's Host header, so a crafted request cannot put someone else's
 * link into the practice's inbox.
 */
export function adminLink(path) {
  const base = (process.env.PUBLIC_SITE_URL || 'https://www.zehnspaces.com').trim().replace(/\/$/, '');
  return `${base}${path}`;
}
