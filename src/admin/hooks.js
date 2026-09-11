import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Warns before losing unsaved edits — both on browser navigation (reload, close,
 * back) and on in-app route changes, which `beforeunload` does not see at all.
 *
 * The in-app half is the one that actually bites: clicking "Blog" in the
 * sidebar mid-article never touches the browser's unload path, so without the
 * blocker the work is simply gone.
 */
export function useUnsavedChanges(isDirty) {
  // The blocker reads this rather than the `isDirty` it closed over, because a
  // save updates state and navigates in the same tick: a closure would still be
  // holding the pre-save value and would prompt on the navigation we asked for.
  const dirtyRef = useRef(isDirty);
  useEffect(() => { dirtyRef.current = isDirty; }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      // Browsers ignore custom text now and show their own wording; assigning
      // returnValue is still what triggers the prompt at all.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        dirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
      [],
    ),
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const leave = window.confirm('You have unsaved changes. Leave this page and lose them?');
    if (leave) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  /**
   * Call immediately before a navigation you are performing ON PURPOSE after a
   * successful save. Without it the guard fires on the redirect back to the
   * list, which reads as the save having failed.
   */
  return useCallback(() => { dirtyRef.current = false; }, []);
}

/**
 * Cmd/Ctrl+S saves, the way every editor the user already has open behaves.
 * Without this the browser opens its "save this page" dialog, which is both
 * useless here and a good way to lose a draft.
 */
export function useSaveShortcut(onSave, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSave, enabled]);
}

/** Pressing Escape runs `onEscape` — for closing an inline panel or form. */
export function useEscape(onEscape, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e) => { if (e.key === 'Escape') onEscape(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onEscape, enabled]);
}

/**
 * Strips the punctuation that separates what someone reads from what is
 * stored. The site shows "14,200+" because the number is formatted for
 * display; the stored value is 14200, so a literal search for what is on
 * screen would find nothing.
 */
const loosen = (s) => String(s).toLowerCase().replace(/[\s,.\-_/+%$'"“”’]/g, '');

/**
 * Client-side search across the given fields. Every admin list is small enough
 * (tens to low hundreds of rows) that filtering in memory beats a round trip,
 * and it stays responsive while typing.
 *
 * Two passes: an exact substring match, and — only if that finds nothing — a
 * punctuation-insensitive one, so searching for text copied off the site still
 * lands on the field that produces it.
 */
export function useSearch(rows, fields) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    const haystack = (row) => fields
      .map((f) => {
        const v = row[f];
        if (v == null) return '';
        return Array.isArray(v) ? v.join(' ') : String(v);
      })
      .join(' ');

    const exact = rows.filter((row) => haystack(row).toLowerCase().includes(q));
    if (exact.length) return exact;

    const loose = loosen(q);
    if (!loose) return exact;
    return rows.filter((row) => loosen(haystack(row)).includes(loose));
  }, [rows, fields, query]);

  return { query, setQuery, filtered };
}

/**
 * Column sorting with a stable comparator.
 *
 * `undefined` and `null` always sort last regardless of direction — a row with
 * no category should not jump to the top just because you reversed the order.
 */
export function useSort(rows, initialKey = null, initialDir = 'asc') {
  const [sort, setSort] = useState({ key: initialKey, dir: initialDir });

  const toggle = useCallback((key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }, []);

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const aEmpty = av == null || av === '';
      const bEmpty = bv == null || bv === '';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      if (typeof av === 'boolean' || typeof bv === 'boolean') {
        return (Number(bv) - Number(av)) * factor;
      }
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      // Dates arrive as ISO strings, which sort correctly as text anyway;
      // localeCompare with numeric handles "Item 2" before "Item 10".
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * factor;
    });
  }, [rows, sort]);

  return { sort, toggle, sorted };
}

/**
 * One place for the load → data / empty / error lifecycle every list page runs.
 * Returns `reload` so a save or delete can refresh without duplicating the
 * effect, and tracks `error` separately from "no rows", which the pages used to
 * conflate into the same grey "Loading…" box.
 */
export function useList(loader, deps = []) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.resolve()
      .then(loader)
      .then((data) => {
        if (!active) return;
        setRows(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        console.error('[lumen admin] list load failed', err);
        setError(err?.message || 'Could not load this list.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { rows, setRows, loading, error, reload };
}
