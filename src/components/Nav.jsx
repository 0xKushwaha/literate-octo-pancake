import { useEffect, useMemo, useState } from 'react';
import { Button } from './primitives';
import Icon from './Icon';
import { telHref, useBrand, useSiteContent } from '../lib/queries/siteContent';
import { onSectionsChanged, sectionExists } from '../lib/sections';

/**
 * Links in the order the sections appear on the page, top to bottom. Labels
 * are editable in the admin (section "nav"). "Resources" only renders when
 * there is at least one featured video or published article, so that link is
 * shown only while the section is actually in the document.
 */
const ALL_LINKS = [
  { id: 'services', labelKey: 'services_label', optional: false },
  { id: 'approach', labelKey: 'approach_label', optional: false },
  { id: 'therapists', labelKey: 'therapists_label', optional: false },
  { id: 'breathing', labelKey: 'breathing_label', optional: false },
  { id: 'resources', labelKey: 'resources_label', optional: true },
  { id: 'pricing', labelKey: 'pricing_label', optional: false },
  { id: 'faq', labelKey: 'faq_label', optional: false },
];

function usePresentSections() {
  const [present, setPresent] = useState(() => new Set(ALL_LINKS.filter((l) => !l.optional).map((l) => l.id)));
  useEffect(() => {
    const check = () => {
      setPresent((prev) => {
        const next = new Set(ALL_LINKS.filter((l) => !l.optional || sectionExists(l.id)).map((l) => l.id));
        if (next.size === prev.size && [...next].every((id) => prev.has(id))) return prev;
        return next;
      });
    };
    check();
    const off = onSectionsChanged(check);
    const t = setTimeout(check, 1500);
    return () => { off(); clearTimeout(t); };
  }, []);
  return present;
}

export default function Nav({ onBook }) {
  const brand = useBrand();
  const navContent = useSiteContent('nav');
  const present = usePresentSections();
  const links = useMemo(
    () => ALL_LINKS.filter((l) => present.has(l.id)).map((l) => ({
      href: `#${l.id}`,
      id: l.id,
      label: navContent[l.labelKey] || l.id,
    })),
    [present, navContent],
  );
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Highlight the section currently occupying the middle of the viewport.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.2, 0.5] },
    );
    links.forEach((l) => {
      const el = document.getElementById(l.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [links]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <nav
          className={`mx-auto flex h-14 max-w-[1200px] items-center justify-between rounded-full pl-4 pr-2 transition-[background-color,box-shadow,border-color] duration-300 ${
            scrolled
              ? 'border border-line bg-surface/90 shadow-[var(--shadow-card)] backdrop-blur-md'
              : 'border border-transparent'
          }`}
        >
          <a href="#top" className="flex items-center gap-2.5" aria-label={`${brand.name} home`}>
            <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-rose-300 to-amber-500">
              <span className="size-2.5 rounded-full bg-ink" />
            </span>
            <span className="font-display text-[23px] leading-none tracking-tight">{brand.name}</span>
          </a>

          <ul className="hidden items-center gap-0.5 lg:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className={`rounded-full px-3.5 py-2 text-[13.5px] transition-colors duration-200 ${
                    active === l.id ? 'bg-rose-100 text-ink' : 'text-ink-3 hover:bg-surface-2 hover:text-ink'
                  }`}
                  aria-current={active === l.id ? 'location' : undefined}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1.5">
            <a
              href={telHref(brand.phone)}
              className="hidden items-center gap-2 rounded-full px-3 py-2 text-[13.5px] text-ink-2 transition-colors hover:text-ink xl:inline-flex"
            >
              <Icon name="phone" size={15} />
              {brand.phone}
            </a>
            <Button variant="primary" size="sm" icon="arrow" onClick={onBook} className="hidden sm:inline-flex">
              {navContent.book_label}
            </Button>
            <button
              onClick={() => setOpen(true)}
              className="grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06] lg:hidden"
              aria-label="Open menu"
              aria-expanded={open}
            >
              <Icon name="menu" size={20} />
            </button>
          </div>
        </nav>
      </header>

      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-3 top-3 rounded-4xl border border-line bg-surface p-6 shadow-[var(--shadow-float)] animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl tracking-tight">{brand.name}</span>
              <button
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-ink/[0.06] hover:text-ink"
                aria-label="Close menu"
              >
                <Icon name="close" size={19} />
              </button>
            </div>

            <ul className="mt-6 flex flex-col">
              {links.map((l) => (
                <li key={l.href} className="border-b border-line last:border-0">
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-3.5 font-display text-[26px] tracking-tight text-ink"
                  >
                    {l.label}
                    <Icon name="arrowUpRight" size={18} className="text-ink-4" />
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                variant="primary"
                size="lg"
                icon="arrow"
                onClick={() => { setOpen(false); onBook?.(); }}
              >
                {navContent.book_label}
              </Button>
              <a
                href={telHref(brand.phone)}
                className="flex items-center justify-center gap-2 py-2 text-sm text-ink-2"
              >
                <Icon name="phone" size={15} />
                {brand.phone}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
