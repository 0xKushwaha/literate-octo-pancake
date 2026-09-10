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
    let raf;

    const onMove = (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (dot.current) {
        dot.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }
      const el = e.target instanceof Element ? e.target.closest('a, button, [data-cursor]') : null;
      const next = !!el;
      if (next !== hovering) {
        hovering = next;
        ring.current?.classList.toggle('is-hover', hovering);
      }
    };

    const loop = () => {
      pos.x += (target.x - pos.x) * 0.16;
      pos.y += (target.y - pos.y) * 0.16;
      if (ring.current) {
        ring.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${
          down ? 0.8 : hovering ? 1.9 : 1
        })`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onDown = () => (down = true);
    const onUp = () => (down = false);
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
