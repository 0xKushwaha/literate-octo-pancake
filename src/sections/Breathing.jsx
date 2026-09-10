import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { listActiveExercises } from '../lib/queries/breathing';
import { Section, SectionHeading, Stagger, staggerItem, Reveal, EASE } from '../components/primitives';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useReducedMotion } from '../lib/hooks';

const PHASE_COLORS = {
  inhale: { ring: 'border-[var(--color-aqua-400)]', bg: 'bg-[var(--color-aqua-100,#e6fbf7)]', text: 'text-[var(--color-aqua-700)]', glow: 'shadow-[0_0_60px_16px_rgba(54,228,207,0.2)]' },
  hold: { ring: 'border-[var(--color-iris-400,#7B7CFF)]', bg: 'bg-[var(--color-iris-100,#ededff)]', text: 'text-[var(--color-iris-700,#3f38c4)]', glow: 'shadow-[0_0_60px_16px_rgba(123,124,255,0.18)]' },
  exhale: { ring: 'border-[var(--color-violet-400,#A06EFF)]', bg: 'bg-[var(--color-violet-100,#f1e8ff)]', text: 'text-[var(--color-violet-700,#6b21d4)]', glow: 'shadow-[0_0_60px_16px_rgba(160,110,255,0.18)]' },
};

function buildPhases(ex) {
  const phases = [];
  for (let i = 0; i < ex.cycles; i++) {
    phases.push({ label: 'Breathe in', type: 'inhale', scale: 1, duration: ex.inhale_sec * 1000 });
    if (ex.hold_in_sec > 0) phases.push({ label: 'Hold', type: 'hold', scale: 1, duration: ex.hold_in_sec * 1000 });
    phases.push({ label: 'Breathe out', type: 'exhale', scale: 0.42, duration: ex.exhale_sec * 1000 });
    if (ex.hold_out_sec > 0) phases.push({ label: 'Hold', type: 'hold', scale: 0.42, duration: ex.hold_out_sec * 1000 });
  }
  return phases;
}

function BreathingGuide({ exercise, onClose }) {
  const prefersReduced = useReducedMotion();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);
  const phases = useRef(buildPhases(exercise)).current;
  const totalPhases = phases.length;

  useEffect(() => {
    if (done) return;
    const advance = () => {
      setPhaseIdx((i) => {
        const next = i + 1;
        if (next >= totalPhases) { setDone(true); return i; }
        return next;
      });
    };
    timerRef.current = setTimeout(advance, phases[phaseIdx]?.duration ?? 4000);
    return () => clearTimeout(timerRef.current);
  }, [phaseIdx, done, phases, totalPhases]);

  const phase = phases[phaseIdx] ?? phases[0];
  const colors = PHASE_COLORS[phase.type];
  const progress = (phaseIdx + 1) / totalPhases;
  const cycleNum = Math.floor(phaseIdx / (totalPhases / exercise.cycles)) + 1;

  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {/* Progress bar */}
      <div className="w-full max-w-xs overflow-hidden rounded-full bg-gray-100 h-1">
        <motion.div
          className="h-full bg-gradient-to-r from-aqua-400 to-violet-400 rounded-full"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {done ? (
        <div className="mt-14 flex flex-col items-center gap-4">
          <div className="text-5xl">✦</div>
          <p className="font-display text-2xl tracking-tight text-ink">Session complete</p>
          <p className="text-[14px] text-ink-3">Take a moment to notice how you feel.</p>
          <button
            onClick={onClose}
            className="mt-4 rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white transition hover:bg-ink/80"
          >
            Close
          </button>
        </div>
      ) : (
        <>
          {/* Animated circle */}
          <div className="relative mt-10 flex items-center justify-center" style={{ width: 220, height: 220 }}>
            <motion.div
              className={`absolute rounded-full border-4 ${colors.ring} ${colors.bg} ${colors.glow} transition-colors duration-700`}
              animate={prefersReduced ? {} : { scale: phase.scale, opacity: 1 }}
              initial={{ scale: 0.42, opacity: 0.7 }}
              transition={{ duration: (phase.duration / 1000) * 0.9, ease: phase.type === 'inhale' ? 'easeIn' : phase.type === 'exhale' ? 'easeOut' : 'linear' }}
              style={{ width: 180, height: 180 }}
            />
            <AnimatePresence mode="wait">
              <motion.p
                key={phase.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35, ease: EASE }}
                className={`relative z-10 font-display text-xl tracking-tight ${colors.text}`}
              >
                {phase.label}
              </motion.p>
            </AnimatePresence>
          </div>

          <p className="mt-6 text-[13px] font-mono text-ink-4 tracking-widest uppercase">
            Cycle {cycleNum} of {exercise.cycles}
          </p>
          <p className="mt-2 text-[13px] text-ink-4">{exercise.name}</p>

          <button
            onClick={onClose}
            className="mt-8 rounded-full border border-line px-5 py-2 text-[13px] text-ink-3 transition hover:border-line-2 hover:text-ink"
          >
            End session
          </button>
        </>
      )}
    </div>
  );
}

