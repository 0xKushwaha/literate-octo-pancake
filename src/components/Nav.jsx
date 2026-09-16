import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Button } from './primitives';
import Icon from './Icon';
import { telHref, useBrand, useSiteContent } from '../lib/queries/siteContent';
import { useScrollValue } from '../motion/ScrollStory';
import { useCommunity, useFeatures, usePrimaryCta } from '../lib/features';

/**
 * Top navigation, in the order the site is meant to be read.
 *
 * Resources sits second — the slot Therapists used to have. That is the whole
 * of the change the practice asked for at the top of the page: what someone
 * can read or watch for nothing is now the second thing offered, rather than
 * the fourth, behind the team and in front of the cost. Therapists and Pricing
 * are switches now (Site content → Show & hide) and drop out of this list
 * entirely when they are off, rather than being greyed out or left pointing at
 * a page that redirects.
 */
function useMenu(navContent, services, features) {
  return useMemo(() => {
    const care = services.map((s) => ({ label: s.name, to: `/services#${s.id}` }));
    return [
      {
        id: 'services',
        label: navContent.services_label,
        to: '/services',
        items: [...care, { label: navContent.services_all_label, to: '/services', all: true }],
      },
      {
        id: 'resources',
        label: navContent.resources_label,
        to: '/resources',
        items: [
          { label: navContent.videos_label, to: '/resources#videos' },
          { label: navContent.blog_label, to: '/blog' },
          { label: navContent.breathing_label, to: '/breathe' },
        ],
      },
      {
        id: 'approach',
        label: navContent.approach_label,
        to: '/how-it-works',
        items: [
          { label: navContent.approach_label, to: '/how-it-works' },
          { label: navContent.why_label, to: '/how-it-works#why' },
          { label: navContent.faq_label, to: '/how-it-works#faq' },
        ],
      },
      ...(features.therapists
        ? [{ id: 'therapists', label: navContent.therapists_label, to: '/therapists' }]
        : []),
      ...(features.pricing ? [{ id: 'pricing', label: navContent.pricing_label, to: '/pricing' }] : []),
    ];
  }, [navContent, services, features.therapists, features.pricing]);
}

function isActive(item, pathname) {
  const path = item.to.split('#')[0];
  if (pathname === path || pathname.startsWith(path + '/')) return true;
  return (item.items ?? []).some((i) => {
    const p = i.to.split('#')[0];
    return pathname === p || pathname.startsWith(p + '/');
  });
}

