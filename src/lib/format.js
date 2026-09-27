/**
 * Fills {name} placeholders in an admin-written sentence ("Free in {days}
 * days"). A placeholder with no value is left as typed, so a typo shows up on
 * the page as "{dayz}" where someone will notice it, rather than vanishing.
 */
export function fillTemplate(text, vars = {}) {
  return String(text ?? '').replace(/\{(\w+)\}/g, (match, name) => (vars[name] ?? match));
}
