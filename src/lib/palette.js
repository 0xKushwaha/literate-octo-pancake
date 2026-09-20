/**
 * Every colour on the public site, as a list the admin can edit.
 *
 * Admin → Colour palette is built from this file, and theme.js applies what it
 * stores. Three kinds of entry:
 *
 *   theme  — a variable defined in src/index.css (@theme or :root). `value` is
 *            its default exactly as written there; tests/palette.test.js fails
 *            if the two drift. Overriding one sets it on <html>, so everything
 *            built from it follows (change "Brand colour" and every tint,
 *            button and link that is mixed from it moves too).
 *   zone   — one region of the page (header, footer, …). Not defined anywhere
 *            until set; index.css falls back to the site-wide colour. Setting
 *            a zone's text colour also derives its quieter text and hairlines,
 *            so a dark footer does not end up with dark captions.
 *   slot   — like a zone, but a single variable with a CSS fallback (the
 *            section label colour, which has to follow whatever it sits on).
 *
 * Stored values are hex only (#rgb, #rgba, #rrggbb, #rrggbbaa). Anything else
 * is dropped on the way in and on the way out, so nothing typed in the admin
 * can ever reach the page as anything but a colour.
 */

export const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** The site_content row holding every override except the three main colours. */
export const PALETTE_KEY = 'theme.palette';

/** The three main colours keep the rows they have always had. */
export const CORE_KEYS = {
  accent: 'brand.brand_color',
  highlight: 'brand.highlight_color',
  peach: 'brand.peach_color',
};

/** localStorage key the admin writes while "Preview on site" is open. */
export const PREVIEW_STORAGE_KEY = 'lumen.palette.preview';
/** localStorage key holding the last palette a visitor saw, applied at boot. */
export const CACHE_STORAGE_KEY = 'lumen.palette.cache';
/** A preview left open is ignored after this long. */
export const PREVIEW_TTL_MS = 6 * 60 * 60 * 1000;

const mix = (v, pct, into) => `color-mix(in oklab, var(${v}) ${pct}%, ${into})`;
const alpha = (v, pct) => `color-mix(in srgb, var(${v}) ${pct}%, transparent)`;

const t = (id, cssVar, value, label, hint = '', extra = {}) => ({ id, cssVar, value, label, hint, kind: 'theme', ...extra });
const z = (zone, slot, label, hint, follows) => ({
  id: `${zone}-${slot}`, cssVar: `--${zone}-${slot}`, kind: 'zone', zone, slot, label, hint, follows,
});

/**
 * Regions with their own background and text colour. `cssSelector` is the rule
 * in index.css that picks the variables up; the test checks every zone has one.
 */
export const ZONES = {
  header: { cssSelector: '.zone-header' },
  crisis: { cssSelector: '.zone-crisis' },
  footer: { cssSelector: '.zone-footer' },
  band: { cssSelector: '.backdrop-soft' },
  hero: { cssSelector: '.zone-hero' },
  mobilebar: { cssSelector: '.zone-mobilebar' },
  popup: { cssSelector: '.zone-popup' },
};

