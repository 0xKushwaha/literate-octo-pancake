import { describe, it, expect } from 'vitest';
import {
  indexRows, isValidContentKey, mergeContent, sectionOf, shortKeyOf,
} from '../src/lib/contentMerge.js';

describe('shortKeyOf', () => {
  it('strips the section prefix', () => {
    expect(shortKeyOf('hero.tagline')).toBe('tagline');
    expect(shortKeyOf('services.individual_blurb')).toBe('individual_blurb');
  });

  it('keeps everything after the first dot', () => {
    expect(shortKeyOf('nested.a.b')).toBe('a.b');
  });

  it('returns a key with no section unchanged', () => {
    expect(shortKeyOf('orphan')).toBe('orphan');
  });

  it('does not throw on null or undefined', () => {
    expect(shortKeyOf(null)).toBe('');
    expect(shortKeyOf(undefined)).toBe('');
  });
});

describe('sectionOf', () => {
  it('returns the part before the first dot', () => {
    expect(sectionOf('pricing.weekly_blurb')).toBe('pricing');
    expect(sectionOf('nested.a.b')).toBe('nested');
  });
});

describe('mergeContent', () => {
  it('overrides a default the component already declared', () => {
    const merged = mergeContent(
      { tagline: 'static' },
      { tagline: { value: 'from the CMS' } },
    );
    expect(merged.tagline).toBe('from the CMS');
  });

  // The regression this whole module exists for. The old implementation used
  // `if (shortKey in defaults)`, so a field added in the admin panel saved
  // fine and then never rendered.
  it('applies a stored key the defaults never mentioned', () => {
    const merged = mergeContent(
      { tagline: 'static' },
      { headline: { value: 'newly added in the admin' } },
    );
    expect(merged.headline).toBe('newly added in the admin');
    expect(merged.tagline).toBe('static');
  });

  it('falls back to the default when the stored value is empty', () => {
    expect(mergeContent({ tagline: 'static' }, { tagline: { value: '' } }).tagline).toBe('static');
    expect(mergeContent({ tagline: 'static' }, { tagline: { value: null } }).tagline).toBe('static');
  });

  it('accepts bare values as well as row objects', () => {
    expect(mergeContent({ a: '1' }, { a: '2' }).a).toBe('2');
  });

  it('never mutates the defaults it was given', () => {
    const defaults = { tagline: 'static' };
    mergeContent(defaults, { tagline: { value: 'changed' } });
    expect(defaults.tagline).toBe('static');
  });

  it('survives empty and missing input', () => {
    expect(mergeContent({ a: '1' }, {})).toEqual({ a: '1' });
    expect(mergeContent({ a: '1' }, null)).toEqual({ a: '1' });
    expect(mergeContent()).toEqual({});
  });

  it('keeps whitespace-only values, which are a deliberate choice', () => {
    expect(mergeContent({ a: 'x' }, { a: { value: ' ' } }).a).toBe(' ');
  });
});

describe('indexRows', () => {
  it('indexes rows by their short key and keeps the full key', () => {
    const indexed = indexRows([
      { key: 'hero.tagline', value: 'T', type: 'text', label: 'Hero tagline' },
    ]);
    expect(indexed.tagline.value).toBe('T');
    expect(indexed.tagline.key).toBe('hero.tagline');
    expect(indexed.tagline.label).toBe('Hero tagline');
  });

  it('skips rows with no key rather than creating an undefined bucket', () => {
    expect(indexRows([{ value: 'orphan' }, null])).toEqual({});
  });

  it('handles an empty or missing list', () => {
    expect(indexRows([])).toEqual({});
    expect(indexRows()).toEqual({});
  });
});

describe('isValidContentKey', () => {
  it('accepts the dotted lowercase form', () => {
    expect(isValidContentKey('hero.tagline')).toBe(true);
    expect(isValidContentKey('services.individual_blurb')).toBe(true);
  });

  // A key in any of these shapes used to save successfully and then be
  // invisible on the site, because useSiteContent could never look it up.
  it('rejects keys that could never be looked up', () => {
    expect(isValidContentKey('noSection')).toBe(false);
    expect(isValidContentKey('Hero.Tagline')).toBe(false);
    expect(isValidContentKey('hero.')).toBe(false);
    expect(isValidContentKey('.tagline')).toBe(false);
    expect(isValidContentKey('hero tagline')).toBe(false);
    expect(isValidContentKey('')).toBe(false);
    expect(isValidContentKey(null)).toBe(false);
  });
});
