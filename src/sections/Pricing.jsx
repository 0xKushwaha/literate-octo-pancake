import { Button, Pill, Reveal, Section, SectionHeading, sectionPad } from '../components/primitives';
import Icon from '../components/Icon';
import { usePrimaryCta } from '../lib/features';
import { useSiteContent } from '../lib/queries/siteContent';

export default function Pricing({ onBook, withHeading = true }) {
  const content = useSiteContent('pricing');
  // Each plan keeps its own button label while booking is on. With booking
  // off the plans are still worth reading — that is the point of a pricing
  // page — so the cards stay and only the button changes.
  const cta = usePrimaryCta(null);
  // Plans are a list field ("pricing.plans"); the older "<id>_blurb" keys are
  // still applied on top so earlier edits survive.
  const plans = (Array.isArray(content.plans) ? content.plans : []).map((p) => ({
    ...p,
    features: Array.isArray(p.features) ? p.features : [],
    blurb: content[`${p.id}_blurb`] ?? p.blurb,
  }));

  return (
    <Section id="pricing" className={sectionPad(withHeading)}>
      {withHeading && (
        <SectionHeading
          eyebrow={content.eyebrow}
          title={content.headline}
          lead={content.lead}
          align="center"
        />
      )}

      <div className={`grid gap-4 lg:grid-cols-3 ${withHeading ? 'mt-12 lg:mt-16' : ''}`}>
        {plans.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.1}>
            <div
              className={`relative flex h-full flex-col rounded-4xl p-7 sm:p-8 ${
                p.featured
                  ? 'border-2 border-brand-500 bg-brand-50 shadow-[var(--shadow-float)] lg:-translate-y-3'
                  : 'border border-line bg-surface shadow-[var(--shadow-card)]'
              }`}
            >
              {/* The featured plan used to be marked with a radial wash across
                  the top of the card. It is a flat tint and a solid two-pixel
                  border now — one colour per surface, and the difference reads
                  from further away than the wash ever did. */}
              {p.featured && (
                <div className="absolute -top-3 left-8">
                  <Pill tone="amber">{content.featured_badge}</Pill>
                </div>
              )}

              <h3 className="relative font-display text-[24px] leading-tight tracking-tight text-ink">
                {p.name}
              </h3>
              <p className="relative mt-2 text-[14.5px] text-ink-3">{p.blurb}</p>

              <div className="relative mt-8 flex items-baseline gap-2">
                <span className={`font-display text-[3rem] font-medium leading-none tracking-tight ${p.featured ? 'text-accent-strong' : 'text-ink'}`}>
                  ${p.price}
                </span>
              </div>
              <p className="relative mt-2 text-[12px] font-medium uppercase tracking-[0.1em] text-ink-4">
                {p.cadence}
              </p>

              <ul className="relative mt-8 flex flex-1 flex-col gap-3.5">
                {p.features.map((f, i) => (
                  <li key={`${f}-${i}`} className="flex items-start gap-3 text-[14.5px] text-ink-2">
                    <Icon
                      name="check"
                      size={14}
                      className={`mt-1 shrink-0 ${p.featured ? 'text-brand-500' : 'text-ink-4'}`}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              {cta && (
                <Button
                  className="relative mt-9 w-full"
                  size="lg"
                  variant={p.featured ? 'primary' : 'outline'}
                  icon="arrow"
                  {...(cta.mode === 'book' ? { onClick: () => onBook?.({ plan: p.id }) } : cta.props)}
                >
                  {cta.mode === 'book' ? p.cta : cta.label}
                </Button>
              )}
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.2}>
        <p className="mx-auto mt-10 max-w-2xl text-center text-[14px] leading-relaxed text-ink-4">
          {content.footnote}
        </p>
      </Reveal>
    </Section>
  );
}