function Dropdown({ item, open, setOpen, badge }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const enter = () => { clearTimeout(timer.current); setOpen(item.id); };
  const leave = () => { timer.current = setTimeout(() => setOpen((o) => (o === item.id ? null : o)), 140); };
  const isOpen = open === item.id;

  return (
    <li ref={ref} className="relative" onPointerEnter={enter} onPointerLeave={leave}>
      {badge && <Badge text={badge} />}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setOpen(isOpen ? null : item.id)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(item.id); ref.current?.querySelector('a')?.focus(); } }}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors duration-200 ${
          isOpen || item.active ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
        }`}
      >
        {item.label}
        <Icon name="chevron" size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div role="menu" className="menu-panel absolute left-1/2 top-full z-50 mt-2 min-w-[220px] -translate-x-1/2 rounded-3xl border border-line bg-surface p-2 shadow-[var(--shadow-float)]">
          {item.items.map((sub) => (
            <Link
              key={sub.to + sub.label}
              to={sub.to}
              role="menuitem"
              onClick={() => setOpen(null)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setOpen(null); ref.current?.querySelector('button')?.focus(); }
                if (e.key === 'ArrowDown') { e.preventDefault(); e.currentTarget.nextElementSibling?.focus(); }
                if (e.key === 'ArrowUp') { e.preventDefault(); (e.currentTarget.previousElementSibling ?? ref.current?.querySelector('button'))?.focus(); }
              }}
              className={`block rounded-2xl px-4 py-2.5 text-center text-[14.5px] transition-colors hover:bg-surface-2 hover:text-ink ${
                sub.all ? 'mt-1 border-t border-line pt-3 font-medium text-ink' : 'text-ink-2'
              }`}
            >
              {sub.label}
            </Link>
          ))}
        </div>
      )}
    </li>
  );
}

function Badge({ text }) {
  return (
    <span className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-2 py-px text-[10.5px] font-semibold text-ink">
      {text}
    </span>
  );
}

/** The bar gains its hairline and frosted ground once the page has moved. */
const pastTop = (m) => m.y > 16;

export default function Nav() {
  const brand = useBrand();
  const navContent = useSiteContent('nav');
  const servicesContent = useSiteContent('services');
  const services = Array.isArray(servicesContent.items) ? servicesContent.items : [];
  const features = useFeatures();
  const community = useCommunity();
  // One button in the bar, and what it does depends on what the practice has
  // switched on: the booking form, or the Discord invite.
  const cta = usePrimaryCta(navContent.book_label, { communityLabel: community.nav_label });
  const { pathname } = useLocation();
  const menu = useMenu(navContent, services, features).map((m) => ({ ...m, active: isActive(m, pathname) }));
  const badgeItem = String(navContent.badge_item ?? '').trim();
  const badgeText = String(navContent.badge_text ?? '').trim();

  // Fed by the one shared scroll driver. The selector returns a boolean, so
  // the nav re-renders on the frame the threshold is crossed and on no other.
  const scrolled = useScrollValue(pastTop);
  const [open, setOpen] = useState(null);
  const [drawer, setDrawer] = useState(false);

  // Close everything on navigation, Escape, or a click outside the bar.
  useEffect(() => { setOpen(null); setDrawer(false); }, [pathname]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(null); setDrawer(false); } };
    const onClick = (e) => { if (!(e.target instanceof Element) || !e.target.closest('header')) setOpen(null); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onClick);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onClick); };
  }, []);
  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawer]);

  return (
    <>
      <header className={`sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300 ${scrolled ? 'border-b border-line bg-bg/90 shadow-[0_1px_0_rgba(0,0,0,0.02)] backdrop-blur-md' : 'border-b border-transparent bg-bg'}`}>
        <nav className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between gap-6 px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label={`${brand.name} home`}>
            <img src="/logo/logo.svg" alt={brand.name} className="h-12 w-auto mix-blend-multiply" />
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {menu.map((item) =>
              item.items ? (
                <Dropdown key={item.id} item={item} open={open} setOpen={setOpen} badge={badgeItem === item.id ? badgeText : ''} />
              ) : (
                <li key={item.id} className="relative">
                  {badgeItem === item.id && badgeText && <Badge text={badgeText} />}
                  <NavLink
                    to={item.to}
                    className={`block rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors duration-200 ${
                      item.active ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ),
            )}
          </ul>

          <div className="flex items-center gap-2">
            <a href={telHref(brand.phone)} className="hidden items-center gap-2 px-2 text-[13.5px] text-ink-2 hover:text-ink xl:inline-flex">
              <Icon name="phone" size={15} />
              {brand.phone}
            </a>
            {cta && (
              <Button variant="primary" size="md" {...cta.props} className="hidden sm:inline-flex">
                {cta.label}
              </Button>
            )}
            <button
              onClick={() => setDrawer(true)}
              className="grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06] lg:hidden"
              aria-label="Open menu"
              aria-expanded={drawer}
            >
              <Icon name="menu" size={20} />
            </button>
          </div>
        </nav>
      </header>

      {drawer && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/25 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute inset-x-3 top-3 max-h-[calc(100svh-1.5rem)] overflow-y-auto rounded-4xl border border-line bg-surface p-5 shadow-[var(--shadow-float)] animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between">
              <span className="font-display text-[22px] font-semibold tracking-tight">{brand.name}</span>
              <button onClick={() => setDrawer(false)} className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-ink/[0.06] hover:text-ink" aria-label="Close menu">
                <Icon name="close" size={19} />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-1">
              {menu.map((item) => (
                <div key={item.id} className="border-b border-line py-2 last:border-0">
                  <Link to={item.to} className="flex items-center justify-between py-2 font-display text-[22px] font-medium tracking-tight text-ink">
                    {item.label}
                    <Icon name="arrowUpRight" size={17} className="text-ink-4" />
                  </Link>
                  {item.items && (
                    <div className="flex flex-wrap gap-1.5 pb-2">
                      {item.items.map((sub) => (
                        <Link key={sub.to + sub.label} to={sub.to} className="rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-2 hover:bg-surface-2">
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {cta && (
                <Button
                  variant="primary"
                  size="lg"
                  icon="arrow"
                  {...cta.props}
                  onClick={(e) => { setDrawer(false); cta.props.onClick?.(e); }}
                >
                  {cta.label}
                </Button>
              )}
              <a href={telHref(brand.phone)} className="flex items-center justify-center gap-2 py-1 text-sm text-ink-2">
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
