import { Section, SectionHeading, Stagger, StaggerItem } from '../components/primitives';
import { useSiteContent } from '../lib/queries/siteContent';
import Icon from '../components/Icon';

const STEP_ICONS = ['message', 'shuffle', 'calendar', 'refresh'];

/** How it works (four steps in a row) followed by the "Why Lumen" cards. */
export default function Approach() {
  const content = useSiteContent('approach');
  const why = useSiteContent('why');
  const steps = Array.isArray(content.steps) ? content.steps : [];
  const cards = Array.isArray(why.items) ? why.items : [];

  return (
    <Section id="approach" className="py-24 sm:py-32">
      <SectionHeading eyebrow={content.eyebrow} title={content.headline} lead={content.lead} align="center" />

      <Stagger as="ol" className="relative mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" step={0.08}>
        {steps.map((item, i) => (
          <StaggerItem key={`${item.step}-${i}`} as="li" className="relative flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-2xl bg-rose-100 text-ink">
                <Icon name={STEP_ICONS[i % STEP_ICONS.length]} size={20} />
              </span>
              <span className="font-mono text-[11px] tracking-[0.2em] text-ink-4">{item.step}</span>
            </div>
            <h3 className="mt-6 font-display text-[22px] leading-tight tracking-tight text-ink">{item.title}</h3>
            <p className="mt-2.5 flex-1 text-[14.5px] leading-relaxed text-ink-3">{item.body}</p>
            {item.detail && (
              <p className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] text-ink-2">
                <Icon name="clock" size={12} />
                {item.detail}
              </p>
            )}
            {i < steps.length - 1 && (
              <span aria-hidden className="absolute -right-3 top-1/2 hidden size-6 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-ink-4 lg:grid">
                <Icon name="arrow" size={12} />
              </span>
            )}
          </StaggerItem>
        ))}
      </Stagger>

      {cards.length > 0 && (
        <div className="mt-24 sm:mt-32">
          <SectionHeading eyebrow={why.eyebrow} title={why.headline} align="center" />
          {/* Six columns so a five-card set ends in a row of two wide cards
              instead of one card and a hole. */}
          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6" step={0.06}>
            {cards.map((c, i) => {
              const lastTwo = cards.length % 3 === 2 && i >= cards.length - 2;
              return (
              <StaggerItem
                key={`${c.title}-${i}`}
                className={`rounded-3xl border border-line p-6 ${lastTwo ? 'lg:col-span-3' : 'lg:col-span-2'} ${i % 3 === 1 ? 'bg-rose-100/70' : i % 3 === 2 ? 'bg-peach-100/60' : 'bg-surface'}`}
              >
                <span className="grid size-10 place-items-center rounded-full border border-line bg-surface text-ink">
                  <Icon name={c.icon} size={18} />
                </span>
                <h3 className="mt-5 text-[16px] font-medium tracking-tight text-ink">{c.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">{c.body}</p>
              </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      )}
    </Section>
  );
}
