import { describe, it, expect } from 'vitest';
import { publishedAtFor } from '../src/admin/articlePublishDate.js';

const NOW = '2026-09-11T12:00:00.000Z';
const now = () => NOW;

describe('publishedAtFor', () => {
  // The bug: editing an already-published article sent is_published: true with
  // no published_at, and the upsert failed the table's check constraint.
  it('keeps the existing date when re-publishing', () => {
    expect(publishedAtFor({ isPublished: true, existing: '2026-01-02T09:00:00.000Z', now }))
      .toBe('2026-01-02T09:00:00.000Z');
  });

  it('never returns null while the article is published', () => {
    expect(publishedAtFor({ isPublished: true, existing: null, now })).toBe(NOW);
  });

  it('stamps the first publish with now', () => {
    expect(publishedAtFor({ isPublished: true, existing: null, now })).toBe(NOW);
  });

  // Unpublishing has to keep the date, or re-publishing later would silently
  // re-date the article and reorder the blog.
  it('keeps the date through an unpublish', () => {
    expect(publishedAtFor({ isPublished: false, existing: '2026-01-02T09:00:00.000Z', now }))
      .toBe('2026-01-02T09:00:00.000Z');
  });

  it('leaves a never-published draft without a date', () => {
    expect(publishedAtFor({ isPublished: false, existing: null, now })).toBe(null);
    expect(publishedAtFor({ isPublished: false, existing: undefined, now })).toBe(null);
  });
});
