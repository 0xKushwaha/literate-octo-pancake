import { Suspense, lazy, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import MobileBookBar from '../components/MobileBookBar';
import { BookingProvider, useBooking } from '../lib/booking';
import { useBrandTheme } from '../lib/theme';

const CommandPalette = lazy(() => import('../components/CommandPalette'));

/**
 * Shared chrome for every public page: nav, footer, mobile book bar, the
 * booking dialog (via context) and the Cmd-K palette. Pages render in the
 * Outlet; a route change scrolls to the top (or to the hash) and fades the
 * new page in, so moving around feels like moving, not like reloading.
 */
export default function Layout() {
  return (
    <BookingProvider>
      <Shell />
    </BookingProvider>
  );
}

function Shell() {
  const openBooking = useBooking();
  const { pathname, hash } = useLocation();
  const [palette, setPalette] = useState(false);
  useBrandTheme();

  /**
   * Scroll handling for route changes.
   *
   * The hash case keeps trying for a short window instead of scrolling once.
   * On a cold load of /how-it-works#faq the target exists immediately, but the
   * browser performs its own scroll restoration when `load` fires — after the
   * header photo decodes — and puts the page back at the top. So this polls
   * until the target is actually in place (or the window expires), and gives
   * up the moment the visitor scrolls themselves.
   */
  useEffect(() => {
    const id = hash ? hash.slice(1) : '';
    if (!id) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    const deadline = performance.now() + 2000;
    let raf = 0;
    let userScrolled = false;
    const onWheel = () => { userScrolled = true; };

    const tick = () => {
      if (userScrolled) return;
      const el = document.getElementById(id);
      if (el) {
        const top = el.getBoundingClientRect().top;
        // Anything within a nav's height of the top counts as arrived.
        if (Math.abs(top) < 120) return;
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
      if (performance.now() < deadline) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener('wheel', onWheel, { passive: true, once: true });
    window.addEventListener('touchmove', onWheel, { passive: true, once: true });
    window.addEventListener('keydown', onWheel, { once: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchmove', onWheel);
      window.removeEventListener('keydown', onWheel);
    };
  }, [pathname, hash]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key?.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPalette(true);
        window.removeEventListener('keydown', onKey);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative min-h-[100svh]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[95] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <Toaster position="bottom-center" />
      <Nav onBook={openBooking} />
      <main id="main" key={pathname} className="page-enter">
        <Outlet />
      </main>
      <Footer onBook={openBooking} />
      <MobileBookBar onBook={openBooking} />
      {palette && (
        <Suspense fallback={null}>
          <CommandPalette onBook={openBooking} initialOpen />
        </Suspense>
      )}
    </div>
  );
}
