import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { EASE } from './primitives';
import { brand } from '../data/site';

/**
 * Holds the first paint just long enough for the WebGL scene to warm up,
 * then wipes away. Progress is real-ish: it tracks document readiness and
 * eases the remainder so it never stalls on a slow asset.
 */
export default function Preloader({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const MIN = 1500;

    const tick = (now) => {
      const elapsed = now - start;
      const timeShare = Math.min(elapsed / MIN, 1);
      const readyShare = document.readyState === 'complete' ? 1 : 0.72;
      const target = Math.min(timeShare, readyShare) * 100;

      setProgress((p) => {
        const next = p + (target - p) * 0.12;
        return next > 99.4 ? 100 : next;
      });

      if (elapsed < MIN + 900) raf = requestAnimationFrame(tick);
      else setProgress(100);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (progress < 99.5) return;
    const t = setTimeout(() => {
      setGone(true);
      onDone?.();
    }, 380);
    return () => clearTimeout(t);
  }, [progress, onDone]);

  return (
    <AnimatePresence>
      {!gone && (
        <motion.div
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-bg"
          exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
          transition={{ duration: 1.1, ease: EASE }}
        >
          <motion.div
            className="flex flex-col items-center gap-8"
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: EASE }}
              className="relative grid place-items-center"
            >
              <span className="absolute size-24 rounded-full border border-aqua-300 [animation:pulse-ring_2.6s_ease-out_infinite]" />
              <span className="absolute size-24 rounded-full border border-violet-400 [animation:pulse-ring_2.6s_ease-out_infinite_0.8s]" />
              <span className="font-display text-3xl tracking-tight text-aurora">{brand.name}</span>
            </motion.div>

            <div className="flex w-56 flex-col gap-3">
              <div className="h-px w-full overflow-hidden bg-ink/[0.06]">
                <motion.div
                  className="h-full bg-gradient-to-r from-aqua-400 to-violet-400"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
                <span>Preparing your space</span>
                <span className="tabular-nums">{String(Math.round(progress)).padStart(3, '0')}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
