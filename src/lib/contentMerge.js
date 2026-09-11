/**
 * Pure helpers behind the CMS merge.
 *
 * Kept free of React and Supabase imports on purpose: this is the logic that
 * silently dropped every key a component had not hard-coded, and logic that
 * can lose content should be testable without a browser or a database.
 */

/**
 * CMS keys are "<section>.<name>". Components ask for a section and receive an
 * object keyed by the name part, so a key with no dot — or with several — has
 * to resolve predictably rather than landing in the wrong bucket.
 *
 *   "hero.tagline"            → "tagline"
 *   "services.individual_blurb" → "individual_blurb"
 *   "nested.a.b"              → "a.b"      (everything after the first dot)
 *   "orphan"                  → "orphan"   (no section prefix; used as-is)
 */
export function shortKeyOf(key) {
  const [head, ...rest] = String(key ?? '').split('.');
  return rest.length ? rest.join('.') : head;
}

/** The section a key belongs to — the part before the first dot. */
export function sectionOf(key) {
  return String(key ?? '').split('.')[0];
}

/**
 * Merges stored CMS values over a component's static defaults.
 *
 * Two rules, both of which were bugs before:
 *
 *  1. Every stored key is applied, including keys absent from `defaults`.
 *     The old `if (shortKey in defaults)` check meant a field could be added in
 *     the admin panel, save successfully, and never appear on the site.
 *
 *  2. An empty stored value falls back to the default rather than blanking the
 *     section. A CMS field cleared by accident should not silently delete a
 *     headline; deliberately empty text is not something this site needs, and
 *     an unrecoverable blank is much worse than a stale default.
 */
export function mergeContent(defaults = {}, remote = {}) {
  const merged = { ...defaults };
  for (const [shortKey, entry] of Object.entries(remote ?? {})) {
    const value = entry && typeof entry === 'object' ? entry.value : entry;
    if (value == null || value === '') continue;
    merged[shortKey] = value;
  }
  return merged;
}

/** Turns raw `site_content` rows into the shortKey-indexed shape components use. */
export function indexRows(rows = []) {
  const out = {};
  for (const row of rows) {
    if (!row?.key) continue;
    out[shortKeyOf(row.key)] = {
      value: row.value,
      type: row.type,
      label: row.label,
      key: row.key,
    };
  }
  return out;
}

/** A key the admin panel will accept: lowercase, dotted, at least two parts. */
export function isValidContentKey(key) {
  return /^[a-z0-9_]+\.[a-z0-9_.]+$/.test(String(key ?? ''));
}
