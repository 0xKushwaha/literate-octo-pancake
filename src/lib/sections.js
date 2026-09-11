/**
 * Optional homepage sections (blog, videos) only render once they know they
 * have something to show. The nav needs to know when that happens so it can
 * offer a link to a section that exists and hide the link to one that does not.
 */
const EVENT = 'lumen:sections-changed';

/** Call after a section mounts, unmounts, or decides whether it will render. */
export function notifySectionsChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Subscribe to section changes. Returns an unsubscribe function. */
export function onSectionsChanged(fn) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

/** True when an element with this id is currently in the document. */
export function sectionExists(id) {
  return typeof document !== 'undefined' && Boolean(document.getElementById(id));
}
