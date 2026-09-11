import { Section, SectionHeading } from '../components/primitives';
import Icon from '../components/Icon';
import { useSiteContent } from '../lib/queries/siteContent';

function Card({ t }) {
  return (
    <figure className="w-[340px] shrink-0 rounded-4xl border border-line bg-surface p-7 shadow-[var(--shadow-card)] sm:w-[420px]">
      <div className="flex gap-0.5 text-ink">
        {Array.from({ length: 5 }).map((_, i) => (
          <Icon key={i} name="star" size={13} filled />
        ))}
      </div>
      <blockquote className="mt-5 text-[16px] leading-relaxed text-ink-2">“{t.quote}”</blockquote>
      <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-5">
        <span className="text-[14px] text-ink">{t.name}</span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-4">
          {t.meta}
        </span>
      </figcaption>
    </figure>
  );
}

/** Two rows drifting in opposite directions; paused on hover so quotes are readable. */
function Row({ items, reverse = false, duration = 58 }) {
  const doubled = [...items, ...items];
  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
      <div
        className="flex w-max gap-4 group-hover:[animation-play-state:paused]"
        style={{
          animation: `marquee-x ${duration}s linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {doubled.map((t, i) => (
          <Card key={`${t.name}-${i}`} t={t} />
        ))}
      </div>
    </div>
  );
}

export default function Testimonials() {
  const content = useSiteContent('testimonials');
  const testimonials = Array.isArray(content.items) ? content.items : [];
  if (testimonials.length === 0) return null;
  const half = Math.ceil(testimonials.length / 2);
  return (
    <div id="testimonials" className="relative py-32 sm:py-44 lg:py-56">
      <Section>
        <SectionHeading
          eyebrow={content.eyebrow}
          title={content.headline}
          align="center"
        />
      </Section>

      <div className="mt-16 flex flex-col gap-4">
        <Row items={testimonials.slice(0, half)} duration={72} />
        {testimonials.length > 1 && <Row items={testimonials.slice(half)} reverse duration={88} />}
      </div>
    </div>
  );
}