export const GROUPS = [
  {
    id: 'core',
    title: 'Main colours',
    blurb: 'The three colours the whole site is mixed from. Change these first — every tint, wash, button and link that is set to "Auto" below follows them.',
    tokens: [
      t('accent', '--accent', '#055F81', 'Brand colour', 'Buttons on light pages, links, focus rings, the big display words and every pale blue wash. Keep it dark enough to carry white text.', { store: CORE_KEYS.accent }),
      t('highlight', '--highlight', '#FFBF00', 'Highlight colour', 'The loud one: the crisis strip, the button on the dark band, the exhale, the "New" badge, the underline on links. Always carries dark text, so keep it bright.', { store: CORE_KEYS.highlight }),
      t('peach', '--peach', '#FFCBA4', 'Peach accent', 'The warm third colour in small places: the hero status pill, one quote card, the community chips.', { store: CORE_KEYS.peach }),
    ],
  },
  {
    id: 'surfaces',
    title: 'Page & cards',
    blurb: 'The ground everything sits on.',
    tokens: [
      t('bg', '--color-bg', '#FAF9F6', 'Page background', 'Warm paper behind every page.'),
      t('bg-2', '--color-bg-2', mix('--accent', 20, 'white'), 'Tinted band', 'Behind the hero, every page header and the breathing band.'),
      t('surface', '--color-surface', '#ffffff', 'Cards & panels', 'Every white card, the booking form, the dropdown menus.'),
      t('surface-2', '--color-surface-2', mix('--accent', 10, 'white'), 'Soft fill', 'Hover states, quiet chips, photo placeholders.'),
      t('surface-3', '--color-surface-3', mix('--accent', 22, 'white'), 'Stronger soft fill', 'The current page in the menu, pressed states.'),
    ],
  },
  {
    id: 'text',
    title: 'Text',
    blurb: 'The three quieter steps are the main text colour at lower strength, so changing "Main text" carries them too unless you set them yourself.',
    tokens: [
      t('ink', '--color-ink', '#081D26', 'Main text', 'Headlines and the strongest text.'),
      t('ink-2', '--color-ink-2', alpha('--color-ink', 80), 'Body text', 'Paragraphs and leads.', { alpha: true }),
      t('ink-3', '--color-ink-3', alpha('--color-ink', 68), 'Secondary text', 'Descriptions, card blurbs.', { alpha: true }),
      t('ink-4', '--color-ink-4', alpha('--color-ink', 58), 'Captions', 'Dates, small print, footer headings.', { alpha: true }),
      t('accent-strong', '--color-accent-strong', mix('--accent', 88, '#06171A'), 'Coloured words', 'The italic word in headlines, the stat numbers, "Start here" links.'),
      t('on-brand', '--color-on-brand', '#ffffff', 'Text on brand colour', 'Icons and ticks sitting on a solid brand-coloured circle.'),
      t('on-ink', '--color-on-ink', '#ffffff', 'Text on dark chips', 'The selected filter chip, video durations, the "Try again" button on error pages.'),
    ],
  },
  {
    id: 'buttons',
    title: 'Buttons',
    blurb: 'The main button is the one action on each page ("Join our community", "Book a session").',
    tokens: [
      t('btn', '--color-btn', '#FFBF00', 'Main button', 'Header, hero, mobile bar and form buttons.'),
      t('btn-ink', '--color-btn-ink', 'var(--color-ink)', 'Main button text'),
      t('btn-2', '--color-btn-2', 'var(--color-surface)', 'Second button', 'The outlined button beside the main one.'),
      t('btn-2-ink', '--color-btn-2-ink', 'var(--color-ink)', 'Second button text', 'Also its border on hover.'),
      t('btn-2-line', '--color-btn-2-line', 'var(--color-line-2)', 'Second button border', '', { alpha: true }),
      t('btn-3', '--color-btn-3', 'var(--color-amber-500)', 'Button on the dark band', 'The closing call to action and the breathing player.'),
      t('btn-3-ink', '--color-btn-3-ink', 'var(--color-ink)', 'Its text'),
    ],
  },
  {
    id: 'header',
    title: 'Header & menu',
    blurb: 'The bar across the top of every page. Dropdown menus keep the pop-up colours below.',
    tokens: [
      z('header', 'bg', 'Header background', '', 'Page background'),
      z('header', 'ink', 'Header text', 'Menu links and the phone number. Quieter text and the divider line follow it.', 'Main text'),
      z('header', 'hover', 'Menu link hover', '', 'Soft fill'),
      z('header', 'active', 'Current page highlight', '', 'Stronger soft fill'),
      t('badge', '--color-badge', 'var(--color-amber-500)', '"New" badge'),
      t('badge-ink', '--color-badge-ink', 'var(--color-ink)', '"New" badge text'),
    ],
  },
  {
    id: 'hero',
    title: 'Homepage hero',
    blurb: 'The first screen of the homepage.',
    tokens: [
      z('hero', 'bg', 'Hero background', '', 'Tinted band'),
      z('hero', 'ink', 'Hero text', 'Headline, lead and the stats captions.', 'Main text'),
      t('mark', '--color-mark', 'color-mix(in oklab, var(--highlight) 60%, transparent)', 'Highlighter behind the rotating word', '', { alpha: true }),
    ],
  },
  {
    id: 'band',
    title: 'Tinted bands',
    blurb: 'Every page header, the breathing band on the homepage, the legal pages and the 404 page.',
    tokens: [
      z('band', 'bg', 'Band background', '', 'Tinted band'),
      z('band', 'ink', 'Band text', '', 'Main text'),
    ],
  },
  {
    id: 'deep',
    title: 'Dark band',
    blurb: 'The closing call to action and the breathing player.',
    tokens: [
      t('deep', '--color-deep', mix('--accent', 75, '#06171A'), 'Dark band background'),
      t('deep-2', '--color-deep-2', mix('--accent', 88, '#06171A'), 'Dark cards', 'Panels sitting on the dark band.'),
      t('on-deep', '--color-on-deep', '#ffffff', 'Text on the dark band', 'Its faded steps (captions, borders) follow it.'),
    ],
  },
  {
    id: 'footer',
    title: 'Footer',
    blurb: 'The foot of every page.',
    tokens: [
      z('footer', 'bg', 'Footer background', '', 'Page background'),
      z('footer', 'ink', 'Footer text', 'Links, contact details, column headings, the copyright line.', 'Main text'),
    ],
  },
  {
    id: 'crisis',
    title: 'Crisis strip',
    blurb: 'The "In immediate crisis?" line above the footer. Keep it easy to spot.',
    tokens: [
      z('crisis', 'bg', 'Strip background', '', 'Highlight colour'),
      z('crisis', 'ink', 'Strip text', '', 'Main text'),
    ],
  },
  {
    id: 'mobilebar',
    title: 'Phone action bar',
    blurb: 'The floating bar at the bottom of the screen on phones.',
    tokens: [
      z('mobilebar', 'bg', 'Bar background', '', 'Cards & panels'),
      z('mobilebar', 'ink', 'Bar text & icons', '', 'Main text'),
    ],
  },
  {
    id: 'popup',
    title: 'Pop-ups & menus',
    blurb: 'Dialogs (booking, videos, articles), dropdown menus, the phone menu and the search palette.',
    tokens: [
      z('popup', 'bg', 'Pop-up background', '', 'Cards & panels'),
      z('popup', 'ink', 'Pop-up text', '', 'Main text'),
      t('overlay', '--color-overlay', 'color-mix(in srgb, #000000 50%, transparent)', 'Dimmed page behind a dialog', '', { alpha: true }),
    ],
  },
  {
    id: 'tones',
    title: 'Card colours',
    blurb: 'The service cards, the "we heard you" quotes and the breathing icons rotate through these four.',
    tokens: [
      t('tone-1', '--color-tone-1', 'var(--color-brand-100)', 'Card colour 1'),
      t('tone-2', '--color-tone-2', 'var(--color-surface)', 'Card colour 2', 'Also the icon tile on tinted cards.'),
      t('tone-3', '--color-tone-3', 'var(--color-peach-100)', 'Card colour 3'),
      t('tone-4', '--color-tone-4', 'var(--color-sand-100)', 'Card colour 4'),
    ],
  },
  {
    id: 'details',
    title: 'Labels, links & small details',
    blurb: '',
    tokens: [
      t('label-bar', '--color-label-bar', 'var(--color-peach-200)', 'Bar beside section labels', 'The small upright bar before "WHAT WE TREAT" and the like.'),
      { id: 'label-ink', cssVar: '--label-ink', kind: 'slot', label: 'Section label text', hint: 'Left on Auto, it takes the caption colour of wherever it sits.', follows: 'Captions' },
      t('link-mark', '--color-link-mark', 'var(--color-amber-500)', 'Link underline', '"See everything" links and links inside articles.'),
      t('focus', '--color-focus', 'var(--accent)', 'Keyboard focus ring', 'The outline shown when someone tabs through the page. Keep it visible.'),
      t('selection', '--color-selection', 'color-mix(in oklab, var(--color-amber-500) 45%, transparent)', 'Selected text', '', { alpha: true }),
      t('photo-frame', '--color-photo-frame', 'var(--color-brand-200)', 'Panel behind page photos'),
      t('field-line', '--color-field-line', 'var(--color-line-2)', 'Form field border', '', { alpha: true }),
      t('scrollbar', '--color-scrollbar', 'var(--color-line-2)', 'Scrollbar', '', { alpha: true }),
    ],
  },
  {
    id: 'article',
    title: 'Blog articles',
    blurb: 'Inside a published article.',
    tokens: [
      t('article-text', '--color-article-text', 'var(--color-ink-2)', 'Article text', '', { alpha: true }),
      t('article-heading', '--color-article-heading', 'var(--color-ink)', 'Article headings'),
      t('article-link', '--color-article-link', 'var(--color-link-mark)', 'Link underline'),
      t('article-quote', '--color-article-quote', 'var(--color-amber-500)', 'Quote bar'),
      t('article-code', '--color-article-code', 'var(--color-surface-2)', 'Inline code background'),
      t('article-pre', '--color-article-pre', 'var(--color-ink)', 'Code block background'),
    ],
  },
  {
    id: 'breathing',
    title: 'Breathing player',
    blurb: 'The ring and dots change colour with each phase.',
    tokens: [
      t('breath-in', '--color-breath-in', 'var(--color-brand-300)', 'Breathe in'),
      t('breath-hold', '--color-breath-hold', 'var(--color-sand-100)', 'Hold'),
      t('breath-out', '--color-breath-out', 'var(--color-amber-500)', 'Breathe out'),
    ],
  },
  {
    id: 'lines',
    title: 'Lines',
    blurb: 'Card borders and dividers. Both are the main text colour, faded.',
    tokens: [
      t('line', '--color-line', alpha('--color-ink', 10), 'Hairline', 'Card borders and dividers.', { alpha: true }),
      t('line-2', '--color-line-2', alpha('--color-ink', 20), 'Stronger line', 'Button and field outlines.', { alpha: true }),
    ],
  },
  {
    id: 'brand-tints',
    title: 'Brand tints',
    blurb: 'The brand colour mixed with white, lightest first. Used for washes, chips, rings and hover states all over the site.',
    tokens: [
      t('brand-50', '--color-brand-50', mix('--accent', 12, 'white'), 'Tint 50 (palest)'),
      t('brand-100', '--color-brand-100', mix('--accent', 26, 'white'), 'Tint 100'),
      t('brand-200', '--color-brand-200', mix('--accent', 38, 'white'), 'Tint 200'),
      t('brand-300', '--color-brand-300', mix('--accent', 55, 'white'), 'Tint 300'),
      t('brand-400', '--color-brand-400', mix('--accent', 68, 'white'), 'Tint 400'),
      t('brand-500', '--color-brand-500', 'var(--accent)', 'Solid brand', 'Icon circles, ticks, checked boxes.'),
      t('brand-600', '--color-brand-600', mix('--accent', 86, '#06171A'), 'Deep brand', 'Hover on solid brand buttons.'),
    ],
  },
  {
    id: 'warm-tints',
    title: 'Warm tints',
    blurb: 'Fills only — they always carry dark text.',
    tokens: [
      t('sand-50', '--color-sand-50', '#FBF2E4', 'Sand, pale'),
      t('sand-100', '--color-sand-100', '#F9DCC0', 'Sand'),
      t('rose-100', '--color-rose-100', '#FFD3D6', 'Rose, pale'),
      t('rose-200', '--color-rose-200', '#FFB0B5', 'Rose'),
      t('peach-50', '--color-peach-50', 'color-mix(in oklab, var(--peach) 40%, white)', 'Peach, pale', 'Behind blog pictures while they load.'),
      t('peach-200', '--color-peach-200', 'color-mix(in oklab, var(--peach) 78%, #A8410E)', 'Peach, deep'),
    ],
  },
];

