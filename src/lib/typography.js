/**
 * Fonts and text styles, editable per block in Admin → Fonts & text.
 *
 * A "block" is one kind of text on the site: the hero headline, the buttons,
 * the menu links, card titles, the footer, article text… Each can be given its
 * own font, weight, italic, size, letter spacing, line height and capitals.
 * Anything left on Auto keeps exactly what the stylesheet does today.
 *
 * How it reaches the page: buildTypeCss() turns the stored choices into one
 * small stylesheet, which theme.js puts in a <style> element. Unlayered rules
 * beat Tailwind's layered utilities, so a choice here wins over the classes in
 * the components without touching them. Every value is picked from a fixed
 * list or clamped to a range before it is written, and the selectors come from
 * this file, never from the admin, so nothing typed in the admin can become
 * anything but those properties. (The CSP allows <style> elements; see
 * security.config.js.)
 *
 * Two blocks are special: "Body text" and "Headings" also swap the site's two
 * font variables (--font-sans, --font-display), so every element that uses
 * those fonts follows — the way the brand colour carries every tint.
 */

export const TYPE_KEY = 'theme.type';
export const TYPE_PREVIEW_STORAGE_KEY = 'lumen.type.preview';
export const TYPE_CACHE_STORAGE_KEY = 'lumen.type.cache';

const SANS = 'ui-sans-serif, system-ui, -apple-system, sans-serif';
const SERIF = 'ui-serif, Georgia, serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const bundled = (id, name, family, category, weights, italic = true, note = '') => ({
  id, name, kind: 'bundled', category, weights, italic, note,
  stack: `"${family}", ${category === 'serif' ? SERIF : category === 'mono' ? MONO : SANS}`,
});
const device = (id, name, stack, category, note) => ({
  id, name, kind: 'device', category, weights: [400, 700], italic: true, note, stack,
});

/**
 * Every font the admin can choose. Two kinds, both safe to pick:
 *  - bundled: shipped with the site (self-hosted; a visitor only downloads
 *    one when it is used), so it looks the same on every device.
 *  - device: already on practically every computer and phone. Nothing to
 *    download, but only regular and bold, and the exact shapes vary a little
 *    by device — each has fallbacks that look alike.
 */
