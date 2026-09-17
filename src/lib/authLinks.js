/**
 * Reading the links Supabase emails out: "reset your password" and "you have
 * been invited". Pure functions, so they can be tested without a browser.
 */

export const PASSWORD_MIN = 12;

/** A sentence describing what is wrong with a new password, or null. */
export function passwordProblem(password, confirm) {
  const p = String(password ?? '');
  if (p.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (p.length > 128) return 'Use at most 128 characters.';
  if (/^\s|\s$/.test(p)) return 'Remove the space at the start or end.';
  if (new Set(p).size < 5) return 'Use a less repetitive password.';
  if (confirm !== undefined && p !== confirm) return 'The two passwords do not match.';
  return null;
}

const LINK_TYPES = new Set(['recovery', 'invite', 'signup', 'magiclink', 'email']);

/**
 * What a link carries, from `location.hash` and `location.search`:
 *   { kind: 'tokens', accessToken, refreshToken, type }  (the usual email link)
 *   { kind: 'token_hash', tokenHash, type }              (custom email templates)
 *   { kind: 'code', code }                               (links requested from this browser)
 *   { kind: 'error', message }                           (expired or already used)
 *   null                                                 (nothing to do)
 */
export function parseAuthLink(hash = '', search = '') {
  const h = new URLSearchParams(String(hash).replace(/^#/, ''));
  const q = new URLSearchParams(String(search).replace(/^\?/, ''));

  const errorText = h.get('error_description') || q.get('error_description');
  if (errorText) return { kind: 'error', message: errorText.replace(/\+/g, ' ') };

  const accessToken = h.get('access_token');
  const refreshToken = h.get('refresh_token');
  if (accessToken && refreshToken) {
    const type = h.get('type') || '';
    return { kind: 'tokens', accessToken, refreshToken, type };
  }

  const tokenHash = q.get('token_hash');
  const type = q.get('type') || '';
  if (tokenHash && LINK_TYPES.has(type)) return { kind: 'token_hash', tokenHash, type };

  const code = q.get('code');
  if (code) return { kind: 'code', code };

  return null;
}

/** True when a URL hash is a password-reset or invitation link. */
export function isSetPasswordHash(hash) {
  const link = parseAuthLink(hash, '');
  return Boolean(link && link.kind === 'tokens' && (link.type === 'recovery' || link.type === 'invite'));
}