export const TOKENS = GROUPS.flatMap((g) => g.tokens.map((tok) => ({ ...tok, group: g.id })));
export const TOKEN_BY_ID = Object.fromEntries(TOKENS.map((tok) => [tok.id, tok]));

/** Pairs worth warning about when they stop being readable. [text, ground, label] */
export const CONTRAST_CHECKS = [
  ['var(--color-ink)', 'var(--color-bg)', 'Main text on the page'],
  ['var(--color-ink-3)', 'var(--color-bg)', 'Secondary text on the page'],
  ['var(--color-ink-3)', 'var(--color-surface)', 'Secondary text on cards'],
  ['var(--color-btn-ink)', 'var(--color-btn)', 'Main button'],
  ['var(--color-btn-2-ink)', 'var(--color-btn-2)', 'Second button'],
  ['var(--color-btn-3-ink)', 'var(--color-btn-3)', 'Button on the dark band'],
  ['var(--color-on-brand)', 'var(--color-brand-500)', 'Icons on the brand colour'],
  ['var(--color-accent-strong)', 'var(--color-bg)', 'Coloured words'],
  ['var(--color-on-deep)', 'var(--color-deep)', 'Text on the dark band'],
  ['var(--header-ink, var(--color-ink))', 'var(--header-bg, var(--color-bg))', 'Header'],
  ['var(--hero-ink, var(--color-ink))', 'var(--hero-bg, var(--color-bg-2))', 'Hero'],
  ['var(--band-ink, var(--color-ink))', 'var(--band-bg, var(--color-bg-2))', 'Tinted bands'],
  ['var(--footer-ink-3, var(--color-ink-3))', 'var(--footer-bg, var(--color-bg))', 'Footer links'],
  ['var(--crisis-ink, var(--color-ink))', 'var(--crisis-bg, var(--color-amber-500))', 'Crisis strip'],
  ['var(--mobilebar-ink, var(--color-ink))', 'var(--mobilebar-bg, var(--color-surface))', 'Phone action bar'],
  ['var(--popup-ink, var(--color-ink))', 'var(--popup-bg, var(--color-surface))', 'Pop-ups'],
  ['var(--color-badge-ink)', 'var(--color-badge)', '"New" badge'],
  ['var(--color-article-text)', 'var(--color-bg)', 'Article text'],
];

