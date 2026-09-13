import { Reveal, Section, SectionHeading, Stagger, StaggerItem } from '../components/primitives';
import { useSiteContent } from '../lib/queries/siteContent';

const TILTS = ['-rotate-1', 'rotate-1', '-rotate-[0.5deg]', 'rotate-[0.75deg]', '-rotate-1'];
/**
 * The one place the warm half of the palette leads. These are the things
 * people were afraid to say out loud, so the cards are not the same blue as
 * the rest of the site — rose and peach from the reference card, ink on them
 * at better than 12:1. Every other section stays in the brand family.
 */
const TONES = ['bg-brand-100', 'bg-surface', 'bg-peach-100', 'bg-surface', 'bg-sand-100'];

/**
 * First-person reasons people delay therapy, in their words. The section
 * that follows (Services) answers them one by one.
 */
export default function HeardYou({ limit }) {
  const content = useSiteContent('heard');
  const all = Array.isArray(content.items) ? content.items : [];
  const items = limit ? all.slice(0, limit) : all;
  if (items.length === 0) return null;

  return (
    <Section id="heard" className="py-20 sm:py-24">
      <SectionHeading eyebrow={content.eyebrow} title={content.headline} align="center" />

      <Stagger className="mt-14 flex flex-wrap justify-center gap-4" step={0.06}>
        {items.map((q, i) => (
          <StaggerItem
            key={`${q.name}-${i}`}
            as="figure"
            className={`w-full max-w-[340px] rounded-3xl border border-line p-6 shadow-[var(--shadow-card)] transition-transform duration-300 hover:rotate-0 sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.7rem)] ${TONES[i % TONES.length]} ${TILTS[i % TILTS.length]}`}
          >
            <blockquote className="font-display text-[19px] font-medium leading-snug tracking-tight text-ink">
              “{q.quote}”
            </blockquote>
            <figcaption className="mt-4 text-[12.5px] text-ink-4">{q.name}</figcaption>
          </StaggerItem>
        ))}
      </Stagger>

      {limit && (
        <Reveal delay={0.2} className="mt-10 text-center">
          <p className="text-[15px] text-ink-3">{content.footnote}</p>
        </Reveal>
      )}
    </Section>
  );
}
