import { describe, it, expect } from 'vitest';
import {
  CONTENT_SCHEMA, PAGE_ORDER, PAGE_TITLES, SECTION_ORDER, SECTION_PAGE, SECTION_TITLES, defaultsFor,
} from '../src/data/contentSchema.js';

const sections = [...new Set(CONTENT_SCHEMA.map((f) => f.section))];

describe('content schema', () => {
  it('gives every field a unique key of the form section.name', () => {
    const keys = CONTENT_SCHEMA.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[a-z0-9_]+\.[a-z0-9_.]+$/);
  });

  // A section the admin does not know about would render its fields under a
  // raw key, or drop them out of the page grouping entirely.
  it('places every section on a page and in the ordering', () => {
    for (const s of sections) {
      expect(SECTION_PAGE[s], `section "${s}" has no page`).toBeDefined();
      expect(PAGE_ORDER, `page for "${s}"`).toContain(SECTION_PAGE[s]);
      expect(PAGE_TITLES[SECTION_PAGE[s]]).toBeTruthy();
      expect(SECTION_TITLES[s], `section "${s}" has no title`).toBeTruthy();
      expect(SECTION_ORDER, `section "${s}" is not ordered`).toContain(s);
    }
  });

  it('labels every field', () => {
    for (const f of CONTENT_SCHEMA) expect(f.label, f.key).toBeTruthy();
  });

  // The row editor only appears for a list that describes its entries, and it
  // writes the keys it was given — so those keys have to match the defaults,
  // or editing an entry would quietly create a parallel set of fields.
  it('describes the entries of every structured list', () => {
    for (const f of CONTENT_SCHEMA.filter((x) => x.type === 'json')) {
      expect(Array.isArray(f.value), `${f.key} default should be a list`).toBe(true);
      expect(f.fields || f.itemType, `${f.key} has no row editor`).toBeTruthy();
      if (f.itemType === 'string') {
        for (const item of f.value) expect(typeof item, f.key).toBe('string');
        continue;
      }
      const described = new Set(f.fields.map((x) => x.key));
      for (const item of f.value) {
        for (const key of Object.keys(item)) {
          expect(described.has(key), `${f.key}: entry key "${key}" has no editor field`).toBe(true);
        }
      }
    }
  });

  it('hands components a default for every field in their section', () => {
    for (const s of sections) {
      const defaults = defaultsFor(s);
      const expected = CONTENT_SCHEMA.filter((f) => f.section === s);
      expect(Object.keys(defaults).length).toBe(expected.length);
      for (const f of expected) expect(defaults[f.key.slice(s.length + 1)]).toBeDefined();
    }
  });
});
