import { useCallback, useEffect, useMemo, useState } from 'react';
import { listActiveExercises } from '../lib/queries/breathing';
import { breathingDefaults } from '../data/breathingDefaults';
import { Section, SectionHeading, Stagger, StaggerItem, sectionPad } from '../components/primitives';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Icon from '../components/Icon';
import { useReducedMotion } from '../lib/hooks';
import { useSiteContent } from '../lib/queries/siteContent';

/**
 * One solid colour per phase, on the dark panel.
 *
 * They have to be told apart with your eyes half closed, which is the actual
 * use case, so they differ in hue and in lightness: pale teal in, warm sand
 * to hold, amber out. Every one carries ink type at better than 8:1, and
 * every one is a flat fill — the old version used a 60px coloured glow, which
 * is a gradient by another name and turned to soup against a light card.
 */
const PHASE = {
  inhale: { fill: 'bg-brand-300', stroke: 'var(--color-brand-300)', dot: 'bg-brand-300' },
  hold: { fill: 'bg-sand-100', stroke: 'var(--color-sand-100)', dot: 'bg-sand-100' },
  exhale: { fill: 'bg-amber-500', stroke: 'var(--color-amber-500)', dot: 'bg-amber-500' },
};

const R = 104;
const ARC = 2 * Math.PI * R;

function buildPhases(ex, labels) {
  const phases = [];
  for (let i = 0; i < ex.cycles; i++) {
    phases.push({ label: labels.inhale, type: 'inhale', scale: 1, duration: ex.inhale_sec * 1000, cycle: i });
    if (ex.hold_in_sec > 0) phases.push({ label: labels.hold, type: 'hold', scale: 1, duration: ex.hold_in_sec * 1000, cycle: i });
    phases.push({ label: labels.exhale, type: 'exhale', scale: 0.44, duration: ex.exhale_sec * 1000, cycle: i });
    if (ex.hold_out_sec > 0) phases.push({ label: labels.hold, type: 'hold', scale: 0.44, duration: ex.hold_out_sec * 1000, cycle: i });
  }
  return phases;
}

/** Seconds one full run of an exercise takes. */
export function exerciseSeconds(ex) {
  return (
    (Number(ex.inhale_sec) + Number(ex.hold_in_sec || 0) + Number(ex.exhale_sec) + Number(ex.hold_out_sec || 0)) *
    Number(ex.cycles)
  );
}

function minutesLabel(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.round(seconds / 60);
  return `${m} min`;
}

/**
 * The pattern of an exercise as flat bars: one bar per part of the cycle,
 * width proportional to its seconds. It is the quickest way to see that 4-7-8
 * is mostly exhale and box breathing is four equal sides, and it gives the
 * card something to look at that is not another icon.
 */
