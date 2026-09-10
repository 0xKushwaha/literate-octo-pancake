import { useEffect, useRef, useState } from 'react';

/** Respects the OS "reduce motion" setting, reactively. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = (e) => setReduced(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = (e) => setMatches(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

/**
 * Renders the 3D scene at a quality tier the device can actually hold.
 * Coarse pointer + low core count => fewer verts, fewer particles, no bloom.
 */
export function useQualityTier() {
  const reduced = useReducedMotion();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Derived, not stored: both inputs are already reactive, and the hardware
  // hints never change for the life of the page.
  if (reduced) return 'static';
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = navigator.deviceMemory ?? 8;
  if (isMobile || cores <= 4 || mem <= 4) return 'low';
  if (cores <= 8) return 'medium';
  return 'high';
}

/** Normalised 0..1 scroll progress of the whole document, in a ref (no re-renders). */
export function useScrollProgressRef() {
  const ref = useRef(0);
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      ref.current = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return ref;
}

/** 0..1 progress through the first viewport — drives the hero exit. */
export function useHeroProgressRef() {
  const ref = useRef(0);
  useEffect(() => {
    const update = () => {
      ref.current = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return ref;
}

/** Fires once when the element scrolls into view. */
export function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (options.once !== false) io.disconnect();
        } else if (options.once === false) {
          setInView(false);
        }
      },
      { threshold: options.threshold ?? 0.2, rootMargin: options.rootMargin ?? '0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [options.once, options.threshold, options.rootMargin]);
  return [ref, inView];
}

/** Pauses rendering when the canvas is off-screen or the tab is hidden. */
export function useVisibility(ref) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: '120px',
    });
    io.observe(el);
    const onVis = () => setVisible(!document.hidden && !!ref.current);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ref]);
  return visible;
}
