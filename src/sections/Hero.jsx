import { useEffect, useState } from 'react';
import { Button, Counter, Pill } from '../components/primitives';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { useBrand, useSiteContent } from '../lib/queries/siteContent';

/** Cycles through the CMS list; pauses for reduced motion. */
function RotatingWord({ words }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (words.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % words.length), 2600);
    return () => clearInterval(t);
  }, [words.length]);
  const word = words[i] ?? '';
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span key={`${word}-${i}`} className="word-swap text-aurora italic">
        {word}
      </span>
      <span aria-hidden className="absolute inset-x-0 -bottom-1 h-[3px] rounded-full bg-amber-500/70 sm:-bottom-1.5 sm:h-1" />
    </span>
  );
}

/** Small, honest-looking product card so the hero has something to look at without a 3D scene. */
function HeroCards({ therapists, onBook }) {
  const t = therapists[0];
  const t2 = therapists[1];
  return (
    <div className="relative mx-auto w-full max-w-[420px] lg:mx-0" aria-hidden="true">
      <div className="rounded-4xl border border-line bg-surface p-5 shadow-[var(--shadow-lift)]">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Your match</span>
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10.5px] font-medium text-ink">Ready in 1 day</span>
        </div>
        {t && (
          <div className="mt-4 flex items-center gap-3">
            <Avatar name={t.name} hue={t.hue} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-display text-[20px] leading-tight text-ink">{t.name}</p>
              <p className="text-[12.5px] text-ink-3">{t.credentials}</p>
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {(t?.focus ?? []).slice(0, 3).map((f) => (
            <Pill key={f}>{f}</Pill>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {['Tue 09:30', 'Tue 14:00', 'Wed 11:15'].map((s, i) => (
            <span
              key={s}
              className={`rounded-xl border px-2 py-2 text-[12px] ${i === 0 ? 'border-ink bg-ink text-white' : 'border-line bg-surface-2 text-ink-2'}`}
            >
              {s}
            </span>
          ))}
        </div>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onBook?.()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-400 via-peach-100 to-amber-500 py-2.5 text-[13.5px] font-medium text-ink"
        >
          Book this slot
          <Icon name="arrow" size={15} />
        </button>
      </div>

      {t2 && (
        <div className="absolute -left-4 -bottom-8 hidden items-center gap-3 rounded-2xl border border-line bg-surface p-3 pr-4 shadow-[var(--shadow-card)] sm:flex">
          <Avatar name={t2.name} hue={t2.hue} size="sm" />
          <div>
            <p className="text-[13px] font-medium text-ink">{t2.name.replace(/^Dr\.\s+/, '')}</p>
            <p className="text-[11.5px] text-ink-4">Video · In person</p>
          </div>
        </div>
      )}
      <div className="absolute -right-3 -top-5 hidden items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5 shadow-[var(--shadow-card)] sm:flex">
        <span className="grid size-7 place-items-center rounded-full bg-rose-100 text-ink"><Icon name="phone" size={13} /></span>
        <div>
          <p className="text-[12.5px] font-medium text-ink">Free 15-min intro call</p>
          <p className="text-[10.5px] text-ink-4">before you commit to anything</p>
        </div>
      </div>
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
    <section id="top" className="backdrop-soft relative overflow-hidden pt-28 sm:pt-36">
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10 lg:px-10">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Pill tone="rose">
              <span className="size-1.5 rounded-full bg-ink" />
              {content.status_pill}
            </Pill>
            <span className="text-[12.5px] text-ink-4">{content.location_note}</span>
          </div>

          <h1 className="mt-7 font-display text-[clamp(3rem,7.5vw,5.75rem)] leading-[1.02] tracking-[-0.03em] text-ink">
            {content.headline} <RotatingWord words={words} />
          </h1>

          <p className="mt-7 max-w-[50ch] text-[17px] leading-relaxed text-ink-2 sm:text-[18.5px]">
            {content.subheadline}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" icon="arrow" onClick={onBook} className="w-full sm:w-auto">
              {content.primary_cta}
            </Button>
            <Button variant="ghost" size="lg" as="a" href="#approach" className="w-full sm:w-auto">
              {content.secondary_cta}
            </Button>
          </div>

          <ul className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2">
            {credentials.slice(0, 4).map((c) => (
              <li key={c} className="flex items-center gap-2 text-[13px] text-ink-3">
                <Icon name="check" size={13} className="text-ink" />
                {c}
              </li>
            ))}
          </ul>
        </div>

        <HeroCards therapists={therapists} onBook={onBook} />
      </div>

      {stats.length > 0 && (
        <div className="mx-auto mt-20 w-full max-w-[1200px] px-5 sm:px-8 lg:px-10">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse bg-surface px-6 py-6 sm:py-7">
                <dt className="mt-2 text-[13px] leading-snug text-ink-3">{s.label}</dt>
                <dd className="font-display text-[clamp(2rem,3.5vw,2.75rem)] leading-none tracking-tight text-ink">
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
