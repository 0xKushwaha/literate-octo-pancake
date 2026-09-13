import { useEffect } from 'react';
import { useBrand } from './queries/siteContent';

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Writes the admin-chosen brand colours onto <html> as CSS variables.
 *
 * Three variables, and everything else in index.css is mixed from them:
 * `--accent` is the brand colour (buttons, links, rings, every wash),
 * `--highlight` is the loud one (crisis banner, dark-band button, exhale),
 * and `--peach` is the warm third colour used in a handful of small places.
 * One field in the admin therefore recolours the whole site at once.
 */
export function useBrandTheme() {
  const brand = useBrand();
  const accent = String(brand.brand_color ?? '').trim();
  const highlight = String(brand.highlight_color ?? '').trim();
  const peach = String(brand.peach_color ?? '').trim();
  useEffect(() => {
    const root = document.documentElement;
    if (HEX.test(accent)) root.style.setProperty('--accent', accent);
    if (HEX.test(highlight)) root.style.setProperty('--highlight', highlight);
    if (HEX.test(peach)) root.style.setProperty('--peach', peach);
  }, [accent, highlight, peach]);
}