function ExerciseCard({ exercise, onStart }) {
  return (
    <motion.div variants={staggerItem}>
      <button
        onClick={() => onStart(exercise)}
        className="group flex w-full flex-col items-start rounded-3xl border border-line bg-surface p-7 text-left shadow-[var(--shadow-card)] transition-all duration-500 hover:shadow-[var(--shadow-lift)] hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua-400"
      >
        <div className="flex w-full items-center justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-4">
            {exercise.technique}
          </span>
          <span className="inline-flex size-9 items-center justify-center rounded-full border border-line text-ink-3 transition-all group-hover:border-aqua-400 group-hover:bg-aqua-100 group-hover:text-aqua-700">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </span>
        </div>

        <h3 className="mt-4 font-display text-[clamp(1.15rem,2vw,1.4rem)] leading-snug tracking-tight text-ink">
          {exercise.name}
        </h3>

        {exercise.description && (
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-3 line-clamp-2">
            {exercise.description}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-1.5">
          {(exercise.benefits ?? []).slice(0, 3).map((b) => (
            <span key={b} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] text-ink-4">
              {b}
            </span>
          ))}
        </div>

        <div className="mt-5 font-mono text-[11px] text-aqua-700 tracking-wide">
          {exercise.inhale_sec}s in
          {exercise.hold_in_sec > 0 ? ` · ${exercise.hold_in_sec}s hold` : ''}
          {` · ${exercise.exhale_sec}s out`}
          {exercise.hold_out_sec > 0 ? ` · ${exercise.hold_out_sec}s hold` : ''}
          {` · ${exercise.cycles} cycles`}
        </div>
      </button>
    </motion.div>
  );
}

export default function Breathing() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => {
    listActiveExercises()
      .then(setExercises)
      .catch(() => setExercises(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && exercises.length === 0) return null;

  return (
    <>
      <Section id="breathing" className="py-32 sm:py-44 lg:py-56">
        <SectionHeading
          eyebrow="Breathe"
          title="A moment, right now."
          lead="Guided breathing exercises from our clinical team. Each session takes under five minutes."
        />

        {loading ? (
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 rounded-3xl bg-surface-2 animate-pulse" />
            ))}
          </div>
        ) : (
          <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {exercises.map((ex) => (
              <ExerciseCard key={ex.id ?? ex.slug} exercise={ex} onStart={setActive} />
            ))}
          </Stagger>
        )}
      </Section>

      <Dialog open={!!active} onOpenChange={(open) => { if (!open) setActive(null); }}>
        <DialogContent className="max-w-sm rounded-4xl border-line bg-surface p-0 overflow-hidden">
          <DialogTitle className="sr-only">
            {active?.name ?? 'Breathing exercise'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Guided breathing session. Follow the circle animation.
          </DialogDescription>
          {active && (
            <BreathingGuide exercise={active} onClose={() => setActive(null)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
