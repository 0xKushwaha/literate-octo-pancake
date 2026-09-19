/**
 * Links typed into the admin panel end up in `href`s and in window.open().
 * Only web, mail and phone links, and paths on this site, are let through;
 * anything else (javascript:, data:, a typo) becomes null so the caller can
 * leave the link out rather than render something that runs code.
 */
const SITE_PATH = /^\/(?!\/)[^\s]*$/;

export function safeUrl(value, { allowPaths = true } = {}) {
  const v = String(value ?? '').trim();
  if (!v || v === '#') return null;
  if (allowPaths && (SITE_PATH.test(v) || v.startsWith('#'))) return v;
  let parsed;
  try {
    parsed = new URL(v);
  } catch {
    return null;
  }
  if (parsed.protocol === 'https:' || parsed.protocol === 'mailto:' || parsed.protocol === 'tel:') {
    return parsed.href;
  }
  return null;
}

/**
 * A URL safe to hand to <audio src>: an https clip, or a file served from this
 * site. Uploaded recordings are the first; a sample dropped in public/ is the
 * second. mailto: and tel: pass safeUrl and are meaningless here, so this is
 * its own function rather than a call to safeUrl with a flag.
 */
export function safeMediaUrl(value) {
  const url = safeUrl(value, { allowPaths: true });
  if (!url) return null;
  return url.startsWith('https://') || url.startsWith('/') ? url : null;
}

/** An https link to another site, or null. For the community invite. */
export function safeExternalUrl(value) {
  const url = safeUrl(value, { allowPaths: false });
  return url && url.startsWith('https://') ? url : null;
}

export default safeUrl;
