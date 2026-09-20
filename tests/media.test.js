/**
 * Orphan-cleanup logic in src/lib/queries/media.js.
 *
 * The one thing worth pinning down here: a saved value can be a bare URL, a
 * rich-text HTML blob with <img> tags buried in it, or a JSON array of
 * testimonials with a clip URL on each one — and the cleanup has to find our
 * own storage URLs inside all three shapes the same way, then only ever
 * delete a URL that genuinely stopped being referenced.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const remove = vi.fn(async () => ({ error: null }));
let demo = false;

vi.mock('../src/lib/supabase.js', () => ({
  get isDemo() { return demo; },
  supabase: {
    storage: {
      from: () => ({ remove }),
    },
  },
}));

let mediaUrlsIn, deleteMediaUrls, cleanupReplacedMedia;

beforeEach(async () => {
  demo = false;
  remove.mockClear();
  remove.mockResolvedValue({ error: null });
  ({ mediaUrlsIn, deleteMediaUrls, cleanupReplacedMedia } = await import('../src/lib/queries/media.js'));
});

afterEach(() => {
  vi.resetModules();
});

const COVER = 'https://abcxyz.supabase.co/storage/v1/object/public/media/articles/cover-abc123.webp';
const CLIP_A = 'https://abcxyz.supabase.co/storage/v1/object/public/media/testimonials/clip-a.mp3';
const CLIP_B = 'https://abcxyz.supabase.co/storage/v1/object/public/media/testimonials/clip-b.mp3';

describe('mediaUrlsIn', () => {
  it('finds a bare URL string', () => {
    expect([...mediaUrlsIn(COVER)]).toEqual([COVER]);
  });

  it('finds URLs embedded in rich-text HTML', () => {
    const html = `<p>Intro</p><img src="${COVER}" alt=""><p>More text with a <a href="${CLIP_A}">link</a></p>`;
    const found = mediaUrlsIn(html);
    expect(found.has(COVER)).toBe(true);
    expect(found.has(CLIP_A)).toBe(true);
    expect(found.size).toBe(2);
  });

  it('walks a JSON-shaped array of objects, e.g. testimonials', () => {
    const testimonials = [
      { name: 'A', audio_url: CLIP_A },
      { name: 'B', audio_url: CLIP_B, note: 'no picture' },
    ];
    const found = mediaUrlsIn(testimonials);
    expect(found).toEqual(new Set([CLIP_A, CLIP_B]));
  });

  it('deduplicates the same URL appearing more than once', () => {
    const found = mediaUrlsIn([{ a: COVER }, { b: COVER }]);
    expect(found.size).toBe(1);
  });

  it('ignores URLs that are not this bucket\'s own storage URLs', () => {
    const found = mediaUrlsIn('https://images.unsplash.com/photo-123 and https://example.com/storage/v1/object/public/other/x.jpg');
    expect(found.size).toBe(0);
  });

  it('returns an empty set for null, undefined, numbers and empty strings', () => {
    expect(mediaUrlsIn(null).size).toBe(0);
    expect(mediaUrlsIn(undefined).size).toBe(0);
    expect(mediaUrlsIn(42).size).toBe(0);
    expect(mediaUrlsIn('').size).toBe(0);
  });
});

describe('deleteMediaUrls', () => {
  it('removes the storage path decoded from each URL', async () => {
    await deleteMediaUrls(new Set([COVER]));
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(['articles/cover-abc123.webp']);
  });

  it('does nothing with an empty list', async () => {
    await deleteMediaUrls([]);
    expect(remove).not.toHaveBeenCalled();
  });

  it('does nothing in demo mode', async () => {
    demo = true;
    vi.resetModules();
    ({ deleteMediaUrls } = await import('../src/lib/queries/media.js'));
    await deleteMediaUrls([COVER]);
    expect(remove).not.toHaveBeenCalled();
  });

  it('never throws when the storage call reports an error', async () => {
    remove.mockResolvedValueOnce({ error: { message: 'boom' } });
    await expect(deleteMediaUrls([COVER])).resolves.toBeUndefined();
  });

  it('never throws when the storage call itself rejects', async () => {
    remove.mockRejectedValueOnce(new Error('network down'));
    await expect(deleteMediaUrls([COVER])).resolves.toBeUndefined();
  });
});

describe('cleanupReplacedMedia', () => {
  it('deletes a URL that was in "before" but is gone from "after"', async () => {
    await cleanupReplacedMedia({ cover_image: COVER }, { cover_image: '' });
    expect(remove).toHaveBeenCalledWith(['articles/cover-abc123.webp']);
  });

  it('does not delete a URL that is still referenced after the save', async () => {
    await cleanupReplacedMedia({ cover_image: COVER }, { cover_image: COVER });
    expect(remove).not.toHaveBeenCalled();
  });

  it('only removes what actually dropped out of a testimonials-style array', async () => {
    const before = [{ audio_url: CLIP_A }, { audio_url: CLIP_B }];
    const after = [{ audio_url: CLIP_A }]; // second testimonial was deleted
    await cleanupReplacedMedia(before, after);
    expect(remove).toHaveBeenCalledWith(['testimonials/clip-b.mp3']);
  });

  it('is a no-op when "before" holds no media URLs at all', async () => {
    await cleanupReplacedMedia({ title: 'no pictures here' }, { title: 'still none' });
    expect(remove).not.toHaveBeenCalled();
  });

  it('treats a null "after" (a full delete) as removing everything from "before"', async () => {
    await cleanupReplacedMedia({ cover_image: COVER }, null);
    expect(remove).toHaveBeenCalledWith(['articles/cover-abc123.webp']);
  });
});
