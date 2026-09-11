import { Button, Reveal, Section } from '../components/primitives';
import Icon from '../components/Icon';
import { telHref, useBrand, useSiteContent } from '../lib/queries/siteContent';

export default function CtaBand({ onBook }) {
  const content = useSiteContent('cta');
  const brand = useBrand();
  const reassurances = Array.isArray(content.reassurances) ? content.reassurances : [];

  return (
    <Section className="pb-20 pt-6 sm:pb-28">
      <Reveal className="relative overflow-hidden rounded-[2rem] border border-line bg-surface px-6 py-16 text-center shadow-[var(--shadow-card)] sm:px-14 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(50% 60% at 30% 100%, rgba(255,198,202,0.6), transparent 70%), radial-gradient(45% 55% at 80% 0%, rgba(249,220,192,0.7), transparent 70%)',
          }}
        />
        <div className="relative">
          <h2 className="mx-auto max-w-[20ch] font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[1.06] tracking-[-0.02em]">
            {content.headline} <span className="text-aurora italic">{content.headline_accent}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-[46ch] text-[16.5px] leading-relaxed text-ink-2">{content.body}</p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" size="lg" icon="arrow" onClick={() => onBook?.()}>
              {content.primary}
            </Button>
            <Button variant="ghost" size="lg" as="a" href={telHref(brand.phone)} iconLeft="phone">
              {content.secondary}
            </Button>
          </div>

          <p className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12.5px] text-ink-3">
            {reassurances.map((r, i) => (
              <span key={`${r}-${i}`} className="flex items-center gap-2">
                <Icon name="check" size={12} className="text-ink" />
                {r}
              </span>
            ))}
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
