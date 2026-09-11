import { useEffect, useRef, useState } from 'react';
import { listActiveExercises } from '../lib/queries/breathing';
import { breathingDefaults } from '../data/breathingDefaults';
import { Section, SectionHeading, Stagger, StaggerItem, sectionPad } from '../components/primitives';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useReducedMotion } from '../lib/hooks';
import { useSiteContent } from '../lib/queries/siteContent';

const PHASE_COLORS = {
  // One palette colour per phase, far enough apart to tell apart mid-exercise
  // with your eyes half closed, which is the actual use case.
  inhale: {
    ring: 'border-rose-400',
    bg: 'bg-rose-100',
    text: 'text-ink',
    glow: 'shadow-[0_0_60px_16px_rgba(255,176,181,0.55)]',
  },
  hold: {
    ring: 'border-peach-100',
    bg: 'bg-peach-100',
    text: 'text-ink',
    glow: 'shadow-[0_0_60px_16px_rgba(249,220,192,0.6)]',
  },
  exhale: {
    ring: 'border-amber-500',
    bg: 'bg-amber-500',
    text: 'text-ink',
    glow: 'shadow-[0_0_60px_16px_rgba(255,191,0,0.45)]',
  },
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
      <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-rose-300 to-amber-500 transition-[width] duration-500 ease-out"
          style={{ width: `${progress * 100}%` }}
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
            <div
              className={`absolute rounded-full border-4 ${colors.ring} ${colors.bg} ${colors.glow} transition-[transform,background-color,border-color,box-shadow]`}
              style={{
                width: 180,
                height: 180,
                transform: `scale(${prefersReduced ? 1 : phase.scale})`,
                transitionDuration: `${Math.max(phase.duration * 0.9, 300)}ms`,
                transitionTimingFunction: phase.type === 'inhale' ? 'ease-in' : phase.type === 'exhale' ? 'ease-out' : 'linear',
              }}
            />
            <p key={phase.label + phaseIdx} className={`word-swap relative z-10 font-display text-xl tracking-tight ${colors.text}`}>
              {phase.label}
            </p>
          </div>

          <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-4">
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
    <StaggerItem className="h-full">
      <button
        onClick={() => onStart(exercise)}
        className="group flex h-full w-full flex-col items-start rounded-3xl border border-line bg-surface p-6 text-left shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
      >
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-4">
            {exercise.technique}
          </span>
          <span className="inline-flex size-9 items-center justify-center rounded-full border border-line text-ink-3 transition-all group-hover:border-rose-300 group-hover:bg-rose-100 group-hover:text-ink">
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

        <div className="mt-5 text-[12px] font-medium text-ink-2">
          {exercise.inhale_sec}s in
          {exercise.hold_in_sec > 0 ? ` · ${exercise.hold_in_sec}s hold` : ''}
          {` · ${exercise.exhale_sec}s out`}
          {exercise.hold_out_sec > 0 ? ` · ${exercise.hold_out_sec}s hold` : ''}
          {` · ${exercise.cycles} cycles`}
        </div>
      </button>
    </StaggerItem>
  );
}

export default function Breathing({ withHeading = true, tinted = true }) {
  const content = useSiteContent('breathing');
  // Starts with the built-in set, so the section renders on first paint and
  // keeps working when the database is unreachable or has not been seeded.
  const [exercises, setExercises] = useState(breathingDefaults);
  const [active, setActive] = useState(null);

  useEffect(() => {
    let alive = true;
    listActiveExercises()
      .then((rows) => {
        if (!alive) return;
        // Only replace the defaults when the database actually has something.
        // An empty table means "not set up yet", not "show nothing".
        if (Array.isArray(rows) && rows.length) setExercises(rows);
      })
      .catch((err) => {
        // Was swallowed silently, which made this section vanish from the page
        // with no explanation anywhere. The visitor still gets the defaults.
        console.warn('[lumen] breathing exercises unavailable, using defaults', err);
      });
    return () => { alive = false; };
  }, []);

  return (
    <>
      <div className={tinted ? 'bg-surface-2/60' : ''}>
      <Section id="breathing" className={sectionPad(withHeading)}>
        {withHeading && (
          <SectionHeading eyebrow={content.eyebrow} title={content.headline} lead={content.lead} />
        )}

        <Stagger className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${withHeading ? 'mt-12' : ''}`}>
          {exercises.map((ex) => (
            <ExerciseCard key={ex.id ?? ex.slug} exercise={ex} onStart={setActive} />
          ))}
        </Stagger>
      </Section>
      </div>

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
