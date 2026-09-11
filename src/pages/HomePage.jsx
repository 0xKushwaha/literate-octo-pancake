import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import Nav from '../components/Nav';
import MobileBookBar from '../components/MobileBookBar';
import Footer from '../components/Footer';
import Hero from '../sections/Hero';
import HeardYou from '../sections/HeardYou';
import Services from '../sections/Services';
import Approach from '../sections/Approach';
import Therapists from '../sections/Therapists';
import Breathing from '../sections/Breathing';
import Resources from '../sections/Resources';
import Testimonials from '../sections/Testimonials';
import Pricing from '../sections/Pricing';
import Faq from '../sections/Faq';
import CtaBand from '../sections/CtaBand';

// Loaded on first use, not on page load: the booking form (react-hook-form,
// zod, the animation library) is the single largest piece of client code and
// nobody needs it to read the page.
const BookingDialog = lazy(() => import('../booking/BookingDialog'));
const CommandPalette = lazy(() => import('../components/CommandPalette'));

/**
 * The homepage. Section order here is the page order, and the nav in
 * components/Nav.jsx lists its links in the same order — keep the two in sync.
 *
 * What is deliberately NOT here any more: the WebGL hero scene, Lenis scroll
 * hijacking, a preloader, a custom cursor and a film-grain overlay. Together
 * they shipped ~700 KB of JavaScript and ran a render loop on every frame,
 * which is what made the site feel heavy to scroll. Everything left is HTML,
 * CSS and small event handlers.
 */
export default function HomePage() {
  const [booking, setBooking] = useState({ open: false, prefill: null, mounted: false });
  const [palette, setPalette] = useState(false);

  const openerRef = useRef(null);
  const openBooking = useCallback((prefill = null) => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setBooking({ open: true, prefill, mounted: true });
  }, []);
  const closeBooking = useCallback(() => {
    setBooking((b) => ({ ...b, open: false }));
  }, []);

  // Cmd/Ctrl-K mounts the palette on demand; before that it costs nothing.
  useKeyToMount(setPalette);

  return (
    <div className="relative">
      <a
        href="#services"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[95] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <Nav onBook={openBooking} />

      <main>
        <Hero onBook={openBooking} />
        <HeardYou />
        <Services onBook={openBooking} />
        <Approach />
        <Therapists onBook={openBooking} />
        <Breathing />
        <Resources />
        <Testimonials />
        <Pricing onBook={openBooking} />
        <Faq />
        <CtaBand onBook={openBooking} />
      </main>
      <Footer onBook={openBooking} />

      <MobileBookBar onBook={openBooking} />

      {palette && (
        <Suspense fallback={null}>
          <CommandPalette onBook={openBooking} initialOpen />
        </Suspense>
      )}

      {booking.mounted && (
        <Suspense fallback={null}>
          <BookingDialog
            open={booking.open}
            onClose={closeBooking}
            prefill={booking.prefill}
            openerRef={openerRef}
          />
        </Suspense>
      )}
    </div>
  );
}

/** Listens for Cmd/Ctrl-K until the palette has mounted once; then the palette owns the key. */
function useKeyToMount(setMounted) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key?.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setMounted(true);
        window.removeEventListener('keydown', onKey);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setMounted]);
}
