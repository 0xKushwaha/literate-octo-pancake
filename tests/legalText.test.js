import { describe, expect, it } from 'vitest';
import { fillPlaceholders, parseLegalText } from '../src/lib/legalText.js';

describe('legal text', () => {
  it('splits headings, bullets and paragraphs', () => {
    const blocks = parseLegalText('## Who we are\nWe run\nthis site.\n\n- one\n- two\nAfter');
    expect(blocks).toEqual([
      { type: 'h2', text: 'Who we are', id: 'who-we-are' },
      { type: 'p', text: 'We run this site.' },
      { type: 'ul', items: ['one', 'two'] },
      { type: 'p', text: 'After' },
    ]);
  });

  it('keeps markup as plain text', () => {
    const [block] = parseLegalText('<img src=x onerror=alert(1)>');
    expect(block).toEqual({ type: 'p', text: '<img src=x onerror=alert(1)>' });
  });

  it('fills known placeholders and leaves unknown ones', () => {
    expect(fillPlaceholders('{name} at {email} {other}', { name: 'Z', email: 'a@b.co' })).toBe('Z at a@b.co {other}');
  });
});
