import { MoreLink, Section, SectionHeading, Stagger, StaggerItem, sectionPad } from '../components/primitives';
import { useSiteContent } from '../lib/queries/siteContent';
import Icon from '../components/Icon';

const STEP_ICONS = ['message', 'shuffle', 'calendar', 'refresh'];

/** How it works: four steps in a row. `teaser` adds the link to the full page. */
export default function Approach({ teaser = false, withHeading = true }) {
  const content = useSiteContent('approach');
  const steps = Array.isArray(content.steps) ? content.steps : [];

  return (
    <div className={teaser ? 'bg-surface-2/60' : ''}>
      <Section id="approach" className={teaser ? 'py-20 sm:py-24' : sectionPad(withHeading)}>
        {withHeading && (
          <SectionHeading eyebrow={content.eyebrow} title={content.headline} lead={content.lead} align="center" />
        )}

        <Stagger as="ol" className={`relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${withHeading ? 'mt-12' : ''}`} step={0.08}>
          {steps.map((item, i) => (
            <StaggerItem key={`${item.step}-${i}`} as="li" className="relative flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-2xl bg-brand-100 text-ink">
                  <Icon name={STEP_ICONS[i % STEP_ICONS.length]} size={20} />
                </span>
                <span className="text-[12px] font-semibold tracking-[0.14em] text-ink-4">{item.step}</span>
              </div>
              <h3 className="mt-6 font-display text-[21px] leading-tight tracking-tight text-ink">{item.title}</h3>
              <p className="mt-2.5 flex-1 text-[14.5px] leading-relaxed text-ink-3">{item.body}</p>
              {item.detail && (
                <p className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[12px] text-ink-2">
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

        {teaser && (
          <div className="mt-10 flex justify-center">
            <MoreLink to="/how-it-works">{content.home_cta}</MoreLink>
          </div>
        )}
      </Section>
    </div>
  );
}

/** Why Lumen: the differentiator cards. Lives on the How it works page. */
export function Why() {
  const why = useSiteContent('why');
  const cards = Array.isArray(why.items) ? why.items : [];
  if (cards.length === 0) return null;
  return (
    <div className="bg-surface-2/60">
      <Section id="why" className="py-16 sm:py-24">
        <SectionHeading eyebrow={why.eyebrow} title={why.headline} align="center" />
        {/* Six columns so a five-card set ends in a row of two wide cards
            instead of one card and a hole. */}
        <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6" step={0.06}>
          {cards.map((c, i) => {
            const lastTwo = cards.length % 3 === 2 && i >= cards.length - 2;
            return (
              <StaggerItem
                key={`${c.title}-${i}`}
                className={`rounded-3xl border border-line bg-surface p-6 ${lastTwo ? 'lg:col-span-3' : 'lg:col-span-2'}`}
              >
                <span className="grid size-10 place-items-center rounded-full bg-brand-100 text-ink">
                  <Icon name={c.icon} size={18} />
                </span>
                <h3 className="mt-5 font-sans text-[16px] font-semibold tracking-tight text-ink">{c.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">{c.body}</p>
              </StaggerItem>
            );
          })}
        </Stagger>
      </Section>
    </div>
  );
}
