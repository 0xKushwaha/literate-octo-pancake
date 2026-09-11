import { useEffect, useState } from 'react';
import { Button } from './primitives';
import Icon from './Icon';
import { telHref, useBrand, useSiteContent } from '../lib/queries/siteContent';

/**
 * Booking is the point of the site; on a phone the nav CTA is hidden behind a
 * menu, so surface it permanently once the hero has scrolled past.
 */
export default function MobileBookBar({ onBook }) {
  const brand = useBrand();
  const booking = useSiteContent('booking');
  const [show, setShow] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; compute(); });
    };
    const compute = () => {
      const past = window.scrollY > window.innerHeight * 0.9;
      const atBottom =
        window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 260;
      setShow(past && !atBottom);
    };
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-3 bottom-3 z-40 transition-[transform,opacity] duration-300 ease-out sm:hidden ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-24 opacity-0'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-hidden={!show}
    >
          <div className="flex items-center gap-3 rounded-full border border-line bg-surface/95 p-2 pl-5 shadow-[var(--shadow-float)] backdrop-blur-md">
            <a
              href={telHref(brand.phone)}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-ink-2"
              aria-label={`Call ${brand.name}`}
            >
              <Icon name="phone" size={17} />
            </a>
            <Button variant="primary" size="md" icon="arrow" className="flex-1" onClick={onBook}>
              {booking.mobile_bar_label}
            </Button>
          </div>
    </div>
  );
}
