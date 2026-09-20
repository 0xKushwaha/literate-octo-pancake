import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ALL_MANAGED_VARS, CORE_KEYS, GROUPS, TOKENS, TOKEN_BY_ID, ZONES,
  contentFromOverrides, cssVarsFor, normalizeHex, overridesFromContent, parsePalette, previewVarsFor, sanitizeOverrides,
} from '../src/lib/palette.js';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The first declaration of a variable in index.css (the @theme / :root one). */
const declared = (name) => css.match(new RegExp(`^\\s*${esc(name)}:\\s*([^;]+);`, 'm'))?.[1].trim();

describe('palette registry', () => {
  it('gives every token a unique id and css variable', () => {
    const ids = TOKENS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const vars = TOKENS.map((t) => t.cssVar);
    expect(new Set(vars).size).toBe(vars.length);
    for (const g of GROUPS) expect(g.title, g.id).toBeTruthy();
    for (const t of TOKENS) expect(t.label, t.id).toBeTruthy();
  });

  // The admin shows these defaults and the preview re-declares them, so they
  // must be exactly what the stylesheet says.
  it('matches index.css for every theme token', () => {
    for (const t of TOKENS.filter((x) => x.kind === 'theme')) {
      expect(declared(t.cssVar), `${t.cssVar} in index.css`).toBe(t.value);
    }
  });

  it('has a rule in index.css for every zone, and uses every zone colour', () => {
    for (const [zone, { cssSelector }] of Object.entries(ZONES)) {
      expect(css, zone).toContain(`${cssSelector} {`);
    }
    for (const t of TOKENS.filter((x) => x.kind !== 'theme')) {
      expect(css, t.cssVar).toContain(`var(${t.cssVar},`);
    }
  });

  it('stores the three main colours in their original rows', () => {
    expect(Object.keys(CORE_KEYS).sort()).toEqual(['accent', 'highlight', 'peach']);
    for (const id of Object.keys(CORE_KEYS)) expect(TOKEN_BY_ID[id].store).toBe(CORE_KEYS[id]);
  });
});

describe('palette values', () => {
  it('normalises hex and rejects anything else', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex(' #055F81 ')).toBe('#055f81');
    expect(normalizeHex('#11223380')).toBe('#11223380');
    expect(normalizeHex('#112233ff')).toBe('#112233');
    for (const bad of ['red', '#12', '#1234567', 'url(x)', '#fff;background:url(x)', 'var(--x)', '', null, 12]) {
      expect(normalizeHex(bad), String(bad)).toBe('');
    }
  });

  it('keeps only known tokens with real colours', () => {
    expect(sanitizeOverrides({ bg: '#fff', nope: '#000', ink: 'expression(alert(1))', btn: '#FFBF00' }))
      .toEqual({ bg: '#ffffff', btn: '#ffbf00' });
    expect(sanitizeOverrides(null)).toEqual({});
    expect(sanitizeOverrides(['#fff'])).toEqual({});
    expect(parsePalette('not json')).toEqual({});
    expect(parsePalette('{"bg":"#000"}')).toEqual({ bg: '#000000' });
  });

  it('round-trips through what is stored', () => {
    const overrides = { accent: '#123456', bg: '#000000', 'footer-ink': '#ffffff' };
    const { core, palette } = contentFromOverrides(overrides);
    expect(core['brand.brand_color']).toBe('#123456');
    expect(core['brand.highlight_color']).toBe('');
    expect(JSON.parse(palette)).toEqual({ bg: '#000000', 'footer-ink': '#ffffff' });
    const back = overridesFromContent({ brand: { brand_color: '#123456', highlight_color: '#FFBF00' }, palette });
    expect(back).toEqual(overrides);
  });

  it('only sets what was changed, and derives a zone\'s quieter text', () => {
    expect(cssVarsFor({})).toEqual({});
    const vars = cssVarsFor({ 'footer-ink': '#ffffff', btn: '#ff0000' });
    expect(vars['--color-btn']).toBe('#ff0000');
    expect(vars['--footer-ink']).toBe('#ffffff');
    expect(vars['--footer-ink-3']).toBe('color-mix(in srgb, #ffffff 68%, transparent)');
    expect(vars['--footer-line']).toBe('color-mix(in srgb, #ffffff 10%, transparent)');
    expect(vars['--header-ink-2']).toBeUndefined();
    for (const name of Object.keys(cssVarsFor({ 'header-ink': '#fff' }))) expect(ALL_MANAGED_VARS).toContain(name);
  });

  it('builds a self-contained preview', () => {
    const vars = previewVarsFor({});
    expect(vars['--accent']).toBe('#055F81');
    expect(vars['--color-brand-100']).toBe(TOKEN_BY_ID['brand-100'].value);
    expect(vars['--footer-bg']).toBe('initial');
    expect(vars['--root-ink']).toBe('var(--color-ink)');
    expect(previewVarsFor({ 'footer-bg': '#000' })['--footer-bg']).toBe('#000000');
  });
});
