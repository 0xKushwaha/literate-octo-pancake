import { HOME_SECTIONS } from '../data/contentSchema';

/**
 * The ids of the homepage sections to render, in order, from the admin's list.
 *
 * Forgiving on purpose, because the list is stored JSON that can outlive the
 * code: an id this version does not know is skipped, one missing from the
 * stored list (a section added after the list was saved) is slotted in where
 * the default order puts it, and anything that is not a list falls back to the
 * default. `show: false` hides a section; anything else shows it.
 */
export function homeSectionOrder(stored) {
  const known = HOME_SECTIONS.map((s) => s.id);
  const list = Array.isArray(stored) ? stored : HOME_SECTIONS;
  const seen = new Set();
  const order = [];
  for (const item of list) {
    const id = item && typeof item === 'object' ? item.id : null;
    if (!known.includes(id) || seen.has(id)) continue;
    seen.add(id);
    order.push({ id, show: item.show !== false });
  }
  known.forEach((id, defaultIndex) => {
    if (seen.has(id)) return;
    // Put it after whichever default neighbour above it is already placed.
    const before = known.slice(0, defaultIndex).reverse().find((k) => seen.has(k));
    const at = before ? order.findIndex((o) => o.id === before) + 1 : 0;
    order.splice(at, 0, { id, show: HOME_SECTIONS[defaultIndex].show !== false });
    seen.add(id);
  });
  return order.filter((o) => o.show).map((o) => o.id);
}