// ── values ──────────────────────────────────────────────────────────────────

export function isHex(v) {
  return typeof v === 'string' && HEX.test(v.trim());
}

/** Lower-cased #rrggbb or #rrggbbaa, or '' for anything that is not a colour. */
export function normalizeHex(v) {
  if (!isHex(v)) return '';
  let h = v.trim().slice(1).toLowerCase();
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
  if (h.length === 8 && h.endsWith('ff')) h = h.slice(0, 6);
  return `#${h}`;
}

/** Keeps only known token ids with valid colours. */
export function sanitizeOverrides(input) {
  const out = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const [id, value] of Object.entries(input)) {
    if (!TOKEN_BY_ID[id]) continue;
    const hex = normalizeHex(value);
    if (hex) out[id] = hex;
  }
  return out;
}

/** Parses the stored JSON text of theme.palette; never throws. */
export function parsePalette(text) {
  if (text && typeof text === 'object') return sanitizeOverrides(text);
  try {
    return sanitizeOverrides(JSON.parse(String(text ?? '') || '{}'));
  } catch {
    return {};
  }
}

/** Builds the override map from site_content: brand.* for the core three, theme.palette for the rest. */
export function overridesFromContent({ brand = {}, palette = '' } = {}) {
  const out = parsePalette(palette);
  for (const [id, key] of Object.entries(CORE_KEYS)) {
    delete out[id];
    const hex = normalizeHex(String(brand[key.split('.')[1]] ?? ''));
    if (hex && hex !== normalizeHex(TOKEN_BY_ID[id].value)) out[id] = hex;
  }
  return out;
}