function RhythmStrip({ exercise, className = '' }) {
  const parts = [
    { type: 'inhale', sec: Number(exercise.inhale_sec) || 0 },
    { type: 'hold', sec: Number(exercise.hold_in_sec) || 0 },
    { type: 'exhale', sec: Number(exercise.exhale_sec) || 0 },
    { type: 'hold', sec: Number(exercise.hold_out_sec) || 0 },
  ].filter((p) => p.sec > 0);
  const total = parts.reduce((n, p) => n + p.sec, 0) || 1;

  return (
    <div className={`flex h-1.5 w-full gap-1 ${className}`} aria-hidden="true">
      {parts.map((p, i) => (
        <span
          key={`${p.type}-${i}`}
          className={`block rounded-full ${PHASE[p.type].dot}`}
          style={{ width: `${(p.sec / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

function BreathingGuide({ exercise, onClose, content }) {
  const prefersReduced = useReducedMotion();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [done, setDone] = useState(false);
  const [runId, setRunId] = useState(0);

  const phases = useMemo(
    () =>
      buildPhases(exercise, {
        inhale: content.inhale_label,
        hold: content.hold_label,
        exhale: content.exhale_label,
      }),
    [exercise, content.inhale_label, content.hold_label, content.exhale_label],
  );
  const totalPhases = phases.length;
  const phase = phases[phaseIdx] ?? phases[0];

  const restart = useCallback(() => {
    setPhaseIdx(0);
    setDone(false);
    setRunId((n) => n + 1);
  }, []);

  // One timeout moves the phase on; one interval drives the seconds counter.
  // The counter is derived from a start timestamp rather than decremented, so
  // a tab that was throttled in the background comes back showing the truth.
  useEffect(() => {
    if (done) return undefined;
    const duration = phases[phaseIdx]?.duration ?? 4000;
    const startedAt = Date.now();
    setRemaining(Math.ceil(duration / 1000));

    const tick = setInterval(() => {
      const left = Math.ceil((duration - (Date.now() - startedAt)) / 1000);
      setRemaining(left > 0 ? left : 0);
    }, 250);

    const next = setTimeout(() => {
      setPhaseIdx((i) => {
        if (i + 1 >= totalPhases) { setDone(true); return i; }
        return i + 1;
      });
    }, duration);

    return () => { clearInterval(tick); clearTimeout(next); };
  }, [phaseIdx, done, phases, totalPhases, runId]);

  const colors = PHASE[phase.type];
  const progress = done ? 1 : (phaseIdx + 1) / totalPhases;
  const cycleNum = Math.min((phase.cycle ?? 0) + 1, exercise.cycles);
  const seconds = exerciseSeconds(exercise);

  if (done) {
    return (
      <div className="flex flex-col items-center px-7 py-14 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-amber-500 text-ink">
          <Icon name="check" size={26} />
        </span>
        <p className="mt-6 font-display text-[26px] leading-tight tracking-tight text-white">{content.done_title}</p>
        <p className="mt-2 max-w-[30ch] text-[14px] leading-relaxed text-white/70">{content.done_body}</p>

        <dl className="mt-8 grid w-full max-w-[17rem] grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15">
          <div className="bg-deep px-4 py-3">
            <dd className="font-display text-[20px] leading-none text-white">{exercise.cycles}</dd>
            <dt className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-white/60">cycles</dt>
          </div>
          <div className="bg-deep px-4 py-3">
            <dd className="font-display text-[20px] leading-none text-white">{minutesLabel(seconds)}</dd>
            <dt className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-white/60">breathing</dt>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={restart}
            className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-ink transition hover:brightness-105"
          >
            {content.again_label}
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-white/30 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            {content.close_label}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-7 pb-10 pt-8 text-center">
      {/* how far through the whole exercise */}
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-white/80 transition-[width] duration-500 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.16em] text-white/55">
        {String(content.cycle_label ?? '').replace('{n}', cycleNum).replace('{total}', exercise.cycles)}
      </p>

      <div className="relative mt-6 grid size-[240px] place-items-center">
        {/* the ring: a static track, and one stroke swept over the length of
            this phase — a clock you read without counting */}
        <svg viewBox="0 0 240 240" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
          <circle cx="120" cy="120" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
          <circle
            key={`${runId}-${phaseIdx}`}
            className={prefersReduced ? '' : 'arc-sweep'}
            cx="120"
            cy="120"
            r={R}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={ARC}
            strokeDashoffset={prefersReduced ? 0 : undefined}
            style={{ '--arc-len': ARC, animationDuration: `${phase.duration}ms` }}
          />
        </svg>

        {/* two rings drifting outward, so the panel is never completely still */}
        {!prefersReduced && (
          <>
            <span className={`absolute size-[150px] rounded-full ${colors.fill} breathe-echo opacity-20`} />
            <span
              className={`absolute size-[150px] rounded-full ${colors.fill} breathe-echo opacity-20`}
              style={{ animationDelay: '3s' }}
            />
          </>
        )}

        {/* the orb — the thing you actually breathe with */}
        {/* Only the transform is transitioned. Crossfading the fill as well
            meant a four-second hold spent most of itself somewhere between
            teal and sand, which is the one thing the phase colours exist to
            prevent — the colour has to be right the moment the word changes. */}
        <span
          className={`absolute size-[150px] rounded-full ${colors.fill} transition-transform`}
          style={{
            transform: `scale(${prefersReduced ? 1 : phase.scale})`,
            transitionDuration: `${Math.max(phase.duration * 0.92, 300)}ms`,
            transitionTimingFunction:
              phase.type === 'inhale' ? 'cubic-bezier(0.4,0,0.5,1)' : phase.type === 'exhale' ? 'cubic-bezier(0.5,0,0.6,1)' : 'linear',
          }}
        />

        {/* label and count sit above the orb and never scale with it */}
        <span className="relative z-10 flex flex-col items-center">
          <span key={`label-${phaseIdx}`} className="word-swap font-display text-[19px] leading-none tracking-tight text-ink">
            {phase.label}
          </span>
          <span key={`n-${remaining}-${phaseIdx}`} className="tick-in mt-2 font-display text-[40px] font-medium leading-none tabular-nums text-ink">
            {remaining}
          </span>
        </span>
      </div>

      {/* one dot per cycle, filled as they go by */}
      <div className="mt-7 flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: exercise.cycles }).map((_, i) => (
          <span
            key={i}
            className={`block size-1.5 rounded-full transition-colors duration-500 ${
              i < cycleNum ? 'bg-white' : 'bg-white/25'
            }`}
          />
        ))}
      </div>

      <p className="mt-4 text-[13px] text-white/60">{exercise.name}</p>

      <button
        onClick={onClose}
        className="mt-7 rounded-full border border-white/25 px-5 py-2 text-[13px] text-white/80 transition hover:border-white/60 hover:text-white"
      >
        {content.end_label}
      </button>
    </div>
  );
}

function ExerciseCard({ exercise, onStart }) {
  const seconds = exerciseSeconds(exercise);
  return (
    <StaggerItem className="h-full">
      <button
        onClick={() => onStart(exercise)}
        className="group flex h-full w-full flex-col items-start rounded-3xl border border-line bg-surface p-6 text-left shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-4">
            {exercise.technique}
          </span>
          <span className="inline-flex size-9 items-center justify-center rounded-full border border-line text-ink-3 transition-colors duration-300 group-hover:border-brand-500 group-hover:bg-brand-500 group-hover:text-white">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </span>
        </div>

        <h3 className="mt-4 font-display text-[clamp(1.15rem,2vw,1.4rem)] leading-snug tracking-tight text-ink">
          {exercise.name}
        </h3>

        {exercise.description && (
          <p className="mt-2.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-3">
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

        <div className="mt-auto w-full pt-6">
          <RhythmStrip exercise={exercise} />
          <div className="mt-3 flex items-center justify-between text-[12px] font-medium text-ink-2">
            <span>
              {exercise.inhale_sec}s in
              {exercise.hold_in_sec > 0 ? ` · ${exercise.hold_in_sec}s hold` : ''}
              {` · ${exercise.exhale_sec}s out`}
              {exercise.hold_out_sec > 0 ? ` · ${exercise.hold_out_sec}s hold` : ''}
            </span>
            <span className="text-ink-4">{minutesLabel(seconds)}</span>
          </div>
        </div>
      </button>
    </StaggerItem>
  );
}

export default function Breathing({ withHeading = true, tinted = true }) {
  const content = useSiteContent('breathing');
  const ui = useSiteContent('ui');
  const guideContent = { ...content, close_label: ui.close };
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
      <div className={tinted ? 'bg-bg-2' : ''}>
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
        <DialogContent
          showCloseButton={false}
          className="on-deep max-h-[90dvh] max-w-sm overflow-y-auto rounded-4xl border-white/10 p-0"
        >
          <DialogTitle className="sr-only">
            {active?.name ?? 'Breathing exercise'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Guided breathing session. Follow the circle animation.
          </DialogDescription>
          {active && (
            <BreathingGuide exercise={active} onClose={() => setActive(null)} content={guideContent} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
