import { useMemo, useState } from 'react';
import { Button, MoreLink, Pill, Section, SectionHeading, sectionPad } from '../components/primitives';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { useSiteContent } from '../lib/queries/siteContent';

function availabilityLabel(days) {
  if (days <= 1) return 'Available tomorrow';
  return `Available in ${days} days`;
}

export default function Therapists({ onBook, limit, teaser = false, withHeading = true }) {
  const content = useSiteContent('therapists');
  const servicesContent = useSiteContent('services');
  const [filter, setFilter] = useState('all');

  const therapists = useMemo(
    () => (Array.isArray(content.items) ? content.items : []).map((t) => ({
      ...t,
      focus: Array.isArray(t.focus) ? t.focus : [],
      formats: Array.isArray(t.formats) ? t.formats : [],
      languages: Array.isArray(t.languages) ? t.languages : [],
      services: Array.isArray(t.services) ? t.services : [],
      hue: Array.isArray(t.hue) && t.hue.length ? t.hue : [357, 45],
    })),
    [content.items],
  );
  const filters = useMemo(() => {
    const services = Array.isArray(servicesContent.items) ? servicesContent.items : [];
    return [{ id: 'all', label: 'Everyone' }, ...services.map((s) => ({ id: s.id, label: String(s.name ?? '').split(' ')[0] }))];
  }, [servicesContent.items]);

  const shown = useMemo(() => {
    const list = filter === 'all' ? therapists : therapists.filter((t) => t.services.includes(filter));
    return limit ? list.slice(0, limit) : list;
  }, [filter, therapists, limit]);

  return (
    <Section id="therapists" className={teaser ? 'py-20 sm:py-24' : sectionPad(withHeading)}>
      {withHeading && (
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <SectionHeading eyebrow={content.eyebrow} title={content.headline} lead={teaser ? null : content.lead} />
        </div>
      )}

      {/* ToggleGroup gives the filter roving focus + arrow-key navigation. */}
      {!teaser && <ToggleGroup
        spacing={2}
        type="single"
        value={filter}
        onValueChange={(v) => v && setFilter(v)}
        aria-label="Filter therapists by speciality"
        className="mt-8 flex w-full flex-wrap justify-start gap-2"
      >
        {filters.map((f) => (
          <ToggleGroupItem
            key={f.id}
            value={f.id}
            aria-label={f.label}
            className={`min-w-0 rounded-full border px-4 py-2 text-[13px] transition-colors duration-200 data-[state=on]:bg-ink data-[state=on]:text-white ${
              filter === f.id
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-surface text-ink-3 hover:border-line-2 hover:bg-surface hover:text-ink'
            }`}
          >
            {f.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>}

      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${withHeading ? 'mt-8' : ''}`}>
        {shown.map((t) => (
          <article
            key={t.id}
            className="flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
          >
            <div className="flex items-start gap-4">
              <Avatar name={t.name} hue={t.hue} size="lg" />
              <div className="min-w-0 pt-1">
                <h3 className="truncate font-display text-[21px] leading-tight tracking-tight text-ink">{t.name}</h3>
                <p className="mt-1 text-[13px] text-ink-3">{t.credentials}</p>
                <p className="mt-0.5 text-[12px] text-ink-4">
                  {t.pronouns} · {t.years} yrs
                </p>
              </div>
            </div>

            <p className="mt-5 flex-1 text-[14.5px] leading-relaxed text-ink-3">{t.bio}</p>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {t.focus.map((f) => (
                <Pill key={f}>{f}</Pill>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-4">
              <span className="flex items-center gap-1.5">
                <Icon name="video" size={13} />
                {t.formats.join(' · ')}
              </span>
              {t.languages.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Icon name="globe" size={13} />
                  {t.languages.join(', ')}
                </span>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              <span className="flex items-center gap-2 text-[13px] text-ink">
                <span className="size-1.5 rounded-full bg-amber-500" />
                {availabilityLabel(Number(t.nextAvailable) || 1)}
              </span>
              <Button size="sm" variant="outline" icon="arrow" onClick={() => onBook?.({ therapist: t.id })}>
                Book
              </Button>
            </div>
          </article>
        ))}
      </div>

      {teaser && (
        <div className="mt-10 flex justify-center">
          <MoreLink to="/therapists">{content.home_cta}</MoreLink>
        </div>
      )}

      {shown.length === 0 && (
        <p className="mt-8 text-[15px] text-ink-3">
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
