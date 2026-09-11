import { Button, Pill, Reveal, Section, SectionHeading } from '../components/primitives';
import Icon from '../components/Icon';
import { useSiteContent } from '../lib/queries/siteContent';

export default function Pricing({ onBook }) {
  const content = useSiteContent('pricing');
  // Plans are a list field ("pricing.plans"); the older "<id>_blurb" keys are
  // still applied on top so earlier edits survive.
  const plans = (Array.isArray(content.plans) ? content.plans : []).map((p) => ({
    ...p,
    features: Array.isArray(p.features) ? p.features : [],
    blurb: content[`${p.id}_blurb`] ?? p.blurb,
  }));

  return (
    <Section id="pricing" className="py-24 sm:py-32">
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.headline}
        lead={content.lead}
        align="center"
      />

      <div className="mt-14 grid gap-4 lg:mt-20 lg:grid-cols-3">
        {plans.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.1}>
            <div
              className={`relative flex h-full flex-col rounded-4xl p-7 sm:p-8 ${
                p.featured
                  ? 'border border-rose-300 bg-surface shadow-[var(--shadow-float)] lg:-translate-y-3'
                  : 'border border-line bg-surface shadow-[var(--shadow-card)]'
              }`}
            >
              {p.featured && (
                <>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(130%_80%_at_50%_0%,rgba(255,176,181,0.18),transparent_55%)]"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-peach-100 to-transparent"
                  />
                  <div className="absolute -top-3 left-8">
                    <Pill tone="rose">Most chosen</Pill>
                  </div>
                </>
              )}

              <h3 className="relative font-display text-[26px] leading-tight tracking-tight text-ink">
                {p.name}
              </h3>
              <p className="relative mt-2 text-[14.5px] text-ink-3">{p.blurb}</p>

              <div className="relative mt-8 flex items-baseline gap-2">
                <span className="font-display text-[3.25rem] leading-none tracking-tight text-ink">
                  ${p.price}
                </span>
              </div>
              <p className="relative mt-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-4">
                {p.cadence}
              </p>

              <ul className="relative mt-8 flex flex-1 flex-col gap-3.5">
                {p.features.map((f, i) => (
                  <li key={`${f}-${i}`} className="flex items-start gap-3 text-[14.5px] text-ink-2">
                    <Icon
                      name="check"
                      size={14}
                      className={`mt-1 shrink-0 ${p.featured ? 'text-ink' : 'text-ink-4'}`}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="relative mt-9 w-full"
                size="lg"
                variant={p.featured ? 'primary' : 'outline'}
                icon="arrow"
                onClick={() => onBook?.({ plan: p.id })}
              >
                {p.cta}
              </Button>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.2}>
        <p className="mx-auto mt-12 max-w-2xl text-center text-[14px] leading-relaxed text-ink-4">
          {content.footnote}
        </p>
      </Reveal>
    </Section>
  );
}
