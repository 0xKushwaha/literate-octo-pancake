import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Button, EASE, Pill, Section, SectionHeading } from '../components/primitives';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { useSiteContent } from '../lib/queries/siteContent';

function availabilityLabel(days) {
  if (days <= 1) return 'Available tomorrow';
  if (days <= 3) return `Available in ${days} days`;
  return `Available in ${days} days`;
}

/** Snaps a therapist's hue to the palette, matching Avatar's own mapping. */
function paletteFor(h) {
  const n = (((Number(h) || 0) % 360) + 360) % 360;
  if (n >= 340 || n < 15) return '#FFB0B5';
  if (n < 38) return '#F9DCC0';
  return '#FFBF00';
}

export default function Therapists({ onBook }) {
  const content = useSiteContent('therapists');
  const servicesContent = useSiteContent('services');
  const [filter, setFilter] = useState('all');

  const therapists = useMemo(
    () => (Array.isArray(content.items) ? content.items : []).map((t) => ({
      ...t,
      focus: Array.isArray(t.focus) ? t.focus : [],
      formats: Array.isArray(t.formats) ? t.formats : [],
      services: Array.isArray(t.services) ? t.services : [],
      hue: Array.isArray(t.hue) && t.hue.length ? t.hue : [357, 45],
    })),
    [content.items],
  );
  const filters = useMemo(() => {
    const services = Array.isArray(servicesContent.items) ? servicesContent.items : [];
    return [{ id: 'all', label: 'Everyone' }, ...services.map((s) => ({ id: s.id, label: String(s.name ?? '').split(' ')[0] }))];
  }, [servicesContent.items]);

  const shown = useMemo(
    () => (filter === 'all' ? therapists : therapists.filter((t) => t.services.includes(filter))),
    [filter, therapists],
  );

  return (
    <Section id="therapists" className="py-32 sm:py-44 lg:py-56">
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.headline}
        lead={content.lead}
      />

      {/* ToggleGroup gives the filter roving focus + arrow-key navigation,
          which a row of plain buttons does not. */}
      <ToggleGroup
        spacing={2}
        type="single"
        value={filter}
        onValueChange={(v) => v && setFilter(v)}
        aria-label="Filter therapists by speciality"
        className="mt-12 flex w-full flex-wrap justify-start gap-2"
      >
        {filters.map((f) => (
          <ToggleGroupItem
            key={f.id}
            value={f.id}
            aria-label={f.label}
            className={`relative min-w-0 rounded-full border-0 bg-transparent px-4 py-2 text-[13px] transition-colors duration-300 hover:bg-transparent data-[state=on]:bg-transparent ${
              filter === f.id ? 'text-white' : 'text-ink-3 hover:text-ink'
            }`}
          >
            {filter === f.id && (
              <motion.span
                layoutId="therapist-filter"
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ duration: 0.45, ease: EASE }}
              />
            )}
            <span className="relative">{f.label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <motion.div layout className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((t) => (
            <motion.article
              key={t.id}
              layout
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.55, ease: EASE }}
              className="group relative flex flex-col overflow-hidden rounded-4xl border border-line bg-surface p-7 shadow-[var(--shadow-card)] transition-all duration-500 hover:-translate-y-1.5 hover:border-line-2 hover:shadow-[var(--shadow-float)]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100"
                style={{ background: `color-mix(in oklab, ${paletteFor(t.hue[0])} 55%, transparent)` }}
              />

              <div className="relative flex items-start gap-4">
                <Avatar name={t.name} hue={t.hue} size="lg" />
                <div className="min-w-0 pt-1">
                  <h3 className="truncate font-display text-[22px] leading-tight tracking-tight text-ink">
                    {t.name}
                  </h3>
                  <p className="mt-1 text-[13px] text-ink-3">{t.credentials}</p>
                  <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-4">
                    {t.pronouns} · {t.years} yrs
                  </p>
                </div>
              </div>

              <p className="relative mt-6 flex-1 text-[14.5px] leading-relaxed text-ink-3">{t.bio}</p>

              <div className="relative mt-6 flex flex-wrap gap-1.5">
                {t.focus.map((f) => (
                  <Pill key={f}>{f}</Pill>
                ))}
              </div>

              <div className="relative mt-6 flex items-center gap-4 text-[12.5px] text-ink-4">
                <span className="flex items-center gap-1.5">
                  <Icon name="video" size={13} />
                  {t.formats.join(' · ')}
                </span>
              </div>

              <div className="relative mt-6 flex items-center justify-between border-t border-line pt-5">
                <span className="flex items-center gap-2 text-[13px] text-ink">
                  <span className="size-1.5 rounded-full bg-rose-400 shadow-[0_0_0_3px_rgba(255,198,202,0.22)]" />
                  {availabilityLabel(Number(t.nextAvailable) || 1)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  icon="arrow"
                  onClick={() => onBook?.({ therapist: t.id })}
                >
                  Book
                </Button>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>

      {shown.length === 0 && (
        <p className="mt-10 text-[15px] text-ink-3">
          {content.empty_note}{' '}
          <button onClick={() => onBook?.()} className="text-ink underline underline-offset-4">
            Ask for a match
          </button>
          .
        </p>
      )}
    </Section>
  );
}
