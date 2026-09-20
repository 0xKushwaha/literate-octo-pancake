import { Suspense, lazy, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import MobileBookBar from '../components/MobileBookBar';
import { BookingProvider, useBooking } from '../lib/booking';
import { useBrandTheme } from '../lib/theme';
import { useSiteContent } from '../lib/queries/siteContent';

const CommandPalette = lazy(() => import('../components/CommandPalette'));

/** Height of the sticky nav, so an anchored section is not hidden behind it. */
const NAV_OFFSET = 88;

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
  const ui = useSiteContent('ui');
  const { previewing, exitPreview } = useBrandTheme();

  /**
   * Scroll handling for route changes.
   *
   * The hash case keeps trying for a short window instead of scrolling once.
   * On a cold load of /how-it-works#faq the target exists immediately, but the
   * browser performs its own scroll restoration when `load` fires — after the
   * header photo decodes — and puts the page back at the top. So this polls
   * until the target is actually in place (or the window expires), and gives
   * up the moment the visitor scrolls themselves.
   *
   * It sets scrollTop directly rather than calling scrollIntoView: `html` has
   * `scroll-behavior: smooth`, which turns scrollIntoView into an animation
   * that the next poll restarts and the browser's restoration can cancel
   * outright — the reason an anchor landed on some pages and not others.
   */
  useEffect(() => {
    const id = hash ? hash.slice(1) : '';
    if (!id) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    const deadline = performance.now() + 2000;
    let timer = 0;
    let userScrolled = false;
    const onWheel = () => { userScrolled = true; };

    const tick = () => {
      if (userScrolled) return;
      const el = document.getElementById(id);
      if (el) {
        const top = el.getBoundingClientRect().top;
        // Anything within a few pixels of the sticky nav counts as arrived.
        if (Math.abs(top - NAV_OFFSET) < 8) return;
        document.documentElement.scrollTop = Math.max(0, top + window.scrollY - NAV_OFFSET);
      }
      if (performance.now() < deadline) timer = setTimeout(tick, 40);
    };
    // setTimeout rather than requestAnimationFrame: rAF does not run at all
    // while the tab is in the background, so a link opened in a new tab would
    // never get its scroll until the visitor looked at it.
    tick();

    window.addEventListener('wheel', onWheel, { passive: true, once: true });
    window.addEventListener('touchmove', onWheel, { passive: true, once: true });
    window.addEventListener('keydown', onWheel, { once: true });

    return () => {
      clearTimeout(timer);
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
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[95] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:text-on-ink"
      >
        {ui.skip_link}
      </a>
      <Toaster position="bottom-center" />
      <Nav />
      <main id="main" key={pathname} className="page-enter">
        <Outlet />
      </main>
      <Footer />
      <MobileBookBar />
      {previewing && (
        // Only ever seen in the admin's own browser, while "Preview on site"
        // is open on the Colour palette page.
        <div role="status" className="fixed bottom-20 left-3 z-[70] flex items-center gap-3 rounded-full border border-line bg-surface py-2 pl-4 pr-2 text-[13px] text-ink shadow-[var(--shadow-float)] sm:bottom-4 sm:left-4" data-print-hide>
          <span className="size-2 rounded-full bg-brand-500" aria-hidden="true" />
          Previewing unsaved design changes
          <button type="button" onClick={exitPreview} className="rounded-full border border-line-2 px-3 py-1 text-[12.5px] font-medium hover:border-ink">
            Exit preview
          </button>
        </div>
      )}
      {palette && (
        <Suspense fallback={null}>
          <CommandPalette onBook={openBooking} initialOpen />
        </Suspense>
      )}
    </div>
  );
}
