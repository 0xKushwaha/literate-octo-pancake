import { Pill, Section, SectionHeading, Stagger, StaggerItem, TiltCard } from '../components/primitives';
import Icon from '../components/Icon';
import { services as staticServices } from '../data/site';
import { useSiteContent } from '../lib/queries/siteContent';

const accentRing = {
  aqua: 'group-hover:border-aqua-400',
  iris: 'group-hover:border-iris-400',
  violet: 'group-hover:border-violet-400',
  coral: 'group-hover:border-coral-500',
};

const accentText = {
  aqua: 'text-aqua-700',
  iris: 'text-iris-600',
  violet: 'text-violet-600',
  coral: 'text-coral-700',
};

export default function Services({ onBook }) {
  // Merge admin-editable blurbs over static defaults
  const blurbs = useSiteContent('services', Object.fromEntries(
    staticServices.map((s) => [`${s.id}_blurb`, s.blurb]),
  ));
  const services = staticServices.map((s) => ({
    ...s,
    blurb: blurbs[`${s.id}_blurb`] ?? s.blurb,
  }));

  return (
    <Section id="services" className="py-32 sm:py-44 lg:py-56">
      <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
        <SectionHeading
          eyebrow="What we treat"
          title="Care built around the thing you actually came for."
        />
        <p className="max-w-sm text-[15px] leading-relaxed text-ink-3 lg:pb-3">
          Every clinician here specialises. You will not be handed to whoever happened to have a
          Tuesday free.
        </p>
      </div>

      <Stagger className="mt-20 grid gap-4 sm:grid-cols-2 lg:mt-28 lg:grid-cols-3" step={0.07}>
        {services.map((s) => (
          <StaggerItem key={s.id}>
            <TiltCard className="h-full [transform-style:preserve-3d]" max={4}>
              <button
                type="button"
                onClick={() => onBook?.({ service: s.id })}
                className={`group relative flex h-full w-full flex-col overflow-hidden rounded-4xl border border-line bg-surface p-7 text-left shadow-[var(--shadow-card)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[var(--shadow-float)] sm:p-8 ${accentRing[s.accent]}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`grid size-11 place-items-center rounded-2xl border border-line bg-surface ${accentText[s.accent]}`}
                  >
                    <Icon name={s.icon} size={20} />
                  </span>
                  <span className="grid size-8 place-items-center rounded-full border border-line text-ink-4 transition-all duration-500 group-hover:border-line-2 group-hover:text-ink">
                    <Icon name="arrowUpRight" size={14} />
                  </span>
                </div>

                <h3 className="mt-7 font-display text-[26px] leading-tight tracking-tight text-ink">
                  {s.name}
                </h3>
                <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-ink-3">{s.blurb}</p>

                <div className="mt-7 flex flex-wrap gap-1.5">
                  {s.modalities.map((m) => (
                    <Pill key={m} tone={s.accent}>
                      {m}
                    </Pill>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-4">
                    <Icon name="clock" size={13} />
                    {s.duration}
                  </span>
                  <span className="text-[15px] text-ink-2">
                    <span className="text-ink-4">from </span>${s.price}
                  </span>
                </div>
              </button>
            </TiltCard>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}
