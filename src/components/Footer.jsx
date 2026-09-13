import { Link } from 'react-router-dom';
import { Button, Section } from './primitives';
import Icon from './Icon';
import { telHref, useBrand, useSiteContent } from '../lib/queries/siteContent';
import { useCommunity, useFeatures, usePrimaryCta } from '../lib/features';

/**
 * `feature` names a switch in Site content → Show & hide: the link is dropped
 * when that part of the site is off, so the footer can never be the one place
 * still advertising a page that redirects.
 *
 * The legal column takes both its labels and its addresses from the admin.
 * HIPAA joins it here — a practice that touches protected health information
 * has to publish a notice of privacy practices, and the footer is where
 * everyone looks for it.
 */
const staticColumns = [
  {
    titleKey: 'col1_title',
    links: [
      { label: 'Our services', to: '/services' },
      { label: 'How it works', to: '/how-it-works' },
      { label: 'Our therapists', to: '/therapists', feature: 'therapists' },
      { label: 'Pricing & insurance', to: '/pricing', feature: 'pricing' },
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
      { labelKey: 'privacy_label', urlKey: 'privacy_url' },
      { labelKey: 'terms_label', urlKey: 'terms_url' },
      { labelKey: 'hipaa_label', urlKey: 'hipaa_url' },
      { labelKey: 'accessibility_label', urlKey: 'accessibility_url' },
    ],
  },
];

export default function Footer() {
  const brand = useBrand();
  const footerContent = useSiteContent('footer');
  const credentials = Array.isArray(brand.credentials) ? brand.credentials : [];
  const ui = useSiteContent('ui');
  const features = useFeatures();
  const community = useCommunity();
  const cta = usePrimaryCta(footerContent.book_label, { communityLabel: community.cta_label });
  const columns = staticColumns.map((col) => ({
    ...col,
    title: footerContent[col.titleKey],
    links: col.links
      .filter((l) => !l.feature || features[l.feature])
      .map((l) =>
        l.urlKey
          ? { label: footerContent[l.labelKey], href: footerContent[l.urlKey] || '#' }
          : l,
      ),
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

        {/* The credential badges. They used to sit under the hero buttons and
            were moved here: they are reassurance, not a headline, and the
            place someone looks for "is this practice legitimate" is the foot
            of the page, next to the legal column. Being in the footer also
            puts them on every page rather than only the homepage. */}
        {credentials.length > 0 && (
          <ul className="mt-16 flex flex-wrap items-center gap-2 border-t border-line pt-8">
            {credentials.slice(0, 6).map((c) => (
              <li
                key={c}
                className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] text-ink-2"
              >
                <Icon name="check" size={12} className="text-brand-500" />
                {c}
              </li>
            ))}
          </ul>
        )}

        {/* The one action in the footer, and it comes after the badges: the
            reassurance is what earns the click, so it reads in that order
            rather than asking first and justifying afterwards. */}
        {cta && (
          <div className={credentials.length > 0 ? 'mt-7' : 'mt-16 border-t border-line pt-8'}>
            <Button variant="secondary" icon="arrow" {...cta.props}>
              {cta.label}
            </Button>
          </div>
        )}

        <div className={`flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between ${credentials.length > 0 || cta ? 'mt-10' : 'mt-16'}`}>
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
