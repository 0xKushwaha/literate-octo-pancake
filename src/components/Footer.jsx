import { Button, Section } from './primitives';
import Icon from './Icon';
import { telHref, useBrand, useSiteContent } from '../lib/queries/siteContent';

const staticColumns = [
  {
    title: 'Practice',
    links: [
      { label: 'Our services', href: '#services' },
      { label: 'How it works', href: '#approach' },
      { label: 'Our therapists', href: '#therapists' },
      { label: 'Breathing exercises', href: '#breathing' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'Videos & articles', href: '#resources' },
      { label: 'Pricing & insurance', href: '#pricing' },
      { label: 'Questions', href: '#faq' },
    ],
  },
  {
    title: 'Legal',
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
  const columns = staticColumns.map((col) => ({
    ...col,
    links: col.links.map((l) => (l.key ? { label: l.label, href: footerContent[l.key] || '#' } : l)),
  }));

  return (
    <footer className="relative border-t border-line bg-bg">
      {/* crisis banner — the one thing that must never be hard to find */}
      <div className="border-b border-line bg-amber-500">
        <Section className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-4 text-center">
          <span className="text-[13.5px] text-ink">In immediate crisis?</span>
          <span className="text-[13.5px] text-ink-2">{brand.crisis_line}</span>
        </Section>
      </div>

      <Section className="py-20">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
          <div>
            <a href="#top" className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-rose-300 to-amber-500">
                <span className="size-2.5 rounded-full bg-ink" />
              </span>
              <span className="font-display text-[26px] leading-none tracking-tight">
                {brand.name}
              </span>
            </a>
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

            <Button className="mt-9" variant="outline" icon="arrow" onClick={() => onBook?.()}>
              Book a session
            </Button>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="eyebrow">{col.title}</h3>
                <ul className="mt-5 flex flex-col gap-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-[14.5px] text-ink-3 transition-colors duration-300 hover:text-ink">
                        {l.label}
                      </a>
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