/** Splits an override map back into what is stored where. */
export function contentFromOverrides(overrides) {
  const clean = sanitizeOverrides(overrides);
  const core = {};
  for (const [id, key] of Object.entries(CORE_KEYS)) {
    core[key] = clean[id] ?? '';
    delete clean[id];
  }
  return { core, palette: JSON.stringify(clean) };
}

const fade = (hex, pct) => `color-mix(in srgb, ${hex} ${pct}%, transparent)`;

/**
 * The CSS variables to set on <html> (or on a preview element) for a set of
 * overrides. Only overridden things appear: a variable that is not in the
 * result is left to index.css.
 */
export function cssVarsFor(overrides) {
  const clean = sanitizeOverrides(overrides);
  const vars = {};
  for (const [id, hex] of Object.entries(clean)) vars[TOKEN_BY_ID[id].cssVar] = hex;

  // A zone whose text colour was set brings its quieter text and hairlines
  // with it, at the same strengths the site-wide ones use.
  for (const zone of Object.keys(ZONES)) {
    const ink = clean[`${zone}-ink`];
    if (!ink) continue;
    vars[`--${zone}-ink-2`] = fade(ink, 80);
    vars[`--${zone}-ink-3`] = fade(ink, 68);
    vars[`--${zone}-ink-4`] = fade(ink, 58);
    vars[`--${zone}-line`] = fade(ink, 10);
    vars[`--${zone}-line-2`] = fade(ink, 20);
    if (zone === 'header') {
      if (!clean['header-hover']) vars['--header-hover'] = fade(ink, 8);
      if (!clean['header-active']) vars['--header-active'] = fade(ink, 14);
    }
  }
  return vars;
}

