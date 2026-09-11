import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Button, EASE } from './primitives';
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
    const onScroll = () => {
      const past = window.scrollY > window.innerHeight * 0.9;
      const atBottom =
        window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 260;
      setShow(past && !atBottom);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="fixed inset-x-3 bottom-3 z-40 sm:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="glass flex items-center gap-3 rounded-full p-2 pl-5 shadow-[var(--shadow-float)]">
            <a
              href={telHref(brand.phone)}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-ink-2"
              aria-label={`Call ${brand.name}`}
            >
              <Icon name="phone" size={17} />
            </a>
            <Button variant="glow" size="md" icon="arrow" className="flex-1" onClick={onBook}>
              {booking.mobile_bar_label}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
