import { Link } from 'react-router-dom';
import { Button, Section } from './primitives';
import Icon from './Icon';
import { telHref, useBrand, useSiteContent } from '../lib/queries/siteContent';

const staticColumns = [
  {
    titleKey: 'col1_title',
    links: [
      { label: 'Our services', to: '/services' },
      { label: 'How it works', to: '/how-it-works' },
      { label: 'Our therapists', to: '/therapists' },
      { label: 'Pricing & insurance', to: '/pricing' },
    ],
  },
  {
    titleKey: 'col2_title',
    links: [
      { label: 'Videos & articles', to: '/resources' },
      { label: 'Breathing exercises', to: '/breathe' },
      { label: 'Blog', to: '/blog' },
      { label: 'Questions', to: '/how-it-works#faq' },
    ],
  },
  {
    titleKey: 'col3_title',
    links: [
      { label: 'Privacy policy', key: 'privacy_url' },
      { label: 'Terms of service', key: 'terms_url' },
      { label: 'Accessibility', key: 'accessibility_url' },
    ],
  },
];

export default function Footer({ onBook }) {
  const brand = useBrand();
  const footerContent = useSiteContent('footer');
  const ui = useSiteContent('ui');
  const columns = staticColumns.map((col) => ({
    ...col,
    title: footerContent[col.titleKey],
    links: col.links.map((l) => (l.key ? { label: l.label, href: footerContent[l.key] || '#' } : l)),
  }));

  return (
    <footer className="relative border-t border-line bg-bg">
      {/* crisis banner — the one thing that must never be hard to find */}
      <div className="border-b border-line bg-amber-500">
        <Section className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-4 text-center">
          <span className="text-[13.5px] text-ink">{ui.crisis_prefix}</span>
          <span className="text-[13.5px] text-ink-2">{brand.crisis_line}</span>
        </Section>
      </div>

      <Section className="py-20">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-brand-500">
                <span className="size-3 rounded-full bg-amber-500" />
              </span>
              <span className="font-display text-[25px] font-semibold leading-none tracking-tight">
                {brand.name}
              </span>
            </Link>
            <p className="mt-6 max-w-[34ch] text-[15px] leading-relaxed text-ink-3">
              {brand.tagline} {footerContent.blurb}
            </p>

            <div className="mt-8 flex flex-col gap-3 text-[14px] text-ink-3">
              <a
                href={telHref(brand.phone)}
                className="flex items-center gap-2.5 transition-colors hover:text-ink"
              >
                <Icon name="phone" size={15} className="text-ink-4" />
                {brand.phone}
              </a>
              <a
                href={`mailto:${brand.email}`}
                className="flex items-center gap-2.5 transition-colors hover:text-ink"
              >
                <Icon name="message" size={15} className="text-ink-4" />
                {brand.email}
              </a>
              <span className="flex items-start gap-2.5">
                <Icon name="pin" size={15} className="mt-0.5 shrink-0 text-ink-4" />
                {brand.address}
              </span>
            </div>

            <Button className="mt-8" variant="secondary" icon="arrow" onClick={() => onBook?.()}>
              {footerContent.book_label}
            </Button>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="eyebrow">{col.title}</h3>
                <ul className="mt-5 flex flex-col gap-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.to ? (
                        <Link to={l.to} className="text-[14.5px] text-ink-3 transition-colors duration-200 hover:text-ink">
                          {l.label}
                        </Link>
                      ) : (
                        <a href={l.href} className="text-[14.5px] text-ink-3 transition-colors duration-200 hover:text-ink">
                          {l.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-ink-4">
            © {new Date().getFullYear()} {brand.name} {footerContent.copyright_suffix}
          </p>
          <p className="max-w-xl text-[12px] leading-relaxed text-ink-4">
            {footerContent.disclaimer}
          </p>
        </div>
      </Section>
    </footer>
  );
}
