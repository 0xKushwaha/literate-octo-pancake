/**
 * Booking draft persistence.
 *
 * The intake collects two very different kinds of thing:
 *
 *   - navigational state (which step, which format, which slot)
 *   - health and identity data (presenting concerns, name, email, phone, notes)
 *
 * Only the first kind is ever written to storage. Persisting "Trauma / PTSD"
 * plus a name and phone number to localStorage would leave a durable record of
 * someone's mental health on a device that is very often shared — a laptop at
 * home, a machine at work — readable by any script on the origin and surviving
 * indefinitely. That is not a trade worth making to save re-picking a chip.
 *
 * What does persist goes to sessionStorage, so it dies with the tab, and
 * carries a timestamp so a forgotten tab cannot resurrect a stale draft days
 * later.
 */

const KEY = 'lumen.booking.draft.v2';
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

/** Fields safe to write down: no identity, no health data. */
const PERSISTED = ['who', 'format', 'cadence', 'therapist', 'date', 'time'];

/** Fields that must never leave memory. */
export const SENSITIVE = ['concerns', 'name', 'email', 'phone', 'notes', 'consent'];

export function saveDraft(form) {
  try {
    const safe = {};
    for (const k of PERSISTED) if (form[k]) safe[k] = form[k];
    if (Object.keys(safe).length === 0) {
      sessionStorage.removeItem(KEY);
      return;
    }
    sessionStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), data: safe }));
  } catch {
    /* private mode or storage disabled — the draft simply will not persist */
  }
}

export function loadDraft() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.data || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }

    // Only ever hand back the allow-listed keys, whatever is in storage.
    const out = {};
    for (const k of PERSISTED) {
      if (typeof parsed.data[k] === 'string' && parsed.data[k].length < 64) {
        out[k] = parsed.data[k];
      }
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY);
    // sweep the pre-v2 key, which did hold PII
    localStorage.removeItem('lumen.booking.draft');
  } catch {
    /* ignore */
  }
}

export function hasDraft() {
  return loadDraft() !== null;
}
