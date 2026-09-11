import { Pill, Section, SectionHeading, Stagger, StaggerItem } from '../components/primitives';
import Icon from '../components/Icon';
import { useSiteContent } from '../lib/queries/siteContent';

const ICON_BG = {
  rose: 'bg-rose-100',
  blush: 'bg-blush-100',
  peach: 'bg-peach-100',
  amber: 'bg-amber-500',
};

export default function Services({ onBook }) {
  const content = useSiteContent('services');
  // The card list itself is editable ("services.items"); the older per-card
  // "<id>_blurb" keys are still honoured so nothing saved before this change
  // is lost.
  const services = (Array.isArray(content.items) ? content.items : []).map((s) => ({
    ...s,
    modalities: Array.isArray(s.modalities) ? s.modalities : [],
    blurb: content[`${s.id}_blurb`] ?? s.blurb,
  }));

  return (
    <div className="bg-surface-2/60">
      <Section id="services" className="py-24 sm:py-32">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading eyebrow={content.eyebrow} title={content.headline} />
          <p className="max-w-sm text-[15px] leading-relaxed text-ink-3 lg:pb-2">{content.aside}</p>
        </div>

        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" step={0.06}>
          {services.map((s) => (
            <StaggerItem key={s.id} className="h-full">
              <button
                type="button"
                onClick={() => onBook?.({ service: s.id })}
                className="group flex h-full w-full flex-col rounded-3xl border border-line bg-surface p-6 text-left shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-line-2 hover:shadow-[var(--shadow-lift)] sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className={`grid size-11 place-items-center rounded-2xl text-ink ${ICON_BG[s.accent] ?? ICON_BG.rose}`}>
                    <Icon name={s.icon} size={20} />
                  </span>
                  <span className="grid size-8 place-items-center rounded-full border border-line text-ink-4 transition-colors duration-300 group-hover:border-ink group-hover:bg-ink group-hover:text-white">
                    <Icon name="arrowUpRight" size={14} />
                  </span>
                </div>

                <h3 className="mt-6 font-display text-[24px] leading-tight tracking-tight text-ink">{s.name}</h3>
                <p className="mt-2.5 flex-1 text-[14.5px] leading-relaxed text-ink-3">{s.blurb}</p>

                <div className="mt-6 flex flex-wrap gap-1.5">
                  {s.modalities.map((m) => (
                    <Pill key={m}>{m}</Pill>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                  <span className="flex items-center gap-1.5 text-[12.5px] text-ink-4">
                    <Icon name="clock" size={13} />
                    {s.duration}
                  </span>
                  <span className="text-[14.5px] text-ink-2">
                    <span className="text-ink-4">from </span>${s.price}
                  </span>
                </div>
              </button>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>
    </div>
  );
}
