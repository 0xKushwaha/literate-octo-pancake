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

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
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
