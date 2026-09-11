import { Button, Reveal, Section } from '../components/primitives';
import Icon from '../components/Icon';
import { telHref, useBrand, useSiteContent } from '../lib/queries/siteContent';

/**
 * The closing band — the one place on the site that goes dark.
 *
 * It used to be a white card with two blurred pink blooms painted over it,
 * which is exactly the gradient this palette no longer uses. A single deep
 * teal panel does the job better: after a page of white cards on warm paper
 * it lands like a change of light, and it gives the amber button somewhere
 * to be the brightest thing on screen without shouting over everything above
 * it. White type sits at 8.3:1 on that panel, black type at 10.3:1 on the
 * button, so the loudest block on the site is also the most legible one.
 */
export default function CtaBand({ onBook }) {
  const content = useSiteContent('cta');
  const brand = useBrand();
  const reassurances = Array.isArray(content.reassurances) ? content.reassurances : [];

  return (
    <Section className="pb-20 pt-6 sm:pb-28">
      <Reveal className="on-deep relative overflow-hidden rounded-[2rem] px-6 py-16 text-center shadow-[var(--shadow-float)] sm:px-14 sm:py-20">
        {/* Two flat rings, drawn in the panel's own lighter tone. Solid strokes,
            no fill, no blend — decoration that cannot muddy the colour. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 size-[22rem] rounded-full border border-white/10"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 size-[20rem] rounded-full border border-white/10"
        />

        <div className="relative">
          <h2 className="mx-auto max-w-[20ch] font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[1.06] tracking-[-0.02em]">
            {content.headline}{' '}
            <span className="italic text-amber-500">{content.headline_accent}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-[46ch] text-[16.5px] leading-relaxed text-white/80">{content.body}</p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button variant="accent" size="lg" icon="arrow" onClick={() => onBook?.()}>
              {content.primary}
            </Button>
            <Button
              size="lg"
              as="a"
              href={telHref(brand.phone)}
              iconLeft="phone"
              className="border border-white/30 bg-transparent !text-white hover:border-white hover:bg-white/10 hover:!text-white"
              variant="quiet"
            >
              {content.secondary}
            </Button>
          </div>

          <p className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12.5px] text-white/70">
            {reassurances.map((r, i) => (
              <span key={`${r}-${i}`} className="flex items-center gap-2">
                <Icon name="check" size={12} className="text-amber-500" />
                {r}
              </span>
            ))}
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