export const FONTS = [
  bundled('jakarta', 'Plus Jakarta Sans', 'Plus Jakarta Sans Variable', 'sans', [200, 800], false, 'The site\'s original text font.'),
  bundled('fraunces', 'Fraunces', 'Fraunces Variable', 'serif', [100, 900], true, 'The site\'s original heading font.'),
  bundled('inter', 'Inter', 'Inter Variable', 'sans', [100, 900]),
  bundled('inter-tight', 'Inter Tight', 'Inter Tight Variable', 'sans', [100, 900]),
  bundled('dm-sans', 'DM Sans', 'DM Sans Variable', 'sans', [100, 900]),
  bundled('manrope', 'Manrope', 'Manrope Variable', 'sans', [200, 800], false),
  bundled('nunito', 'Nunito', 'Nunito Variable', 'sans', [200, 900], true, 'Rounded and friendly.'),
  bundled('montserrat', 'Montserrat', 'Montserrat Variable', 'sans', [100, 900]),
  bundled('open-sans', 'Open Sans', 'Open Sans Variable', 'sans', [300, 800]),
  bundled('roboto', 'Roboto', 'Roboto Variable', 'sans', [100, 900]),
  bundled('lora', 'Lora', 'Lora Variable', 'serif', [400, 700]),
  bundled('playfair', 'Playfair Display', 'Playfair Display Variable', 'serif', [400, 900], true, 'High-contrast, for big headlines.'),
  bundled('source-serif', 'Source Serif', 'Source Serif 4 Variable', 'serif', [200, 900]),
  bundled('merriweather', 'Merriweather', 'Merriweather Variable', 'serif', [300, 900], true, 'Sturdy, very readable in long text.'),
  bundled('eb-garamond', 'EB Garamond', 'EB Garamond Variable', 'serif', [400, 800], true, 'Classic book face.'),
  bundled('instrument-serif', 'Instrument Serif', 'Instrument Serif', 'serif', [400, 400], true, 'Display only: one weight.'),
  bundled('jetbrains-mono', 'JetBrains Mono', 'JetBrains Mono Variable', 'mono', [100, 800]),
  device('arial', 'Arial', 'Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif', 'sans', 'On every device.'),
  device('helvetica', 'Helvetica', '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif', 'sans', 'Arial is used where Helvetica is missing (Windows).'),
  device('verdana', 'Verdana', 'Verdana, Geneva, "DejaVu Sans", sans-serif', 'sans', 'Wide and very legible at small sizes.'),
  device('tahoma', 'Tahoma', 'Tahoma, Verdana, Geneva, "DejaVu Sans", sans-serif', 'sans', ''),
  device('trebuchet', 'Trebuchet MS', '"Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", "DejaVu Sans", sans-serif', 'sans', ''),
  device('system', 'Device default', 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', 'sans', 'San Francisco on Apple, Segoe on Windows, Roboto on Android.'),
  device('georgia', 'Georgia', 'Georgia, "Times New Roman", Times, "Liberation Serif", serif', 'serif', 'On every device.'),
  device('times', 'Times New Roman', '"Times New Roman", Times, "Liberation Serif", serif', 'serif', ''),
  device('courier', 'Courier New', '"Courier New", Courier, "Liberation Mono", monospace', 'mono', 'Typewriter style.'),
];
export const FONT_BY_ID = Object.fromEntries(FONTS.map((f) => [f.id, f]));

export const WEIGHTS = [
  [100, 'Hairline'], [200, 'Thin'], [300, 'Light'], [400, 'Regular'], [500, 'Medium'],
  [600, 'Semibold'], [700, 'Bold'], [800, 'Extra bold'], [900, 'Black'],
];
export const CASES = [['none', 'As typed'], ['uppercase', 'CAPITALS'], ['lowercase', 'lowercase'], ['capitalize', 'Each Word']];
export const STYLES = [['normal', 'Upright'], ['italic', 'Italic']];

/** The properties a block can take, with their ranges. */
export const PROPS = {
  font: { label: 'Font' },
  weight: { label: 'Weight' },
  style: { label: 'Style' },
  size: { label: 'Size', min: 9, max: 120, step: 1, unit: 'px' },
  tracking: { label: 'Letter spacing', min: -0.1, max: 0.4, step: 0.005, unit: 'em' },
  leading: { label: 'Line height', min: 0.8, max: 2.4, step: 0.05, unit: '' },
  case: { label: 'Capitals' },
};
const ALL = Object.keys(PROPS);
const NO_SIZE = ALL.filter((p) => p !== 'size');

const b = (id, label, selectors, hint = '', props = ALL, extra = {}) => ({ id, label, selectors, hint, props, ...extra });

/**
 * Every block, grouped the way the page is laid out. `selectors` are what the
 * rule targets; `:scope` means the root (<html> on the site, the preview box
 * in the admin). Marker classes (t-*) were added to the components for this.
 */
export const TYPE_GROUPS = [
  {
    id: 'everywhere',
    title: 'Everywhere',
    blurb: 'The two fonts the whole site is set in. Change these first — every block below that is on Auto follows them.',
    blocks: [
      b('body', 'Body text', [':scope'], 'Paragraphs, menus, buttons, forms — all the text that is not a heading.', NO_SIZE, { fontVar: '--font-sans' }),
      b('headings', 'Headings', [':is(h1, h2, h3, h4)'], 'Every headline, plus the quotes, stats and big numbers set in the heading font.', NO_SIZE, { fontVar: '--font-display' }),
    ],
  },
  {
    id: 'top',
    title: 'Header, menu & buttons',
    blurb: '',
    blocks: [
      b('nav', 'Menu links', ['.t-nav'], 'The links across the top and in the phone menu.'),
      b('brand', 'Practice name', ['.t-brand'], 'The name in the footer and the phone menu.'),
      b('button', 'Buttons', ['.t-button'], 'Every button on the site.'),
      b('pill', 'Tags & pills', ['.t-pill'], 'Small rounded labels: "Taking new clients", therapy types.'),
      b('label', 'Section labels', ['.eyebrow'], 'The small line above a heading, like "WHAT WE TREAT".'),
    ],
  },
  {
    id: 'hero',
    title: 'Homepage hero',
    blurb: 'The first screen of the homepage.',
    blocks: [
      b('hero-title', 'Hero headline', ['.t-hero-title'], '"Therapy for …"'),
      b('hero-word', 'Rotating word', ['.t-hero-word'], 'The highlighted word that changes.'),
      b('hero-text', 'Hero paragraph', ['.t-hero-text']),
      b('stat', 'Stat numbers', ['.t-stat'], '14,200+ and the like.'),
    ],
  },
  {
    id: 'headings',
    title: 'Page & section headings',
    blurb: '',
    blocks: [
      b('page-title', 'Page titles', ['.t-page-title'], 'The big title at the top of Services, How it works, Resources, legal pages.'),
      b('page-lead', 'Page intro text', ['.t-page-lead'], 'The paragraph under a page title.'),
      b('section-title', 'Section headings', ['.t-section-title'], '"Something to take with you.", "Care built around…"'),
      b('section-lead', 'Section intro text', ['.t-section-lead']),
      b('cta-title', 'Closing band headline', ['.t-cta-title'], '"You do not have to wait…" on the dark band.'),
    ],
  },
  {
    id: 'cards',
    title: 'Cards, quotes & questions',
    blurb: '',
    blocks: [
      b('card-title', 'Card titles', ['.t-card-title'], 'Services, steps, articles, videos, breathing exercises.'),
      b('card-text', 'Card text', ['.t-card-text'], 'The short description on a card.'),
      b('quote', 'Quotes', ['.t-quote'], '"We heard you" quotes and client reviews.'),
      b('faq', 'FAQ questions', ['.t-faq']),
      b('breath', 'Breathing player', ['.t-breath'], 'The phase name and the countdown.'),
      b('dialog-title', 'Pop-up titles', ['.t-dialog-title'], 'Headings inside the booking form.'),
      b('field', 'Form fields', ['.t-field'], 'What people type into the email box and forms.'),
    ],
  },
  {
    id: 'bottom',
    title: 'Footer & crisis strip',
    blurb: '',
    blocks: [
      b('footer', 'Footer text', ['.zone-footer'], 'Links, contact details and small print at the foot of every page.'),
      b('footer-heading', 'Footer column headings', ['.zone-footer .eyebrow'], '"PRACTICE", "RESOURCES", "LEGAL".'),
      b('crisis', 'Crisis strip', ['.zone-crisis'], '"In immediate crisis? …"'),
    ],
  },
  {
    id: 'article',
    title: 'Blog articles',
    blurb: 'Inside a published article.',
    blocks: [
      b('article-title', 'Article title', ['.t-article-title']),
      b('article-text', 'Article text', ['.prose-lumen', '.prose-lumen :is(p, li)']),
      b('article-heading', 'Headings in articles', ['.prose-lumen :is(h2, h3)']),
      b('article-quote', 'Quotes in articles', ['.prose-lumen blockquote']),
    ],
  },
];

export const BLOCKS = TYPE_GROUPS.flatMap((g) => g.blocks.map((blk) => ({ ...blk, group: g.id })));
export const BLOCK_BY_ID = Object.fromEntries(BLOCKS.map((blk) => [blk.id, blk]));

/** Ready-made pairings. They set the two "Everywhere" blocks and leave the rest alone. */
export const TYPE_PRESETS = [
  { name: 'Original', body: {}, headings: {} },
  { name: 'Arial everywhere', body: { font: 'arial' }, headings: { font: 'arial', weight: 700, tracking: -0.01 } },
  { name: 'Classic', body: { font: 'arial' }, headings: { font: 'georgia', weight: 400 } },
  { name: 'Modern', body: { font: 'inter' }, headings: { font: 'inter', weight: 600, tracking: -0.025 } },
  { name: 'Editorial', body: { font: 'source-serif' }, headings: { font: 'playfair', weight: 500 } },
  { name: 'Friendly', body: { font: 'nunito' }, headings: { font: 'nunito', weight: 800, tracking: -0.01 } },
  { name: 'Clean', body: { font: 'open-sans' }, headings: { font: 'montserrat', weight: 600, tracking: -0.015 } },
  { name: 'Bookish', body: { font: 'lora' }, headings: { font: 'eb-garamond', weight: 500 } },
];

// ── values ──────────────────────────────────────────────────────────────────

const clampNum = (v, { min, max, step }) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  const c = Math.min(max, Math.max(min, n));
  return Number((Math.round(c / step) * step).toFixed(4));
};

