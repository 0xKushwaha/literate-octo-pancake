import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  BLOCKS, FONTS, TYPE_GROUPS, buildTypeCss, parseType, responsiveSize, sanitizeBlock, sanitizeType,
} from '../src/lib/typography.js';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

describe('typography registry', () => {
  it('has unique ids for fonts and blocks', () => {
    expect(new Set(FONTS.map((f) => f.id)).size).toBe(FONTS.length);
    expect(new Set(BLOCKS.map((b) => b.id)).size).toBe(BLOCKS.length);
    for (const g of TYPE_GROUPS) expect(g.title).toBeTruthy();
  });

  // A bundled font with no @font-face would silently fall back to the next
  // font in its stack, which reads as "the picker does not work".
  it('declares a @font-face for every bundled font', () => {
    for (const f of FONTS.filter((x) => x.kind === 'bundled')) {
      const family = f.stack.match(/^"([^"]+)"/)[1];
      expect(css, family).toContain(`font-family: "${family}";`);
    }
  });

  it('marks every t-* block somewhere in the components', () => {
    const all = ['components/primitives.jsx', 'components/Nav.jsx', 'components/Footer.jsx', 'sections/Hero.jsx',
      'sections/Services.jsx', 'sections/HeardYou.jsx', 'sections/CtaBand.jsx', 'sections/Faq.jsx', 'sections/Breathing.jsx',
      'pages/BlogPostPage.jsx', 'booking/BookingDialog.jsx', 'components/ui/input.jsx'].map(src).join('\n');
    for (const b of BLOCKS) {
      for (const sel of b.selectors) {
        const marker = sel.match(/\.t-[a-z-]+/)?.[0];
        if (marker) expect(all, `${b.id} → ${marker}`).toContain(marker.slice(1));
      }
    }
  });
});

describe('typography values', () => {
  it('keeps only supported values', () => {
    expect(sanitizeBlock({ font: 'arial', weight: 700, style: 'italic', case: 'uppercase', size: 32, tracking: 0.05, leading: 1.2 }))
      .toEqual({ font: 'arial', weight: 700, style: 'italic', case: 'uppercase', size: 32, tracking: 0.05, leading: 1.2 });
    expect(sanitizeBlock({ font: 'Comic Sans', weight: 450, style: 'oblique', case: 'x', size: 'big' })).toEqual({});
    expect(sanitizeBlock({ font: 'arial;}body{display:none' })).toEqual({});
    expect(sanitizeBlock({ size: 9999, tracking: -5, leading: 99 })).toEqual({ size: 120, tracking: -0.1, leading: 2.4 });
    expect(sanitizeType({ nope: { font: 'arial' }, body: { size: 20, font: 'georgia' } })).toEqual({ body: { font: 'georgia' } });
    expect(parseType('garbage')).toEqual({});
  });

  it('writes nothing for an empty choice', () => {
    expect(buildTypeCss({})).toBe('');
    expect(buildTypeCss({ button: {} })).toBe('');
  });

  it('sets the font variables for body and headings, and rules for blocks', () => {
    const out = buildTypeCss({ body: { font: 'arial' }, headings: { font: 'georgia', weight: 700 }, button: { font: 'verdana', case: 'uppercase' } });
    expect(out).toContain('html { --font-sans: Arial');
    expect(out).toContain('--font-display: Georgia');
    expect(out).toMatch(/html :is\(h1, h2, h3, h4\) \{ font-variation-settings: normal; font-weight: 700; \}/);
    expect(out).toMatch(/html \.t-button \{ font-family: Verdana[^}]*text-transform: uppercase; \}/);
    // scoped for the admin preview, with sizes shrunk
    const prev = buildTypeCss({ 'hero-title': { size: 64 } }, '.palette-preview', { sizeScale: 0.5 });
    expect(prev).toBe('.palette-preview .t-hero-title { font-size: 32px; }');
  });

  it('shrinks large sizes on small screens', () => {
    expect(responsiveSize(16)).toBe('16px');
    expect(responsiveSize(64)).toBe('clamp(40px, 5.00vw, 64px)');
  });
});
