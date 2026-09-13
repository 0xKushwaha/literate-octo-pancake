import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHomepageExercises } from '../lib/queries/breathing';
import { breathingDefaults } from '../data/breathingDefaults';
import { Button, Eyebrow, Reveal, Section, Stagger, StaggerItem } from '../components/primitives';
import { useSiteContent } from '../lib/queries/siteContent';
import Icon from '../components/Icon';

/**
 * The breathing invitation on the homepage — deliberately not a card in the
 * explore grid. Reading an article and doing a breathing exercise are different
 * kinds of ask: one is "take this away", the other is "stop for a minute, here,
 * now". So it gets its own tinted band, its own heading and a breathing circle
 * instead of a thumbnail.
 *
 * Which exercises: the ones ticked "Show on homepage" in Admin → Breathing, in
 * sort order, falling back to the first active ones when none are ticked. How
 * many: `breathe_home.count`. The built-in defaults stand in while the query is
 * in flight or when the table is empty, so the band is never a heading with
 * nothing under it.
 */

/**
 * The medallion on each exercise row.
 *
 * The rows stay white — they sit on the tinted band, and tinting them as well
 * would turn a clean list into patchwork — so the colour goes in the one place
 * on each row that is already a shape rather than text. Three exercises, three
 * medallions, and the list reads as three different things instead of the same
 * thing printed three times.
 */
const MEDALLIONS = [
  'bg-brand-100 text-accent-strong',
  'bg-peach-100 text-ink',
  'bg-sand-100 text-ink',
];

function fill(template, values) {
  return Object.entries(values).reduce(
    (out, [k, v]) => out.replaceAll(`{${k}}`, v ?? ''),
    template ?? '',
  );
}

function count(value, fallback, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, max);
}

/**
 * A small, still version of the player's ring. One ring stays put so the
 * shape still reads under prefers-reduced-motion and in a screenshot; two
 * drift outward on a six-second loop, which is roughly the pace of the
 * breathing it is advertising.
 */
function BreathingCircle() {
  return (
    <div className="relative grid size-40 shrink-0 place-items-center" aria-hidden="true">
      <span className="absolute size-32 rounded-full border border-brand-300" />
      <span className="absolute size-24 rounded-full bg-brand-200 breathe-echo opacity-40" />
      <span className="absolute size-24 rounded-full bg-brand-200 breathe-echo opacity-40" style={{ animationDelay: '3s' }} />
      <span className="relative grid size-16 place-items-center rounded-full bg-brand-500 text-white">
        <Icon name="wave" size={22} />
      </span>
    </div>
  );
}

export default function BreathePrompt() {
  const c = useSiteContent('breathe_home');
  const limit = count(c.count, 3, 6);
  const [exercises, setExercises] = useState(breathingDefaults);

  useEffect(() => {
    let alive = true;
    getHomepageExercises(limit)
      .then((rows) => { if (alive && rows?.length) setExercises(rows); })
      .catch((err) => console.error('[lumen] could not load breathing exercises', err));
    return () => { alive = false; };
  }, [limit]);

  const shown = exercises.slice(0, limit);
  if (limit === 0 || shown.length === 0) return null;

  return (
    <div className="backdrop-soft">
      <Section id="breathe" className="grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <Reveal>
          {c.eyebrow && <Eyebrow>{c.eyebrow}</Eyebrow>}
          <h2 className="mt-4 font-display text-[clamp(1.9rem,3.6vw,2.9rem)] leading-[1.05] tracking-[-0.02em] text-ink">
            {c.headline}
          </h2>
          {c.lead && <p className="mt-5 max-w-[46ch] text-[16.5px] leading-relaxed text-ink-3">{c.lead}</p>}

          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Button as={Link} to="/breathe" size="lg" icon="arrow">{c.cta}</Button>
            <BreathingCircle />
          </div>
        </Reveal>

        <Stagger className="grid gap-3" step={0.07}>
          {shown.map((e, i) => (
            <StaggerItem key={e.id}>
              <Link
                to="/breathe"
                className="group flex items-center gap-4 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <span className={`grid size-11 shrink-0 place-items-center rounded-full ${MEDALLIONS[i % MEDALLIONS.length]}`}>
                  <Icon name="wave" size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[1.1rem] leading-snug tracking-tight text-ink">{e.name}</span>
                  {e.description && (
                    <span className="mt-1 line-clamp-2 block text-[13.5px] leading-relaxed text-ink-3">{e.description}</span>
                  )}
                  <span className="mt-2 block text-[12px] text-ink-4">
                    {fill(c.meta, { n: e.cycles, technique: e.technique, difficulty: e.difficulty })}
                  </span>
                </span>
                <Icon
                  name="arrow"
                  size={16}
                  className="shrink-0 text-ink-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink"
                />
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>
    </div>
  );
}
