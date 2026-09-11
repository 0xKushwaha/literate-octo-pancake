import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Counter, Pill } from '../components/primitives';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { useBrand, useSiteContent } from '../lib/queries/siteContent';

/**
 * The changing word on its own line.
 *
 * Every word is rendered, stacked in the same grid cell, with the inactive
 * ones hidden. That makes the box exactly as tall and as wide as the longest
 * word in the list, so nothing below it moves when the word swaps — and,
 * unlike a fixed height with overflow hidden, nothing is clipped either.
 * Fraunces italic has deep descenders and tall ascenders (the g and f in
 * "grief" were losing their tails), so the box has to measure itself.
 */
function RotatingWord({ words }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (words.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % words.length), 2600);
    return () => clearInterval(t);
  }, [words.length]);

  return (
    <span className="grid pb-[0.12em] leading-[1.18]">
      {words.map((word, n) => (
        <span
          key={`${word}-${n}`}
          aria-hidden={n === i ? undefined : true}
          className={`col-start-1 row-start-1 justify-self-start text-aurora italic ${
            n === i ? 'word-swap' : 'invisible'
          }`}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

/** A small "match" card floating over the photo, built from real therapist data. */
function MatchCard({ therapist }) {
  if (!therapist) return null;
  return (
    <div className="absolute -bottom-5 left-4 right-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 pr-4 shadow-[var(--shadow-lift)] sm:left-auto sm:right-6 sm:w-[300px]" aria-hidden="true">
      <Avatar name={therapist.name} hue={therapist.hue} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-ink">{therapist.name}</p>
        <p className="truncate text-[12px] text-ink-3">{therapist.credentials}</p>
      </div>
      <span className="shrink-0 rounded-full bg-rose-200 px-2 py-0.5 text-[10.5px] font-semibold text-ink">Matched in 1 day</span>
    </div>
  );
}

export default function Hero({ onBook }) {
  const content = useSiteContent('hero');
  const trust = useSiteContent('trust');
  const brand = useBrand();
  const therapistsContent = useSiteContent('therapists');
  const words = Array.isArray(content.rotating_words) && content.rotating_words.length ? content.rotating_words : ['you'];
  const credentials = Array.isArray(brand.credentials) ? brand.credentials : [];
  const stats = Array.isArray(trust.stats) ? trust.stats : [];
  const therapists = Array.isArray(therapistsContent.items) ? therapistsContent.items : [];

  return (
    <section id="top" className="backdrop-soft relative overflow-hidden pt-10 sm:pt-16">
      <div className="mx-auto grid w-full max-w-[1280px] items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-14">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Pill tone="rose">
              <span className="size-1.5 rounded-full bg-ink" />
              {content.status_pill}
            </Pill>
            <span className="text-[13px] text-ink-4">{content.location_note}</span>
          </div>

          <h1 className="mt-6 font-display text-[clamp(2.8rem,6.4vw,5rem)] leading-[1.04] tracking-[-0.02em] text-ink">
            <span className="block">{content.headline}</span>
            <RotatingWord words={words} />
          </h1>

          <p className="mt-6 max-w-[50ch] text-[17px] leading-relaxed text-ink-2 sm:text-[18px]">{content.subheadline}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" icon="arrow" onClick={onBook} className="w-full sm:w-auto">
              {content.primary_cta}
            </Button>
            <Button variant="secondary" size="lg" as={Link} to="/how-it-works" className="w-full sm:w-auto">
              {content.secondary_cta}
            </Button>
          </div>

          <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
            {credentials.slice(0, 4).map((c) => (
              <li key={c} className="flex items-center gap-1.5 text-[13px] text-ink-3">
                <Icon name="check" size={13} className="text-ink" />
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-[2rem] bg-surface-2 shadow-[var(--shadow-lift)]" style={{ aspectRatio: '5 / 4' }}>
            {content.image_url && (
              <img
                src={content.image_url}
                alt={content.image_alt ?? ''}
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <MatchCard therapist={therapists[0]} />
        </div>
      </div>

      {stats.length > 0 && (
        <div className="mx-auto mt-16 w-full max-w-[1280px] px-5 pb-4 sm:px-8">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse bg-surface px-6 py-5 sm:py-6">
                <dt className="mt-1.5 text-[13px] leading-snug text-ink-3">{s.label}</dt>
                <dd className="font-display text-[clamp(1.9rem,3.2vw,2.5rem)] font-medium leading-none tracking-tight text-ink">
                  <Counter value={Number(s.value) || 0} decimals={s.decimals ?? 0} suffix={s.suffix ?? ''} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