/** One block's settings, with anything unknown or out of range dropped. */
export function sanitizeBlock(input, allowed = ALL) {
  const out = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  if (allowed.includes('font') && FONT_BY_ID[input.font]) out.font = input.font;
  if (allowed.includes('weight') && WEIGHTS.some(([w]) => w === Number(input.weight))) out.weight = Number(input.weight);
  if (allowed.includes('style') && STYLES.some(([s]) => s === input.style)) out.style = input.style;
  if (allowed.includes('case') && CASES.some(([c]) => c === input.case)) out.case = input.case;
  for (const key of ['size', 'tracking', 'leading']) {
    if (!allowed.includes(key) || input[key] === '' || input[key] == null) continue;
    const n = clampNum(input[key], PROPS[key]);
    if (n !== undefined) out[key] = n;
  }
  return out;
}

/** The whole stored object: { blockId: { font, weight, … } }. */
export function sanitizeType(input) {
  const out = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const [id, value] of Object.entries(input)) {
    const blk = BLOCK_BY_ID[id];
    if (!blk) continue;
    const clean = sanitizeBlock(value, blk.props);
    if (Object.keys(clean).length) out[id] = clean;
  }
  return out;
}

export function parseType(text) {
  if (text && typeof text === 'object') return sanitizeType(text);
  try {
    return sanitizeType(JSON.parse(String(text ?? '') || '{}'));
  } catch {
    return {};
  }
}

