/**
 * The pieces added so the client can change things from the admin that used
 * to be fixed in code: the homepage order, "none" for a removed picture,
 * {placeholder} sentences, per-page titles, crawler tags and the calendar
 * invite's wording.
 */
import { describe, expect, it } from 'vitest';
import { homeSectionOrder } from '../src/lib/homeSections.js';
import { HOME_SECTIONS } from '../src/data/contentSchema.js';
import { fillTemplate } from '../src/lib/format.js';
import { mergeContent } from '../src/lib/contentMerge.js';
import { titleForPath } from '../src/lib/pageMeta.js';
import { pageMetaFor, PAGE_KEYS } from '../api/page.js';
import { buildIcs } from '../src/booking/calendar.js';
import middleware, { config as middlewareConfig } from '../middleware.js';

const ids = HOME_SECTIONS.map((s) => s.id);

describe('homeSectionOrder', () => {
  it('uses the default order when nothing is stored', () => {
    expect(homeSectionOrder(undefined)).toEqual(ids);
    expect(homeSectionOrder('not a list')).toEqual(ids);
  });

  it('follows the stored order and hides what is switched off', () => {
    const stored = [...HOME_SECTIONS].reverse().map((s) => ({ ...s, show: s.id !== 'heard' }));
    expect(homeSectionOrder(stored)).toEqual([...ids].reverse().filter((id) => id !== 'heard'));
  });

  it('skips unknown and repeated ids', () => {
    const stored = [{ id: 'nope' }, ...HOME_SECTIONS, { id: 'explore' }];
    expect(homeSectionOrder(stored)).toEqual(ids);
  });

  it('slots a section missing from an older saved list back where the default puts it', () => {
    const stored = HOME_SECTIONS.filter((s) => s.id !== 'breathe');
    expect(homeSectionOrder(stored)).toEqual(ids);
    const first = HOME_SECTIONS.filter((s) => s.id !== 'explore');
    expect(homeSectionOrder(first)[0]).toBe('explore');
  });
});

describe('fillTemplate', () => {
  it('fills known placeholders and leaves unknown ones visible', () => {
    expect(fillTemplate('Free in {days} days', { days: 3 })).toBe('Free in 3 days');
    expect(fillTemplate('{count} open', { count: 0 })).toBe('0 open');
    expect(fillTemplate('Hi {nmae}', { name: 'A' })).toBe('Hi {nmae}');
    expect(fillTemplate(undefined)).toBe('');
  });
});

describe('a removed picture', () => {
  it('stores "none" and reaches the page as no picture, not the default', () => {
    const merged = mergeContent({ image_url: 'https://example.com/a.jpg' }, { image_url: 'none' });
    expect(merged.image_url).toBe('');
  });

  it('only means "nothing" for picture fields', () => {
    expect(mergeContent({ headline: 'x' }, { headline: 'none' }).headline).toBe('none');
    expect(mergeContent({ logo_url: '/l.svg' }, { logo_url: 'none' }).logo_url).toBe('');
    expect(mergeContent({ share_image_url: '/og.png' }, { share_image_url: 'none' }).share_image_url).toBe('');
  });
});

describe('page titles from the admin', () => {
  it('uses the admin page name, falling back to the built-in one', () => {
    expect(titleForPath('/services', 'Z', 'Home', { page_services: 'Care' })).toBe('Care · Z');
    expect(titleForPath('/services', 'Z', 'Home', {})).toBe('Services · Z');
    expect(titleForPath('/nope', 'Z', 'Home', { page_notfound: 'Lost' })).toBe('Lost · Z');
    expect(titleForPath('/', 'Z', 'Admin home title', {})).toBe('Admin home title');
  });
});

describe('api/page.js tags', () => {
  it('asks for every field it uses', () => {
    for (const k of ['brand.name', 'seo.home_title', 'seo.description', 'seo.share_image_url', 'seo.page_blog', 'legal.privacy_title']) {
      expect(PAGE_KEYS).toContain(k);
    }
  });

  it('builds the home page tags from the stored fields', () => {
    const meta = pageMetaFor('/', {
      'seo.home_title': 'Home title',
      'seo.description': 'Desc',
      'seo.share_image_url': 'https://abc.supabase.co/storage/v1/object/public/media/brand/og.webp',
    }, 'shell');
    expect(meta).toEqual({
      title: 'Home title',
      description: 'Desc',
      url: 'https://www.zehnspaces.com',
      image: 'https://abc.supabase.co/storage/v1/object/public/media/brand/og.webp',
    });
  });

  it('names sub-pages "<page> · <practice>" and makes a relative picture absolute', () => {
    const meta = pageMetaFor('/breathe', { 'brand.name': 'Calm', 'seo.share_image_url': '/og.png' }, 'shell');
    expect(meta.title).toBe('Breathing exercises · Calm');
    expect(meta.image).toBe('https://www.zehnspaces.com/og.png');
    expect(meta.description).toBeUndefined();
    expect(pageMetaFor('/terms', {}, 'shell').title).toBe('Terms of use · shell');
  });

  it('never points the preview at a non-https picture', () => {
    expect(pageMetaFor('/', { 'seo.share_image_url': 'http://x.test/a.png' }, 's').image).toBeUndefined();
    expect(pageMetaFor('/', { 'seo.share_image_url': 'javascript:alert(1)' }, 's').image).toBeUndefined();
  });
});

describe('middleware.js', () => {
  const req = (ua) => new Request('https://www.zehnspaces.com/', { headers: { 'user-agent': ua } });

  it('only runs on the home page', () => {
    expect(middlewareConfig.matcher).toBe('/');
  });

  it('sends link-preview bots to api/page.js', () => {
    const res = middleware(req('WhatsApp/2.23.20.0'));
    expect(res.headers.get('x-middleware-rewrite')).toBe('https://www.zehnspaces.com/api/page?path=%2F');
  });

  it('lets people through untouched', () => {
    expect(middleware(req('Mozilla/5.0 (Macintosh) Safari/605.1.15'))).toBeUndefined();
  });
});

describe('calendar invite wording', () => {
  const base = { reference: 'ABC123', dateKey: '2026-10-05', time: '10:00', format: 'video' };

  it('uses the admin brand, wording and time zone', () => {
    const ics = buildIcs({
      ...base,
      therapistName: 'Asha',
      brand: { name: 'Calm', phone: '+91 98 7654 3210', address: 'Pune' },
      copy: { timezone: 'Asia/Kolkata', calendar_title: 'Session {who}', success_with: 'with {therapist}' },
    });
    expect(ics).toContain('TZID=Asia/Kolkata');
    expect(ics).toContain('SUMMARY:Session with Asha');
    expect(ics).toContain('PRODID:-//Calm Therapy//Booking//EN');
    expect(ics).toContain('Calm session in one hour');
  });

  it('falls back to the built-in wording and refuses a time zone that is not one', () => {
    const ics = buildIcs({ ...base, copy: { timezone: 'x;DTSTART:evil', calendar_title: '' } });
    expect(ics).toContain('TZID=America/Los_Angeles');
    expect(ics).toContain('SUMMARY:Therapy session with your matched therapist');
  });
});
