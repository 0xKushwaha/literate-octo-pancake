import { useEffect, useState } from 'react';
import { Counter } from '../components/primitives';
import Avatar from '../components/Avatar';
import HeroVisual from './HeroVisual';
import { useSiteContent } from '../lib/queries/siteContent';
import { useFeatures } from '../lib/features';

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
          className={`t-hero-word mark col-start-1 row-start-1 justify-self-start text-aurora italic ${
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
function MatchCard({ therapist, badge }) {
  if (!therapist) return null;
  return (
    <div className="absolute -bottom-5 left-4 right-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 pr-4 shadow-[var(--shadow-lift)] sm:left-auto sm:right-6 sm:w-[300px]" aria-hidden="true">
      <Avatar name={therapist.name} hue={therapist.hue} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-ink">{therapist.name}</p>
        <p className="truncate text-[12px] text-ink-3">{therapist.credentials}</p>
      </div>
      <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10.5px] font-semibold text-ink">{badge}</span>
    </div>
  );
}

export default function Hero() {
  const content = useSiteContent('hero');
  const features = useFeatures();
  const trust = useSiteContent('trust');
  const therapistsContent = useSiteContent('therapists');
  const booking = useSiteContent('booking');
  const words = Array.isArray(content.rotating_words) && content.rotating_words.length ? content.rotating_words : ['you'];
  // The numbers and the insurer line are edited in Site content → Home page,
  // and an empty list hides its own row. No switch: emptying the field is the
  // way to take one off the page.
  const stats = Array.isArray(trust.stats) ? trust.stats : [];
  // The same list the booking form offers, minus the two entries that are not
  // insurers. Nothing new to maintain, and it can never drift from the form.
  const insurers = (Array.isArray(booking.insurers) ? booking.insurers : []).filter(
    (n) => !/^self-pay$|not sure|^other/i.test(String(n).trim()),
  );
  const therapists = Array.isArray(therapistsContent.items) ? therapistsContent.items : [];
  // The proof strip used to be what ended this band, so with it switched off
  // the tint stopped level with the bottom of the visual and the next section
  // started against it. The band closes itself instead.
  const hasProofStrip = stats.length > 0 || insurers.length > 0;

  return (
    <section
      id="top"
      className={`backdrop-soft zone-hero relative overflow-hidden pt-10 sm:pt-14 lg:flex lg:min-h-[calc(100svh-4.75rem)] lg:flex-col lg:justify-center lg:pt-6 ${
        hasProofStrip ? 'pb-2 lg:pb-6' : 'pb-20 sm:pb-28'
      }`}
    >
      <div className="mx-auto grid w-full max-w-[1280px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <div className="flex flex-wrap items-center gap-3">

            <span className="text-[13px] text-ink-4">{content.location_note}</span>
          </div>

          <h1 className="t-hero-title mt-5 font-display text-[clamp(2.6rem,5.6vw,4rem)] leading-[1.04] tracking-[-0.02em] text-ink">
            <span className="block">{content.headline}</span>
            <RotatingWord words={words} />
          </h1>

          <p className="t-hero-text mt-6 max-w-[46ch] text-[16.5px] leading-relaxed text-ink-2 sm:text-[17.5px]">{content.subheadline}</p>

          {/* No buttons here on purpose. The hero states what the practice
              is; the ask lives in the header and in the closing band, and the
              cards immediately below are the thing worth scrolling to. */}

        </div>

        {/* The organic form on a device that can carry it, the practice's
            photograph everywhere else. Same box, same radius, same shadow,
            either way — see HeroVisual for which case gets which. */}
        {/* The visual is capped by the height left over on a laptop screen,
            not by its column: 5:4, so the width that fits is the height times
            1.25. That is what keeps the numbers below it above the fold. */}
        <div className="w-full lg:ml-auto lg:max-w-[min(100%,calc((100svh-24rem)*1.25))]">
        <HeroVisual imageUrl={content.image_url} imageAlt={content.image_alt ?? ''}>
          {/* The match card is a therapist profile, so it follows the same
              switch the rest of them do. Leaving a named clinician floating
              over the hero while /therapists is switched off would be the
              one place the site contradicts itself. */}
          {features.therapists && <MatchCard therapist={therapists[0]} badge={content.match_badge} />}
        </HeroVisual>
        </div>
      </div>

      {/* The proof strip. It was four bordered white cards, which read as a
          fifth component on a page that already has plenty; hairlines and
          space do the same job and let the numbers be the loudest thing in
          the band. The insurer line under it is the quiet answer to "can I
          afford this" — the one money question worth answering before the
          page has asked for anything. */}
      {(stats.length > 0 || insurers.length > 0) && (
        <div className="mx-auto mt-12 w-full max-w-[1280px] px-5 pb-2 sm:px-8 lg:mt-9">
          {stats.length > 0 && (
            <dl className="grid grid-cols-2 border-t border-line lg:grid-cols-4">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex flex-col-reverse px-1 py-5 sm:py-6 ${
                    i % 2 === 1 ? 'border-l border-line pl-6' : 'lg:border-l lg:border-line lg:pl-6'
                  } ${i > 1 ? 'border-t border-line lg:border-t-0' : ''}`}
                >
                  <dt className="mt-2 text-[12.5px] leading-snug text-ink-3">{s.label}</dt>
                  <dd className="t-stat font-display text-[clamp(1.9rem,3.1vw,2.6rem)] font-medium leading-none tracking-tight text-accent-strong">
                    <Counter value={Number(s.value) || 0} decimals={s.decimals ?? 0} suffix={s.suffix ?? ''} />
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {insurers.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line py-4">
              <span className="eyebrow">{trust.insurers_label}</span>
              {insurers.map((name) => (
                <span key={name} className="text-[14px] font-medium tracking-tight text-ink-3">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
