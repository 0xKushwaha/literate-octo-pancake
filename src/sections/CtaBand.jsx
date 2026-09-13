import { Button, Reveal, Section } from '../components/primitives';
import Icon from '../components/Icon';
import { telHref, useBrand, useSiteContent } from '../lib/queries/siteContent';
import { useCommunity, useFeatures, usePrimaryCta } from '../lib/features';

/**
 * The closing band — the one place on the site that goes dark.
 *
 * It carries whichever ask the site is currently making. With booking on that
 * is the booking form, and the copy comes from the `cta` section. With booking
 * off it is the Discord community, and the copy comes from `community`: two
 * separate sets of words rather than one set with the nouns swapped, because
 * "two minutes now, a matched therapist by tomorrow" is not a sentence about
 * a chat server, and an admin who switches booking back on should not find
 * their closing paragraph has been rewritten underneath them.
 *
 * A single deep panel does the work that two blurred blooms used to: after a
 * page of white cards on warm paper it lands like a change of light, and it
 * gives the amber button somewhere to be the brightest thing on screen. White
 * type sits at 8.3:1 on that panel, black type at 10.3:1 on the button.
 */
export default function CtaBand() {
  const bookingCopy = useSiteContent('cta');
  const communityCopy = useSiteContent('community');
  const brand = useBrand();
  const features = useFeatures();
  const community = useCommunity();
  const action = usePrimaryCta(bookingCopy.primary);

  const booking = features.booking;
  const content = booking ? bookingCopy : communityCopy;
  const chips = booking ? bookingCopy.reassurances : communityCopy.chips;
  const reassurances = Array.isArray(chips) ? chips : [];

  // Booking off and no community to send anyone to leaves the band with
  // nothing to ask for. A dark panel of copy under a button that does not
  // exist reads as a bug, so the band comes off the page entirely.
  if (!booking && !features.community) return null;


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
          className="pointer-events-none absolute -bottom-32 -left-20 size-[20rem] rounded-full border border-peach-100/25"
        />

        <div className="relative">
          <h2 className="mx-auto max-w-[20ch] font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[1.06] tracking-[-0.02em]">
            {content.headline}{' '}
            <span className="italic text-amber-500">{content.headline_accent}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-[46ch] text-[16.5px] leading-relaxed text-white/80">{content.body}</p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            {action && (
              <Button variant="accent" size="lg" icon="arrow" {...action.props}>
                {action.label}
              </Button>
            )}
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
                <Icon name="check" size={12} className={booking ? 'text-amber-500' : 'text-peach-100'} />
                {r}
              </span>
            ))}
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
