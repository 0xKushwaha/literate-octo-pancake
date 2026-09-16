import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Counter, Pill } from '../components/primitives';
import Avatar from '../components/Avatar';
import HeroVisual from './HeroVisual';
import Icon from '../components/Icon';
import { useSiteContent } from '../lib/queries/siteContent';
import { useFeatures, usePrimaryCta } from '../lib/features';

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
          className={`mark col-start-1 row-start-1 justify-self-start text-aurora italic ${
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
  // Booking when booking is on, the community invite when it is not, and
  // nothing at all when there is neither — better an absent button than one
  // that opens a form the practice has switched off.
  const cta = usePrimaryCta(content.primary_cta);
  const trust = useSiteContent('trust');
  const therapistsContent = useSiteContent('therapists');
  const booking = useSiteContent('booking');
  const words = Array.isArray(content.rotating_words) && content.rotating_words.length ? content.rotating_words : ['you'];
  const stats = Array.isArray(trust.stats) ? trust.stats : [];
  // The same list the booking form offers, minus the two entries that are not
  // insurers. Nothing new to maintain, and it can never drift from the form.
  const insurers = (Array.isArray(booking.insurers) ? booking.insurers : []).filter(
    (n) => !/^self-pay$|not sure|^other/i.test(String(n).trim()),
  );
  const therapists = Array.isArray(therapistsContent.items) ? therapistsContent.items : [];

  return (
    <section id="top" className="backdrop-soft relative overflow-hidden pt-12 sm:pt-20">
      <div className="mx-auto grid w-full max-w-[1280px] items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-14">
        <div>
          <div className="flex flex-wrap items-center gap-3">

            <span className="text-[13px] text-ink-4">{content.location_note}</span>
          </div>

          <h1 className="mt-6 font-display text-[clamp(2.8rem,6.4vw,5rem)] leading-[1.04] tracking-[-0.02em] text-ink">
            <span className="block">{content.headline}</span>
            <RotatingWord words={words} />
          </h1>

          <p className="mt-7 max-w-[46ch] text-[17px] leading-relaxed text-ink-2 sm:text-[18.5px]">{content.subheadline}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {cta && (
              <Button variant="primary" size="lg" icon="arrow" {...cta.props} className="w-full sm:w-auto">
                {cta.label}
              </Button>
            )}
            {/* Promoted to the primary style when there is no primary button
                — while the Discord invite is still blank there would
                otherwise be nothing filled in on the hero at all, which reads
                as a page that has not finished loading. */}
            <Button variant={cta ? 'secondary' : 'primary'} size="lg" as={Link} to="/how-it-works" className="w-full sm:w-auto">
              {content.secondary_cta}
            </Button>
          </div>

        </div>

        {/* The organic form on a device that can carry it, the practice's
            photograph everywhere else. Same box, same radius, same shadow,
            either way — see HeroVisual for which case gets which. */}
        <HeroVisual imageUrl={content.image_url} imageAlt={content.image_alt ?? ''}>
          {/* The match card is a therapist profile, so it follows the same
              switch the rest of them do. Leaving a named clinician floating
              over the hero while /therapists is switched off would be the
              one place the site contradicts itself. */}
          {features.therapists && <MatchCard therapist={therapists[0]} badge={content.match_badge} />}
        </HeroVisual>
      </div>

      {/* The proof strip. It was four bordered white cards, which read as a
          fifth component on a page that already has plenty; hairlines and
          space do the same job and let the numbers be the loudest thing in
          the band. The insurer line under it is the quiet answer to "can I
          afford this" — the one money question worth answering before the
          page has asked for anything. */}
      {(stats.length > 0 || insurers.length > 0) && (
        <div className="mx-auto mt-16 w-full max-w-[1280px] px-5 pb-2 sm:px-8">
          {stats.length > 0 && (
            <dl className="grid grid-cols-2 border-t border-line lg:grid-cols-4">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex flex-col-reverse px-1 py-6 sm:py-7 ${
                    i % 2 === 1 ? 'border-l border-line pl-6' : 'lg:border-l lg:border-line lg:pl-6'
                  } ${i > 1 ? 'border-t border-line lg:border-t-0' : ''}`}
                >
                  <dt className="mt-2 text-[12.5px] leading-snug text-ink-3">{s.label}</dt>
                  <dd className="font-display text-[clamp(2.1rem,3.6vw,2.9rem)] font-medium leading-none tracking-tight text-accent-strong">
                    <Counter value={Number(s.value) || 0} decimals={s.decimals ?? 0} suffix={s.suffix ?? ''} />
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {insurers.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line py-5">
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
