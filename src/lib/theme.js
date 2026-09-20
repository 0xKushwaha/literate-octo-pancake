import { useCallback, useEffect, useState } from 'react';
import { getSectionContent } from './queries/siteContent';
import { mergeContent } from './contentMerge';
import { defaultsFor } from '../data/contentSchema';
import {
  CACHE_STORAGE_KEY, PALETTE_KEY, PREVIEW_STORAGE_KEY, PREVIEW_TTL_MS,
  cssVarsFor, overridesFromContent, sanitizeOverrides,
} from './palette';

/**
 * Applies the admin's colour palette to the public site.
 *
 * Everything the palette page stores ends up as CSS variables on <html>:
 * the three main colours (--accent, --highlight, --peach) that the rest of
 * index.css is mixed from, plus any individual colour set by hand (a button,
 * the footer, a card). Nothing is written that has not been overridden, so a
 * site with an empty palette is exactly the stylesheet.
 *
 * Three sources, in order of precedence:
 *  1. A live preview from the admin ("Preview on site"), passed through
 *     localStorage so the tab updates while the colours are being dragged.
 *     Only ever seen in the admin's own browser, and it expires.
 *  2. What is saved in site_content (brand.* and theme.palette).
 *  3. Until that arrives, the palette this browser saw last time, so a
 *     recoloured site does not flash the default colours on every load.
 *
 * Values are validated as hex in palette.js before they get here, and set
 * through the CSSOM (style.setProperty), which the CSP allows — it forbids
 * style attributes in markup, not this.
 */

let appliedVars = new Set();

function storageGet(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch { /* private mode, blocked storage: the palette still applies */ }
}

/** Sets the palette's variables on an element, removing any it set before. */
export function applyPalette(overrides, root = document.documentElement) {
  const vars = cssVarsFor(overrides);
  for (const name of appliedVars) if (!(name in vars)) root.style.removeProperty(name);
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  appliedVars = new Set(Object.keys(vars));
}

/** The admin's live preview, if one is open and fresh. */
export function readPreview() {
  const raw = storageGet(PREVIEW_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.at !== 'number' || Date.now() - parsed.at > PREVIEW_TTL_MS) return null;
    return sanitizeOverrides(parsed.overrides);
  } catch {
    return null;
  }
}

export function writePreview(overrides) {
  storageSet(PREVIEW_STORAGE_KEY, overrides ? JSON.stringify({ at: Date.now(), overrides: sanitizeOverrides(overrides) }) : null);
}

function readCache() {
  const raw = storageGet(CACHE_STORAGE_KEY);
  if (!raw) return null;
  try { return sanitizeOverrides(JSON.parse(raw)); } catch { return null; }
}

/** Called once from main.jsx, before the first render. Public pages only. */
export function applyPaletteAtBoot() {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin')) return;
  const start = readPreview() ?? readCache();
  if (start) applyPalette(start);
}

/** Loads the saved palette from site_content. */
export async function loadSavedPalette() {
  const [brandRows, themeRows] = await Promise.all([getSectionContent('brand'), getSectionContent('theme')]);
  const brand = mergeContent(defaultsFor('brand'), brandRows);
  const theme = mergeContent({}, themeRows);
  return overridesFromContent({ brand, palette: theme[PALETTE_KEY.split('.')[1]] ?? '' });
}

/**
 * Keeps <html> in step with the palette. Returns whether an admin preview is
 * showing, and a way to leave it.
 */
export function useBrandTheme() {
  const [saved, setSaved] = useState(null);
  const [preview, setPreview] = useState(() => readPreview());

  useEffect(() => {
    let active = true;
    loadSavedPalette()
      .then((overrides) => { if (active) setSaved(overrides); })
      .catch((err) => {
        // The cached or default colours are already on screen; that is fine.
        console.warn('[lumen] colour palette unavailable', err);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === null || e.key === PREVIEW_STORAGE_KEY) setPreview(readPreview());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (preview) { applyPalette(preview); return; }
    // Saved colours not in yet (or unreachable): stay on what this browser saw
    // last. Also what an ended preview falls back to while offline.
    if (!saved) { applyPalette(readCache() ?? {}); return; }
    applyPalette(saved);
    storageSet(CACHE_STORAGE_KEY, Object.keys(saved).length ? JSON.stringify(saved) : null);
  }, [preview, saved]);

  const exitPreview = useCallback(() => {
    writePreview(null);
    setPreview(null);
  }, []);

  return { previewing: Boolean(preview), exitPreview };
}
