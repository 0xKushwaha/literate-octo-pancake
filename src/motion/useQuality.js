import { useState } from 'react';
import { useMediaQuery, useReducedMotion } from '../lib/hooks';

/**
 * What this device and this visitor can comfortably be shown.
 *
 * Three tiers, and the names are promises about what a consumer may do:
 *
 *   full     everything: WebGL, pointer tracking, the long morphs
 *   reduced  WebGL, but fewer vertices, a lower pixel ratio and no pointer
 *            work — the phone tier
 *   static   no continuous motion at all. Render the still fallback (on the
 *            hero that is the existing photo) and stop.
 *
 * `static` is not only an accessibility setting. It also catches a device
 * with no WebGL, a device that reports very little memory or very few cores,
 * and a visitor on Data Saver. All four want the same thing, so they get the
 * same answer rather than four half-handled cases.
 *
 * Note the global `prefers-reduced-motion` rule in index.css zeroes CSS
 * animation and transition durations, but it cannot stop a requestAnimationFrame
 * loop. Anything driving its own loop has to read this hook and stop itself.
 */

let webgl = null;

/** Does this browser give us a WebGL context at all? Probed once, cached. */
export function supportsWebgl() {
  if (webgl !== null) return webgl;
  if (typeof document === 'undefined') { webgl = false; return webgl; }
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    webgl = Boolean(gl);
    // Hand the context back immediately. Browsers cap how many live contexts
    // a page may hold, and this one exists only to answer the question.
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}

/** A device that should not be asked to render anything continuous. */
function belowFloor() {
  if (typeof navigator === 'undefined') return true;
  const cores = Number(navigator.hardwareConcurrency) || 0;
  const memory = Number(navigator.deviceMemory) || 0;
  if (navigator.connection?.saveData) return true;
  if (cores > 0 && cores <= 2) return true;
  if (memory > 0 && memory <= 2) return true;
  return false;
}

export function useQuality() {
  const reducedMotion = useReducedMotion();
  const smallViewport = useMediaQuery('(max-width: 767px)');
  const coarsePointer = useMediaQuery('(pointer: coarse)');

  // Probed once, on first render, so a consumer never paints the wrong tier
  // and then corrects itself a frame later.
  const [capable] = useState(() => supportsWebgl() && !belowFloor());

  const tier = reducedMotion || !capable
    ? 'static'
    : smallViewport || coarsePointer
      ? 'reduced'
      : 'full';

  return {
    tier,
    reducedMotion,
    smallViewport,
    coarsePointer,
    webgl: capable,
    /** Cap for a renderer's pixel ratio. Retina at full rate is rarely worth it. */
    maxDpr: tier === 'full' ? 2 : 1.5,
  };
}
