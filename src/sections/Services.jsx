import { Link } from 'react-router-dom';
import { MoreLink, Pill, Section, SectionHeading, Stagger, StaggerItem, sectionPad } from '../components/primitives';
import Icon from '../components/Icon';
import { useFeatures } from '../lib/features';
import { useSiteContent } from '../lib/queries/siteContent';

/**
 * The card colours.
 *
 * Borrowed from the "we heard you" quotes, which were the one section on the
 * page anyone pointed at and liked — the reason being that a row of identical
 * white cards is a table, and a row of cards in different colours is a set of
 * things. Same family, same rule: a fill and ink on it, never a gradient.
 *
 * White is in the rotation rather than absent from it. Three tinted cards in a
 * row is a paint chart; the white one in the middle is what makes the other
 * two read as deliberate. The icon tile flips to white on a tinted card and to
 * the tint on the white one, so the same shape is legible either way, and each
 * tone carries its own hairline because ink-at-10% disappears on sand.
 */
const CARD_TONES = [
  { card: 'bg-tone-1', edge: 'border-ink/[0.08]', tile: 'bg-tone-2 text-accent-strong' },
  { card: 'bg-tone-2', edge: 'border-line', tile: 'bg-tone-1 text-accent-strong' },
  { card: 'bg-tone-3', edge: 'border-ink/[0.10]', tile: 'bg-tone-2 text-accent-strong' },
  { card: 'bg-tone-4', edge: 'border-ink/[0.10]', tile: 'bg-tone-2 text-accent-strong' },
];

/**
 * Service cards. On the homepage (`limit`) it is a teaser with a link to the
 * full page; on /services it is the whole list with a heading of its own.
 */
export default function Services({ onBook, limit, teaser = false, withHeading = true }) {
  const content = useSiteContent('services');
  const features = useFeatures();
  // The card list itself is editable ("services.items"); the older per-card
  // "<id>_blurb" keys are still honoured so nothing saved before this change
  // is lost.
  const services = (Array.isArray(content.items) ? content.items : []).map((s) => ({
    ...s,
    modalities: Array.isArray(s.modalities) ? s.modalities : [],
    blurb: content[`${s.id}_blurb`] ?? s.blurb,
  }));

  const shown = limit ? services.slice(0, limit) : services;

  /**
   * What a card does when you click it.
   *
   * With booking on, the card opens the form pre-filled with that service —
   * the shortest path there has ever been from "this is my problem" to a
   * first appointment. With booking off the homepage card goes to the same
   * service on /services, and the card on /services itself has nowhere left
   * to go, so it stops pretending: no arrow, no lift, no cursor.
   */
  const cardFor = (s) => {
    if (features.booking) {
      return { Tag: 'button', props: { type: 'button', onClick: () => onBook?.({ service: s.id }) }, live: true };
    }
    if (teaser) return { Tag: Link, props: { to: `/services#${s.id}` }, live: true };
    return { Tag: 'div', props: {}, live: false };
  };

  return (
    <div className={teaser ? '' : 'bg-bg-2'}>
      <Section id="services" className={teaser ? 'py-20 sm:py-24' : sectionPad(withHeading)}>
        {withHeading && (
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <SectionHeading eyebrow={content.eyebrow} title={content.headline} />
            <p className="max-w-sm text-[15px] leading-relaxed text-ink-3 lg:pb-2">{content.aside}</p>
          </div>
        )}

        <Stagger className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${withHeading ? 'mt-12' : ''}`} step={0.06}>
          {shown.map((s, i) => {
            const card = cardFor(s);
            const tone = CARD_TONES[i % CARD_TONES.length];
            return (
            <StaggerItem key={s.id} id={teaser ? undefined : s.id} className="h-full scroll-mt-28">
              <card.Tag
                {...card.props}
                className={`group flex h-full w-full flex-col rounded-3xl border p-6 text-left shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-300 sm:p-7 ${tone.card} ${tone.edge} ${
                  card.live ? 'hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className={`grid size-11 place-items-center rounded-2xl ${tone.tile}`}>
                    <Icon name={s.icon} size={20} />
                  </span>
                  {card.live && (
                    <span className="grid size-8 place-items-center rounded-full border border-ink/15 text-ink-4 transition-colors duration-300 group-hover:border-brand-500 group-hover:bg-brand-500 group-hover:text-on-brand">
                      <Icon name="arrowUpRight" size={14} />
                    </span>
                  )}
                </div>

                <h3 className="mt-6 font-display text-[23px] leading-tight tracking-tight text-ink">{s.name}</h3>
                <p className="mt-2.5 flex-1 text-[14.5px] leading-relaxed text-ink-3">{s.blurb}</p>

                <div className="mt-6 flex flex-wrap gap-1.5">
                  {s.modalities.map((m) => (
                    <Pill key={m} tone="quiet">{m}</Pill>
                  ))}
                </div>

                {/* The homepage teaser shows the length of a session and not
                    its price. Someone still deciding whether therapy is for
                    them does not need a number in the third block of their
                    first visit; /services carries it. */}
                <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4">
                  <span className="flex items-center gap-1.5 text-[12.5px] text-ink-4">
                    <Icon name="clock" size={13} />
                    {s.duration}
                  </span>
                  {teaser ? (
                    <span className="text-[13px] font-medium text-accent-strong">{content.card_cta}</span>
                  ) : (
                    <span className="text-[14.5px] text-ink-2">
                      <span className="text-ink-4">{content.price_prefix} </span>${s.price}
                    </span>
                  )}
                </div>
              </card.Tag>
            </StaggerItem>
            );
          })}
        </Stagger>

        {teaser && (
          <div className="mt-10 flex justify-center">
            <MoreLink to="/services">{content.home_cta}</MoreLink>
          </div>
        )}
      </Section>
    </div>
  );
}
