import { Section, SectionHeading, Stagger, StaggerItem } from '../components/primitives';
import Icon from '../components/Icon';
import { useSiteContent } from '../lib/queries/siteContent';

export default function Testimonials() {
  const content = useSiteContent('testimonials');
  const testimonials = Array.isArray(content.items) ? content.items : [];
  if (testimonials.length === 0) return null;

  return (
    <div className="bg-surface-2/60">
      <Section id="testimonials" className="py-24 sm:py-32">
        <SectionHeading eyebrow={content.eyebrow} title={content.headline} align="center" />

        <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" step={0.06}>
          {testimonials.slice(0, 6).map((t, i) => (
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
