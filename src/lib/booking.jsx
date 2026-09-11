import { Suspense, createContext, lazy, useCallback, useContext, useMemo, useRef, useState } from 'react';

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

  const open = useCallback((prefill = null) => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setState({ open: true, prefill: prefill && typeof prefill === 'object' && !('nativeEvent' in prefill) ? prefill : null, mounted: true });
  }, []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  const value = useMemo(() => open, [open]);

  return (
    <BookingContext.Provider value={value}>
      {children}
      {state.mounted && (
        <Suspense fallback={null}>
          <BookingDialog open={state.open} onClose={close} prefill={state.prefill} openerRef={openerRef} />
        </Suspense>
      )}
    </BookingContext.Provider>
  );
}
