import { useEffect } from 'react';
import { useBrand } from './queries/siteContent';

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Writes the admin-chosen brand colours onto <html> as CSS variables. Every
 * tint in index.css is mixed from `--accent`, so one field in the admin
 * recolours pills, hovers, backdrops and cards together.
 */
export function useBrandTheme() {
  const brand = useBrand();
  const accent = String(brand.accent_color ?? '').trim();
  const button = String(brand.button_color ?? '').trim();
  useEffect(() => {
    const root = document.documentElement;
    if (HEX.test(accent)) root.style.setProperty('--accent', accent);
    if (HEX.test(button)) root.style.setProperty('--button', button);
  }, [accent, button]);
}
