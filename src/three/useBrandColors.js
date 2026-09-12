import { useSyncExternalStore } from 'react';

/**
 * The palette, resolved to real rgb, live.
 *
 * The form has to be lit in whatever colour the practice has chosen, and that
 * is not a constant: theme.js writes --accent and --highlight onto <html> from
 * the CMS, so the brand can change between page loads and it changes *during*
 * one, the moment the query comes back.
 *
 * Reading the variables directly does not work. Every tone in the palette is a
 * color-mix(in oklab, ...) expression, and getPropertyValue returns that
 * expression as text rather than a colour. So this sets the variable as a real
 * `color` on a throwaway element and reads the computed value back, which the
 * browser has resolved for us — mixes, oklab and all. The form is then lit in
 * exactly the palette index.css defines, not a JavaScript guess at what an
 * oklab mix looks like.
 *
 * Shaped as a module store rather than per-component state, for the same
 * reason the scroll driver is: one MutationObserver for the page, no setState
 * inside an effect, and a snapshot whose identity only changes when a colour
 * actually changes.
 */

const VARS = {
  /** The body of the form. brand-200 was too pale to survive being lit and
      came out grey; brand-300 is half strength and reads as the brand. */
  form: '--color-brand-300',
  /** The one warm note, used for the rim light only. */
  rim: '--color-amber-500',
  /** The ground it sits on, so the shadow side stays in the palette. */
  ground: '--color-bg-2',
};

const FALLBACK = { form: 'rgb(150, 197, 204)', rim: 'rgb(255, 191, 0)', ground: 'rgb(230, 241, 243)' };

let painter = null;

/**
 * Normalise any CSS colour to plain sRGB.
 *
 * getComputedStyle returns a colour in the model the stylesheet wrote it in,
 * and this palette is written in oklab, so what comes back is
 * `oklab(0.84 -0.02 -0.01)`. three.js cannot parse that and logs "Unknown
 * color model" while quietly leaving the material white — which is exactly
 * what shipped the first time, and exactly what a screenshot caught.
 *
 * Rather than implement an oklab conversion and own its correctness, this
 * paints one pixel and reads it back. The browser already knows how to
 * convert every colour model it accepts, including the ones added after this
 * was written.
 */
function toRgb(value) {
  if (!value || value.startsWith('rgb')) return value;
  try {
    if (!painter) painter = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    if (!painter) return value;
    painter.clearRect(0, 0, 1, 1);
    painter.fillStyle = value;
    painter.fillRect(0, 0, 1, 1);
    const [r, g, b] = painter.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return value;
  }
}

function compute() {
  if (typeof document === 'undefined' || !document.body) return FALLBACK;
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none';
  document.body.appendChild(probe);
  const out = {};
  try {
    for (const [key, name] of Object.entries(VARS)) {
      probe.style.color = `var(${name})`;
      out[key] = toRgb(getComputedStyle(probe).color) || FALLBACK[key];
    }
  } catch {
    return FALLBACK;
  } finally {
    probe.remove();
  }
  return out;
}

const same = (a, b) => Boolean(a) && Boolean(b) && Object.keys(VARS).every((k) => a[k] === b[k]);

let snapshot = null;
let observer = null;
const listeners = new Set();

/**
 * Reads the document the first time anything asks. That is a DOM read during
 * render, which is not ideal, but it happens once per page and the alternative
 * is painting the form in the wrong colour for a frame.
 */
function getSnapshot() {
  if (!snapshot) snapshot = compute();
  return snapshot;
}

function refresh() {
  const next = compute();
  if (same(snapshot, next)) return;
  snapshot = next;
  for (const notify of listeners) notify();
}

function subscribe(notify) {
  listeners.add(notify);
  if (!observer && typeof MutationObserver !== 'undefined') {
    // theme.js sets the two brand variables as inline styles on <html>, so an
    // attribute change there is the one and only signal that the palette moved.
    observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  }
  return () => {
    listeners.delete(notify);
    if (listeners.size === 0 && observer) {
      observer.disconnect();
      observer = null;
    }
  };
}

export function useBrandColors() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
