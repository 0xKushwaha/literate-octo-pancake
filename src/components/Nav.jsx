import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Button, EASE, Magnetic } from './primitives';
import Icon from './Icon';
import { brand } from '../data/site';

const links = [
  { href: '#services', label: 'Services' },
  { href: '#therapists', label: 'Therapists' },
  { href: '#breathing', label: 'Breathe' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
  { href: '#blog', label: 'Blog' },
];

export default function Nav({ onBook }) {
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
  }, []);

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
              href={`tel:${brand.phone.replace(/[^\d+]/g, '')}`}
              className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm text-ink-2 transition-colors hover:text-ink md:inline-flex"
            >
              <Icon name="phone" size={15} />
              {brand.phone}
            </a>
            <Magnetic strength={0.2} className="hidden sm:block">
              <Button variant="glow" size="sm" icon="arrow" onClick={onBook}>
                Book a session
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
                  Book a session
                </Button>
                <a
                  href={`tel:${brand.phone.replace(/[^\d+]/g, '')}`}
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
