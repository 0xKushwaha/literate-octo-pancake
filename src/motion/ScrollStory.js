import { useSyncExternalStore } from 'react';

/**
 * One scroll listener for the whole site.
 *
 * Before this there were two, each with its own rAF gate and its own copy of
 * the same three layout reads. Two listeners is not a performance problem on
 * its own; two *independent* ones are, because each reads scrollHeight on its
 * own frame and the browser has to settle layout twice to answer. The scroll
 * work coming in later phases needs a lot more readers than two, so they all
 * read from here instead.
 *
 * The store is a module singleton rather than a React context on purpose.
 * Context would re-render every consumer on every frame, which is exactly the
 * cost `primitives.jsx` removed when it dropped the animation library. Here a
 * component subscribes with a *selector* that returns a primitive, and React
 * only re-renders it on the frame that primitive actually changes. A nav that
 * cares about "have we scrolled at all" therefore re-renders twice in a
 * session: once crossing 16px down, once crossing back up.
 *
 * The listeners are reference counted. Nothing is attached to `window` until
 * the first subscriber arrives and everything is detached when the last one
 * leaves, so a page that uses none of this pays nothing.
 */

/** Live viewport and document metrics. Mutated in place; never replaced. */
const metrics = { y: 0, vh: 0, docH: 0, progress: 0 };

const listeners = new Set();
let attached = false;
let primed = false;
let frame = 0;

function read() {
  if (typeof window === 'undefined') return;
  metrics.y = window.scrollY;
  metrics.vh = window.innerHeight;
  metrics.docH = document.documentElement.scrollHeight;
  const travel = metrics.docH - metrics.vh;
  metrics.progress = travel > 0 ? Math.min(Math.max(metrics.y / travel, 0), 1) : 0;
}

/**
 * Read once, lazily, the first time anything asks. React calls getSnapshot
 * before it calls subscribe, so without this the first paint would always
 * describe a page scrolled to the top — wrong for a reload part-way down or a
 * link into an anchor.
 */
function prime() {
  if (primed) return;
  primed = true;
  read();
}

function onEvent() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    read();
    for (const notify of listeners) notify();
  });
}

function attach() {
  if (attached || typeof window === 'undefined') return;
  attached = true;
  prime();
  // Resize matters as much as scroll here: every threshold in the site is
  // expressed against viewport height or document height, and both change on
  // a rotate without the page moving a pixel.
  window.addEventListener('scroll', onEvent, { passive: true });
  window.addEventListener('resize', onEvent, { passive: true });
}

function detach() {
  if (!attached) return;
  attached = false;
  if (frame) { cancelAnimationFrame(frame); frame = 0; }
  window.removeEventListener('scroll', onEvent);
  window.removeEventListener('resize', onEvent);
}

/**
 * Imperative subscription, for things that animate without re-rendering —
 * a canvas, a transform written straight to a ref. Returns an unsubscribe.
 */
export function subscribeScroll(notify) {
  listeners.add(notify);
  attach();
  return () => {
    listeners.delete(notify);
    if (listeners.size === 0) detach();
  };
}

/** The live metrics object. Read it, do not hold on to values from it. */
export function scrollMetrics() {
  prime();
  return metrics;
}

/**
 * Subscribe to a derived value.
 *
 * `select` MUST return a primitive (a boolean or a number). React compares
 * snapshots by value, so an object would look different on every frame and
 * re-render forever. Define the selector at module scope, not inline, so its
 * identity is stable.
 *
 *   const scrolled = useScrollValue((m) => m.y > 16);
 */
export function useScrollValue(select) {
  const snapshot = () => {
    prime();
    return select(metrics);
  };
  return useSyncExternalStore(subscribeScroll, snapshot, snapshot);
}
