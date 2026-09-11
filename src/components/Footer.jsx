import { Button, Section } from './primitives';
import Icon from './Icon';
import { brand as staticBrand } from '../data/site';
import { useSiteContent } from '../lib/queries/siteContent';

const columns = [
  {
    title: 'Practice',
    links: [
      { label: 'Our services', href: '#services' },
      { label: 'Our therapists', href: '#therapists' },
      { label: 'How it works', href: '#approach' },
      { label: 'Breathing exercises', href: '#breathing' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog', href: '#blog' },
      { label: 'Video resources', href: '#resources' },
      { label: 'Pricing & insurance', href: '#pricing' },
      { label: 'Questions', href: '#faq' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy policy', href: '#' },
      { label: 'Terms of service', href: '#' },
      { label: 'Accessibility', href: '#' },
    ],
  },
];

export default function Footer({ onBook }) {
  const brandContent = useSiteContent('brand', {
    phone: staticBrand.phone,
    email: staticBrand.email,
    address: staticBrand.address,
    tagline: staticBrand.tagline,
  });
  const footerContent = useSiteContent('footer', {
    disclaimer: `This site is a design demonstration. ${staticBrand.name} is a fictional practice — nothing here is medical advice.`,
  });
  const brand = { ...staticBrand, ...brandContent };

  return (
    <footer className="relative border-t border-line bg-bg">
      {/* crisis banner — the one thing that must never be hard to find */}
      <div className="border-b border-line bg-amber-500">
        <Section className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-4 text-center">
          <span className="text-[13.5px] text-ink">In immediate crisis?</span>
          <span className="text-[13.5px] text-ink-2">
            Call or text <strong className="font-medium text-ink">988</strong> — Suicide &amp;
            Crisis Lifeline, 24/7. If someone is in danger right now, call 911.
          </span>
        </Section>
      </div>

      <Section className="py-24">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
          <div>
            <a href="#top" className="flex items-center gap-2.5">
              <span className="relative grid size-7 place-items-center">
                <span className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-300 to-amber-500 opacity-90 blur-[6px]" />
                <span className="relative size-2.5 rounded-full bg-ink" />
              </span>
              <span className="font-display text-[26px] leading-none tracking-tight">
                {brand.name}
              </span>
            </a>
            <p className="mt-6 max-w-[34ch] text-[15px] leading-relaxed text-ink-3">
              {brand.tagline} A modern practice for people who have been meaning to do this for a
              while.
            </p>

            <div className="mt-8 flex flex-col gap-3 text-[14px] text-ink-3">
              <a
                href={`tel:${brand.phone.replace(/[^\d+]/g, '')}`}
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
            © {new Date().getFullYear()} {brand.name} Therapy, PC. All rights reserved.
          </p>
          <p className="max-w-xl text-[12px] leading-relaxed text-ink-4">
            {footerContent.disclaimer}
          </p>
        </div>
      </Section>
    </footer>
  );
}
