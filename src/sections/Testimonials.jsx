import { Section, SectionHeading, Stagger, StaggerItem } from '../components/primitives';
import Icon from '../components/Icon';
import { useSiteContent } from '../lib/queries/siteContent';
import { safeExternalUrl } from '../lib/safeUrl';

/**
 * `tinted` exists because of what this section touches on the homepage: the
 * breathing band directly below it, which is already tinted. Two tinted bands
 * meeting read as one very tall band rather than two sections, so on the
 * homepage the reviews sit on paper and the band below keeps its edge. (It
 * was first switched off for the same reason against the hero above, back
 * when the reviews sat directly under it.) Everywhere else they stay tinted.
 */
/** Only an https clip is ever played; anything else counts as no recording. */
function audioOf(t) {
  return safeExternalUrl(t?.audio_url) ?? '';
}

export default function Testimonials({ limit = 6, tinted = true }) {
  const content = useSiteContent('testimonials');
  const testimonials = Array.isArray(content.items) ? content.items : [];
  if (testimonials.length === 0) return null;

  return (
    <div className={tinted ? 'bg-bg-2' : ''}>
      <Section id="testimonials" className="py-20 sm:py-24">
        <SectionHeading eyebrow={content.eyebrow} title={content.headline} align="center" />

        <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" step={0.06}>
          {testimonials.slice(0, limit).map((t, i) => (
            <StaggerItem
              key={`${t.name}-${i}`}
              as="figure"
              className="flex h-full flex-col rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]"
            >
              <div className="flex gap-0.5 text-amber-500">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Icon key={k} name="star" size={13} filled />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-[15.5px] leading-relaxed text-ink-2">“{t.quote}”</blockquote>
              {/* The recording is an addition to the quote, never a
                  replacement for it. Someone scrolling with the sound off, on
                  a train, or using a screen reader gets the same testimonial
                  either way; the voice is for those who want it.

                  preload="none" because a page can carry six of these and none
                  of them should cost a visitor anything until they press play.
                  The URL goes through safeExternalUrl for the same reason the
                  community invite does: it comes out of the CMS, and an
                  https-only check is cheap. */}
              {audioOf(t) && (
                <figure className="mt-4 m-0">
                  <figcaption className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-ink-4">
                    <Icon name="play" size={11} filled />
                    {content.audio_label}
                  </figcaption>
                  <audio
                    controls
                    preload="none"
                    src={audioOf(t)}
                    className="h-9 w-full"
                  >
                    {/* Shown only by a browser with no audio support at all;
                        the quote above is already the real fallback. */}
                    <a href={audioOf(t)}>{content.audio_label}</a>
                  </audio>
                </figure>
              )}
              <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                <span className="text-[14px] text-ink">{t.name}</span>
                <span className="text-[12px] text-ink-4">{t.meta}</span>
              </figcaption>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>
    </div>
  );
}
