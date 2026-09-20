import { useCallback, useEffect, useRef, useState } from 'react';
import { buildTypeCss } from '../lib/typography';

/* Hooks shared by the Colour palette and Fonts & text pages (the components
   they go with are in components/design.jsx). */

/**
 * Scroll-to-group plus "which group is on screen", for the jump bar.
 * Each group's panel carries id={`${prefix}-${group.id}`}.
 */
export function useGroupNav(prefix, groupIds, ready = true) {
  const [active, setActive] = useState(groupIds[0]);
  const [flash, setFlash] = useState(null);
  const timer = useRef(0);
  const quietUntil = useRef(0);
  const key = groupIds.join('|');

  useEffect(() => {
    const ids = key.split('|');
    const els = ids.map((id) => document.getElementById(`${prefix}-${id}`)).filter(Boolean);
    if (!els.length || !('IntersectionObserver' in window)) return undefined;
    // Which groups cross the band just under the sticky bar; the first of
    // them, in page order, is the one being read.
    const inBand = new Set();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = e.target.id.slice(prefix.length + 1);
          if (e.isIntersecting) inBand.add(id); else inBand.delete(id);
        }
        // A jump scrolls smoothly past other groups; let it land first.
        if (Date.now() < quietUntil.current) return;
        const first = ids.find((id) => inBand.has(id));
        if (first) setActive(first);
      },
      { rootMargin: '-96px 0px -65% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [prefix, key, ready]);

  const jump = useCallback((id) => {
    const el = document.getElementById(`${prefix}-${id}`);
    if (!el) return;
    quietUntil.current = Date.now() + 1000;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(id);
    setFlash(id);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), 1400);
  }, [prefix]);

  useEffect(() => () => clearTimeout(timer.current), []);
  return { active, jump, flash };
}

/* ── Fonts inside the preview ───────────────────────────────────────────── */

/**
 * Puts a set of font choices on the preview box only, through a <style>
 * element scoped to .palette-preview, with sizes scaled to the miniature.
 */
export function usePreviewType(type) {
  useEffect(() => {
    const el = document.createElement('style');
    el.dataset.previewType = '';
    el.textContent = buildTypeCss(type, '.palette-preview', { sizeScale: 0.42 });
    document.head.appendChild(el);
    return () => el.remove();
  }, [type]);
}

