/**
 * Input normalisation and validation for the intake form.
 *
 * Everything here runs client-side, so none of it is a security boundary — a
 * real deployment must repeat all of it on the server. What it does buy:
 * predictable stored values, bounded field lengths, and a cheap filter for the
 * drive-by bots that submit every form they find.
 */

/** Caps mirror what a server should enforce; generous but finite. */
export const LIMITS = {
  name: 80,
  email: 254, // RFC 5321 maximum
  phone: 32,
  notes: 1500,
};

// C0/C1 control characters. The second form spares \t and \n for the notes box.
// Matching control characters is the whole purpose of these two patterns.
/* eslint-disable no-control-regex */
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/g;
const CONTROL_KEEP_BREAKS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

/* eslint-enable no-control-regex */

/** Strips control characters and collapses runs of whitespace. */
export function normalise(value, { maxLength = 200, keepNewlines = false } = {}) {
  if (typeof value !== 'string') return '';
  const stripped = value.replace(keepNewlines ? CONTROL_KEEP_BREAKS : CONTROL, '');
  const collapsed = keepNewlines
    ? stripped.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n')
    : stripped.replace(/\s{2,}/g, ' ');
  return collapsed.trim().slice(0, maxLength);
}

/**
 * Deliberately conservative: one @, a dot-separated domain, no spaces, no
 * consecutive dots. Anything stricter starts rejecting valid addresses.
 */
export function isEmail(value) {
  const v = String(value ?? '').trim();
  if (v.length < 6 || v.length > LIMITS.email) return false;
  if (v.includes('..') || v.startsWith('.') || v.includes(' ')) return false;
  return /^[^@\s]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(v);
}

export function isPhone(value) {
  const v = String(value ?? '').trim();
  if (!v) return true; // optional
  const digits = v.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15 && /^[\d\s()+.-]+$/.test(v);
}

/**
 * Bot heuristics. Neither is authoritative — a determined script defeats both —
 * but together they stop essentially all untargeted form spam at zero cost to
 * a real user, and without a third-party CAPTCHA that would profile them.
 */
export const MIN_FILL_MS = 3000;

export function looksAutomated({ honeypot, openedAt }) {
  if (honeypot) return 'honeypot'; // a hidden field only a script fills
  if (openedAt && Date.now() - openedAt < MIN_FILL_MS) return 'too-fast';
  return null;
}
