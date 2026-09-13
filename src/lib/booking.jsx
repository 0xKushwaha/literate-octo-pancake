import { Suspense, createContext, lazy, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { isFeatureOn } from './featureFlag';
import { useSiteContent } from './queries/siteContent';

// Loaded on first use, not on page load: the booking form (react-hook-form,
// zod, the animation library) is the single largest piece of client code and
// nobody needs it to read the page.
const BookingDialog = lazy(() => import('../booking/BookingDialog'));

const BookingContext = createContext(() => {});

/** `const openBooking = useBooking(); openBooking({ service: 'couples' })` */
export function useBooking() {
  return useContext(BookingContext);
}

export function BookingProvider({ children }) {
  const [state, setState] = useState({ open: false, prefill: null, mounted: false });
  const openerRef = useRef(null);
  // The last line of defence for the booking switch. Every button that opens
  // the form is gated already, but a stale link, a keyboard shortcut or a
  // component added later should not be able to summon a form the practice
  // has taken down — and with it off, the dialog's chunk is never fetched.
  const enabled = isFeatureOn(useSiteContent('features').booking);

  const open = useCallback((prefill = null) => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setState({ open: true, prefill: prefill && typeof prefill === 'object' && !('nativeEvent' in prefill) ? prefill : null, mounted: true });
  }, []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  const value = useMemo(() => open, [open]);

  return (
    <BookingContext.Provider value={value}>
      {children}
      {enabled && state.mounted && (
        <Suspense fallback={null}>
          <BookingDialog open={state.open} onClose={close} prefill={state.prefill} openerRef={openerRef} />
        </Suspense>
      )}
    </BookingContext.Provider>
  );
}
