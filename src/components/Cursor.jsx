import { useEffect, useRef, useState } from 'react';

/**
 * Two-part cursor: a crisp dot that tracks exactly, and a lagging ring that
 * swells over interactive elements. Fine pointers only.
 */
export default function Cursor() {
  const dot = useRef(null);
  const ring = useRef(null);
  const [enabled] = useState(
    () =>
      window.matchMedia('(pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (!enabled) return;
    document.body.classList.add('lumen-cursor');

    const target = { x: innerWidth / 2, y: innerHeight / 2 };
    const pos = { ...target };
    let hovering = false;
    let down = false;
    let raf = 0;

    const onMove = (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
      wake();
      if (dot.current) {
        dot.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }
      const el = e.target instanceof Element ? e.target.closest('a, button, [data-cursor]') : null;
      const next = !!el;
      if (next !== hovering) {
        hovering = next;
        ring.current?.classList.toggle('is-hover', hovering);
        wake();
      }
    };

    // The ring eases toward the pointer, so it only needs frames while it is
    // still catching up. Looping unconditionally meant a rAF callback plus a
    // style write every 16ms for the whole life of the page, including while
    // the mouse sat perfectly still — which competes for frame budget with the
    // scrolling it is drawn on top of.
    const wake = () => { if (!raf) raf = requestAnimationFrame(loop); };

    const loop = () => {
      raf = 0;
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      pos.x += dx * 0.16;
      pos.y += dy * 0.16;
      if (ring.current) {
        ring.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${
          down ? 0.8 : hovering ? 1.9 : 1
        })`;
      }
      // Sub-pixel movement is not visible; stop rather than approach forever.
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) wake();
    };
    wake();

    // A press or a hover change alters the ring's scale, so each needs one more
    // frame even when the pointer has not moved.
    const onDown = () => { down = true; wake(); };
    const onUp = () => { down = false; wake(); };
    const onLeave = () => {
      dot.current?.style.setProperty('opacity', '0');
      ring.current?.style.setProperty('opacity', '0');
    };
    const onEnter = () => {
      dot.current?.style.setProperty('opacity', '1');
      ring.current?.style.setProperty('opacity', '1');
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerenter', onEnter);

    return () => {
      document.body.classList.remove('lumen-cursor');
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerenter', onEnter);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dot}
        className="pointer-events-none fixed left-0 top-0 z-[70] size-2 rounded-full bg-ink"
      />
      <div
        ref={ring}
        className="lumen-ring pointer-events-none fixed left-0 top-0 z-[70] size-9 rounded-full border-2 border-ink/30"
      />
    </>
  );
}
