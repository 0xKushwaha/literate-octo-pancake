// HomePage — the original App.jsx content, extracted verbatim for the router.
// This keeps all existing animations, 3D scene, Lenis, and booking dialog intact.
import { Suspense, lazy, useCallback, useRef, useState } from 'react';
import StaticBackdrop from '../components/StaticBackdrop';

const HeroScene = lazy(() => import('../three/HeroScene'));
import Nav from '../components/Nav';
import Cursor from '../components/Cursor';
import Preloader from '../components/Preloader';
import ScrollProgress from '../components/ScrollProgress';
import MobileBookBar from '../components/MobileBookBar';
import CommandPalette from '../components/CommandPalette';
import Footer from '../components/Footer';
import Hero from '../sections/Hero';
import Trust from '../sections/Trust';
import Approach from '../sections/Approach';
import Breathing from '../sections/Breathing';
import Services from '../sections/Services';
import Therapists from '../sections/Therapists';
import YouTubeResources from '../sections/YouTubeResources';
import Testimonials from '../sections/Testimonials';
import Blog from '../sections/Blog';
import Pricing from '../sections/Pricing';
import Faq from '../sections/Faq';
import CtaBand from '../sections/CtaBand';
import BookingDialog from '../booking/BookingDialog';
import useLenis from '../lib/useLenis';
import { useHeroProgressRef, useQualityTier, useScrollProgressRef } from '../lib/hooks';

export default function HomePage() {
  const tier = useQualityTier();
  const heroRef = useHeroProgressRef();
  const scrollRef = useScrollProgressRef();
  const [ready, setReady] = useState(false);
  const [booking, setBooking] = useState({ open: false, prefill: null });

  useLenis(ready);

  const openerRef = useRef(null);
  const openBooking = useCallback((prefill = null) => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setBooking({ open: true, prefill });
  }, []);
  const closeBooking = useCallback(() => {
    setBooking((b) => ({ ...b, open: false }));
  }, []);

  return (
    <div className="grain relative">
      <a
        href="#approach"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[95] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <Preloader onDone={() => setReady(true)} />
      <Cursor />
      <ScrollProgress />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 grid-lines opacity-70" />
        {tier === 'static' ? (
          <StaticBackdrop />
        ) : (
          <Suspense fallback={<StaticBackdrop />}>
            <HeroScene
              tier={tier}
              heroRef={heroRef}
              scrollRef={scrollRef}
              className="!absolute inset-0"
            />
          </Suspense>
        )}
      </div>

      <Nav onBook={openBooking} />

      <main className="relative z-10">
        <Hero onBook={openBooking} />

        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-48 h-48 bg-gradient-to-b from-transparent to-bg"
          />
          <div className="relative bg-bg">
            <Trust />
            <Approach />
            <Breathing />
            <Services onBook={openBooking} />
            <Therapists onBook={openBooking} />
            <YouTubeResources />
            <Testimonials />
            <Blog />
            <Pricing onBook={openBooking} />
            <Faq />
            <CtaBand onBook={openBooking} />
            <Footer onBook={openBooking} />
          </div>
        </div>
      </main>

      <CommandPalette onBook={openBooking} />
      <MobileBookBar onBook={openBooking} />

      <BookingDialog
        open={booking.open}
        onClose={closeBooking}
        prefill={booking.prefill}
        openerRef={openerRef}
      />
    </div>
  );
}