/**
 * A size in px, made to shrink on small screens the way the site's own
 * headings do: full size at desktop width, never below ~60% on a phone.
 */
export function responsiveSize(px) {
  if (px < 24) return `${px}px`;
  const min = Math.round(px * 0.62);
  return `clamp(${min}px, ${(px / 12.8).toFixed(2)}vw, ${px}px)`;
}

function declarations(settings, blk, sizeScale = 1) {
  const d = [];
  // The two "Everywhere" blocks change the font through their variable
  // instead, so an element that deliberately uses the other font keeps it.
  if (settings.font && !blk.fontVar) d.push(`font-family: ${FONT_BY_ID[settings.font].stack}`);
  if (settings.font && settings.font !== 'fraunces') d.push('font-variation-settings: normal');
  if (settings.weight) d.push(`font-weight: ${settings.weight}`);
  if (settings.style) d.push(`font-style: ${settings.style}`);
  // The admin's small preview scales sizes down instead of using the
  // screen-width formula, which would size them for the whole window.
  if (settings.size) d.push(`font-size: ${sizeScale === 1 ? responsiveSize(settings.size) : `${Math.max(6, Math.round(settings.size * sizeScale * 10) / 10)}px`}`);
  if (settings.tracking !== undefined) d.push(`letter-spacing: ${settings.tracking}em`);
  if (settings.leading !== undefined) d.push(`line-height: ${settings.leading}`);
  if (settings.case) d.push(`text-transform: ${settings.case}`);
  return d;
}

/**
 * The stylesheet for a set of choices. `scope` is the selector everything is
 * placed under: 'html' on the site, the preview box's class in the admin.
 * Empty choices produce an empty string.
 */
export function buildTypeCss(input, scope = 'html', { sizeScale = 1 } = {}) {
  const type = sanitizeType(input);
  const rules = [];
  // The two font variables first, so every font-sans / font-display follows.
  const vars = [];
  for (const blk of BLOCKS) {
    if (blk.fontVar && type[blk.id]?.font) vars.push(`${blk.fontVar}: ${FONT_BY_ID[type[blk.id].font].stack}`);
  }
  if (vars.length) rules.push(`${scope} { ${vars.join('; ')}; }`);

  for (const blk of BLOCKS) {
    const settings = type[blk.id];
    if (!settings) continue;
    const decl = declarations(settings, blk, sizeScale);
    if (!decl.length) continue;
    const sel = blk.selectors.map((s) => (s === ':scope' ? scope : `${scope} ${s}`)).join(', ');
    rules.push(`${sel} { ${decl.join('; ')}; }`);
  }
  return rules.join('\n');
}

/** Every font a set of choices uses, so the admin can mention downloads. */
export function fontsUsed(input) {
  return [...new Set(Object.values(sanitizeType(input)).map((s) => s.font).filter(Boolean))].map((id) => FONT_BY_ID[id]);
}
