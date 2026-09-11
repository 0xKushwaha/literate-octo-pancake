import { useEffect } from 'react';
import { useBrand } from './queries/siteContent';

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Writes the admin-chosen brand colours onto <html> as CSS variables.
 *
 * Two variables, and everything else in index.css is mixed from them:
 * `--accent` is the brand colour (buttons, links, rings, every wash), and
 * `--highlight` is the loud one (crisis banner, dark-band button, exhale).
 * One field in the admin therefore recolours the whole site at once.
 */
export function useBrandTheme() {
  const brand = useBrand();
  const accent = String(brand.brand_color ?? '').trim();
  const highlight = String(brand.highlight_color ?? '').trim();
  useEffect(() => {
    const root = document.documentElement;
    if (HEX.test(accent)) root.style.setProperty('--accent', accent);
    if (HEX.test(highlight)) root.style.setProperty('--highlight', highlight);
  }, [accent, highlight]);
}
