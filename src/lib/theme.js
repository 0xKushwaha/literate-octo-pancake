import { useCallback, useEffect, useState } from 'react';
import { getSectionContent } from './queries/siteContent';
import { mergeContent } from './contentMerge';
import { defaultsFor } from '../data/contentSchema';
import {
  CACHE_STORAGE_KEY, PALETTE_KEY, PREVIEW_STORAGE_KEY, PREVIEW_TTL_MS,
  cssVarsFor, overridesFromContent, sanitizeOverrides,
} from './palette';
import {
  TYPE_CACHE_STORAGE_KEY, TYPE_KEY, TYPE_PREVIEW_STORAGE_KEY, buildTypeCss, parseType, sanitizeType,
} from './typography';

/**
 * Applies the admin's design choices — colour palette and fonts — to the
 * public site.
 *
 * Colours end up as CSS variables on <html>: the three main colours
 * (--accent, --highlight, --peach) that the rest of index.css is mixed from,
 * plus any individual colour set by hand. Fonts end up as one small generated
 * stylesheet in a <style id="lumen-type"> element (see typography.js). Nothing
 * is written that has not been changed, so an untouched site is exactly the
 * stylesheet.
 *
 * Three sources, in order of precedence, for each of the two:
 *  1. A live preview from the admin ("Preview on site"), passed through
 *     localStorage so the tab updates while things are being changed. Only
 *     ever seen in the admin's own browser, and it expires.
 *  2. What is saved in site_content (brand.*, theme.palette, theme.type).
 *  3. Until that arrives, what this browser saw last time, so a restyled site
 *     does not flash the defaults on every load.
 *
 * Everything is validated in palette.js / typography.js before it gets here.
 * Colours go through the CSSOM (style.setProperty) and fonts through a
 * <style> element; the CSP forbids style attributes in markup, not either of
 * these (style-src-elem allows inline <style>).
 */

const TYPE_STYLE_ID = 'lumen-type';
let appliedVars = new Set();

function storageGet(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch { /* private mode, blocked storage: the design still applies */ }
}

/** Sets the palette's variables on an element, removing any it set before. */
export function applyPalette(overrides, root = document.documentElement) {
  const vars = cssVarsFor(overrides);
  for (const name of appliedVars) if (!(name in vars)) root.style.removeProperty(name);
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  appliedVars = new Set(Object.keys(vars));
}

/** Writes (or removes) the fonts stylesheet. */
export function applyType(type) {
  const css = buildTypeCss(type, 'html');
  let el = document.getElementById(TYPE_STYLE_ID);
  if (!css) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('style');
    el.id = TYPE_STYLE_ID;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
}

function readFresh(key, sanitize) {
  const raw = storageGet(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.at !== 'number' || Date.now() - parsed.at > PREVIEW_TTL_MS) return null;
    return sanitize(parsed.value ?? parsed.overrides);
  } catch {
    return null;
  }
}
function writeFresh(key, value, sanitize) {
  storageSet(key, value ? JSON.stringify({ at: Date.now(), value: sanitize(value) }) : null);
}
function readCached(key, sanitize) {
  const raw = storageGet(key);
  if (!raw) return null;
  try { return sanitize(JSON.parse(raw)); } catch { return null; }
}

/** The admin's live colour preview, if one is open and fresh. */
export const readPreview = () => readFresh(PREVIEW_STORAGE_KEY, sanitizeOverrides);
export const writePreview = (overrides) => writeFresh(PREVIEW_STORAGE_KEY, overrides, sanitizeOverrides);
/** The admin's live fonts preview. */
export const readTypePreview = () => readFresh(TYPE_PREVIEW_STORAGE_KEY, sanitizeType);
export const writeTypePreview = (type) => writeFresh(TYPE_PREVIEW_STORAGE_KEY, type, sanitizeType);

/** Called once from main.jsx, before the first render. Public pages only. */
export function applyPaletteAtBoot() {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin')) return;
  const palette = readPreview() ?? readCached(CACHE_STORAGE_KEY, sanitizeOverrides);
  if (palette) applyPalette(palette);
  const type = readTypePreview() ?? readCached(TYPE_CACHE_STORAGE_KEY, sanitizeType);
  if (type) applyType(type);
}

/** Loads the saved palette and fonts from site_content. */
export async function loadSavedDesign({ force = false } = {}) {
  // Both reads share one request; `force` on the first refetches it.
  const [brandRows, themeRows] = await Promise.all([getSectionContent('brand', { force }), getSectionContent('theme')]);
  const brand = mergeContent(defaultsFor('brand'), brandRows);
  const theme = mergeContent({}, themeRows);
  return {
    palette: overridesFromContent({ brand, palette: theme[PALETTE_KEY.split('.')[1]] ?? '' }),
    type: parseType(theme[TYPE_KEY.split('.')[1]] ?? ''),
  };
}

/**
 * Keeps the page in step with the saved design. Returns whether an admin
 * preview is showing, and a way to leave it.
 */
export function useBrandTheme() {
  const [saved, setSaved] = useState(null);
  const [preview, setPreview] = useState(() => readPreview());
  const [typePreview, setTypePreview] = useState(() => readTypePreview());

  useEffect(() => {
    let active = true;
    loadSavedDesign()
      .then((design) => { if (active) setSaved(design); })
      .catch((err) => {
        // The cached or default design is already on screen; that is fine.
        console.warn('[lumen] saved colours and fonts unavailable', err);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      const all = e.key === null;
      if (!all && e.key !== PREVIEW_STORAGE_KEY && e.key !== TYPE_PREVIEW_STORAGE_KEY) return;
      const nextPalette = readPreview();
      const nextType = readTypePreview();
      setPreview(nextPalette);
      setTypePreview(nextType);
      // A preview just ended — most likely because it was saved — so fetch
      // the saved design again rather than falling back to what this tab loaded.
      if (!nextPalette || !nextType) loadSavedDesign({ force: true }).then(setSaved).catch(() => {});
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (preview) { applyPalette(preview); return; }
    // Saved colours not in yet (or unreachable): stay on what this browser saw
    // last. Also what an ended preview falls back to while offline.
    if (!saved) { applyPalette(readCached(CACHE_STORAGE_KEY, sanitizeOverrides) ?? {}); return; }
    applyPalette(saved.palette);
    storageSet(CACHE_STORAGE_KEY, Object.keys(saved.palette).length ? JSON.stringify(saved.palette) : null);
  }, [preview, saved]);

  useEffect(() => {
    if (typePreview) { applyType(typePreview); return; }
    if (!saved) { applyType(readCached(TYPE_CACHE_STORAGE_KEY, sanitizeType) ?? {}); return; }
    applyType(saved.type);
    storageSet(TYPE_CACHE_STORAGE_KEY, Object.keys(saved.type).length ? JSON.stringify(saved.type) : null);
  }, [typePreview, saved]);

  // Leaving the public site (for the admin) takes the fonts stylesheet with
  // it: its heading and form rules are written for the site, not the admin.
  useEffect(() => () => applyType({}), []);

  const exitPreview = useCallback(() => {
    writePreview(null);
    writeTypePreview(null);
    setPreview(null);
    setTypePreview(null);
  }, []);

  return { previewing: Boolean(preview || typePreview), exitPreview };
}
