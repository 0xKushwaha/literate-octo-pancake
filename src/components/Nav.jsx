import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Button, EASE, Magnetic } from './primitives';
import Icon from './Icon';
import { telHref, useBrand, useSiteContent } from '../lib/queries/siteContent';
import { onSectionsChanged, sectionExists } from '../lib/sections';

/**
 * Links in the order the sections appear on the page, top to bottom. Labels
 * are editable in the admin (section "nav"). The blog and video sections only
 * render when they have content, so those links are shown only while the
 * section is actually in the document.
 */
const ALL_LINKS = [
  { id: 'breathing', labelKey: 'breathing_label', optional: false },
  { id: 'services', labelKey: 'services_label', optional: false },
  { id: 'therapists', labelKey: 'therapists_label', optional: false },
  { id: 'resources', labelKey: 'resources_label', optional: true },
  { id: 'blog', labelKey: 'blog_label', optional: true },
  { id: 'pricing', labelKey: 'pricing_label', optional: false },
  { id: 'faq', labelKey: 'faq_label', optional: false },
];

function usePresentSections() {
  const [present, setPresent] = useState(() => new Set());
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
    // Sections mount asynchronously; a couple of delayed checks cover the
    // preloader window before any event fires.
    const t1 = setTimeout(check, 800);
    const t2 = setTimeout(check, 3000);
    return () => { off(); clearTimeout(t1); clearTimeout(t2); };
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
      label: navContent[l.labelKey] || l.id,
    })),
    [present, navContent],
  );
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // highlight the section currently occupying the middle of the viewport
  useEffect(() => {
    const ids = links.map((l) => l.href.slice(1));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(`#${visible.target.id}`);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.25, 0.6] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [links]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, delay: 0.2, ease: EASE }}
        className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 sm:pt-5"
      >
        <nav
          className={`mx-auto flex h-16 max-w-[1400px] items-center justify-between rounded-full pl-5 pr-3 transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            scrolled ? 'glass shadow-[var(--shadow-card)]' : 'border border-transparent'
          }`}
        >
          <a href="#top" className="group flex items-center gap-2.5" aria-label={`${brand.name} home`}>
            <span className="relative grid size-7 place-items-center">
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-300 to-amber-500 opacity-90 blur-[6px] transition-opacity group-hover:opacity-100" />
              <span className="relative size-2.5 rounded-full bg-ink" />
            </span>
            <span className="font-display text-[24px] leading-none tracking-tight">{brand.name}</span>
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className={`relative rounded-full px-4 py-2 text-sm transition-colors duration-300 ${
                    active === l.href ? 'text-ink' : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  {active === l.href && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-surface-3 ring-1 ring-inset ring-black/5"
                      transition={{ duration: 0.5, ease: EASE }}
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <a
              href={telHref(brand.phone)}
              className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm text-ink-2 transition-colors hover:text-ink md:inline-flex"
            >
              <Icon name="phone" size={15} />
              {brand.phone}
            </a>
            <Magnetic strength={0.2} className="hidden sm:block">
              <Button variant="glow" size="sm" icon="arrow" onClick={onBook}>
                {navContent.book_label}
              </Button>
            </Magnetic>
            <button
              onClick={() => setOpen(true)}
              className="grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06] lg:hidden"
              aria-label="Open menu"
            >
              <Icon name="menu" size={20} />
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 bg-bg/85 backdrop-blur-2xl" onClick={() => setOpen(false)} />
            <motion.div
              className="absolute inset-x-3 top-3 overflow-hidden rounded-4xl glass p-6"
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
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

              <ul className="mt-8 flex flex-col">
                {links.map((l, i) => (
                  <motion.li
                    key={l.href}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i + 0.1, duration: 0.5, ease: EASE }}
                    className="border-b border-line last:border-0"
                  >
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between py-4 font-display text-3xl tracking-tight text-ink"
                    >
                      {l.label}
                      <Icon name="arrowUpRight" size={20} className="text-ink-4" />
                    </a>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3">
                <Button
                  variant="glow"
                  size="lg"
                  icon="arrow"
                  onClick={() => {
                    setOpen(false);
                    onBook?.();
                  }}
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