/** Every variable any palette could set, so a reset can remove them all. */
export const ALL_MANAGED_VARS = (() => {
  const set = new Set(TOKENS.map((tok) => tok.cssVar));
  for (const zone of Object.keys(ZONES)) {
    for (const s of ['ink-2', 'ink-3', 'ink-4', 'line', 'line-2']) set.add(`--${zone}-${s}`);
  }
  set.add('--header-hover');
  set.add('--header-active');
  return [...set];
})();

/** Variables index.css captures on :root for the zones. */
export const ROOT_CAPTURES = ['bg', 'bg-2', 'surface', 'surface-2', 'surface-3', 'amber-500', 'ink', 'ink-2', 'ink-3', 'ink-4', 'line', 'line-2'];

/**
 * Declarations that make an element a self-contained copy of the palette, for
 * the admin's live preview. Theme variables are resolved where they are
 * declared (on :root), so changing --accent on a <div> alone would not move
 * the tints mixed from it — this re-declares every one of them on the element.
 */
export function previewVarsFor(overrides) {
  const vars = {};
  // Tailwind's own tokens that the palette tokens are built from.
  vars['--color-amber-500'] = 'var(--highlight)';
  vars['--color-peach-100'] = 'var(--peach)';
  vars['--button'] = 'var(--accent)';
  vars['--color-bg-3'] = 'var(--color-bg-2)';
  for (const tok of TOKENS) if (tok.kind === 'theme') vars[tok.cssVar] = tok.value;
  for (const name of ROOT_CAPTURES) vars[`--root-${name}`] = `var(--color-${name})`;
  // Zone variables inherited from <html> must not leak into the preview.
  for (const v of ALL_MANAGED_VARS) if (!(v in vars)) vars[v] = 'initial';
  return { ...vars, ...cssVarsFor(overrides) };
}
