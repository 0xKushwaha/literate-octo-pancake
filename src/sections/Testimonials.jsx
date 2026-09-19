import { Section, SectionHeading, Stagger, StaggerItem } from '../components/primitives';
import Icon from '../components/Icon';
import AudioNote from '../components/AudioNote';
import { useSiteContent } from '../lib/queries/siteContent';
import { safeMediaUrl } from '../lib/safeUrl';

/**
 * `tinted` exists because of what this section touches on the homepage: the
 * breathing band directly below it, which is already tinted. Two tinted bands
 * meeting read as one very tall band rather than two sections, so on the
 * homepage the reviews sit on paper and the band below keeps its edge. (It
 * was first switched off for the same reason against the hero above, back
 * when the reviews sat directly under it.) Everywhere else they stay tinted.
 */
/** An uploaded clip (https) or one served from this site; nothing else. */
function audioOf(t) {
  return safeMediaUrl(t?.audio_url) ?? '';
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
                  {/* No icon here: the button two lines down is a play
                      triangle, and two of them side by side is one too many
                      for a label that is already quiet. */}
                  <figcaption className="mb-2 text-[11.5px] font-medium text-ink-4">
                    {content.audio_label}
                  </figcaption>
                  {/* Our own control rather than the browser's. It also
                      settles the download question for good: with no native
                      controls there is no overflow menu to offer it, on every
                      browser rather than only the two that honour
                      controlsList. The file is still at a public URL, so this
                      remains a matter of not inviting it. */}
                  <AudioNote src={audioOf(t)} label={content.audio_label} />
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
