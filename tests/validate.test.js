import { describe, it, expect } from 'vitest';
import { LIMITS, MIN_FILL_MS, isEmail, isPhone, looksAutomated, normalise } from '../src/booking/validate.js';

const NUL = String.fromCharCode(0);
const BELL = String.fromCharCode(7);

describe('normalise', () => {
  it('trims and collapses runs of whitespace', () => {
    expect(normalise('  Ada   Okonkwo  ')).toBe('Ada Okonkwo');
  });

  it('strips control characters', () => {
    expect(normalise(`Ada${NUL}${BELL}Okonkwo`)).toBe('AdaOkonkwo');
  });

  it('keeps paragraph breaks when asked, and caps the run length', () => {
    expect(normalise('one\n\n\n\ntwo', { keepNewlines: true })).toBe('one\n\ntwo');
  });

  it('flattens newlines when not asked to keep them', () => {
    expect(normalise('one\ntwo')).toBe('one two');
  });

  it('enforces maxLength', () => {
    expect(normalise('x'.repeat(500), { maxLength: 10 })).toHaveLength(10);
  });

  it('returns an empty string for non-strings rather than throwing', () => {
    for (const v of [null, undefined, 42, {}, []]) expect(normalise(v)).toBe('');
  });
});

describe('isEmail', () => {
  it('accepts ordinary addresses', () => {
    for (const v of ['a@b.co', 'ada.okonkwo@lumentherapy.com', 'first+tag@sub.domain.org']) {
      expect(isEmail(v)).toBe(true);
    }
  });

  it('rejects the shapes that reliably bounce', () => {
    for (const v of ['', 'a@b', 'no-at-sign.com', 'two@@at.com', 'a b@c.com', 'a@b..com', '@b.com']) {
      expect(isEmail(v)).toBe(false);
    }
  });

  it('rejects an address longer than the RFC maximum', () => {
    expect(isEmail(`${'a'.repeat(LIMITS.email)}@b.com`)).toBe(false);
  });
});

describe('isPhone', () => {
  it('treats an absent number as valid, because the field is optional', () => {
    expect(isPhone('')).toBe(true);
    expect(isPhone(null)).toBe(true);
  });

  it('accepts common international formats', () => {
    for (const v of ['+1 (415) 555-0142', '020 7946 0018', '+91 98765 43210']) {
      expect(isPhone(v)).toBe(true);
    }
  });

  it('rejects too few or too many digits, and letters', () => {
    expect(isPhone('12345')).toBe(false);
    expect(isPhone('1'.repeat(16))).toBe(false);
    expect(isPhone('call me')).toBe(false);
  });
});

describe('looksAutomated', () => {
  it('flags a filled honeypot', () => {
    expect(looksAutomated({ honeypot: 'Acme Ltd', openedAt: Date.now() - 60000 })).toBe('honeypot');
  });

  it('flags a form completed faster than a person could read it', () => {
    expect(looksAutomated({ honeypot: '', openedAt: Date.now() })).toBe('too-fast');
  });

  it('passes a form filled at human speed', () => {
    expect(looksAutomated({ honeypot: '', openedAt: Date.now() - (MIN_FILL_MS + 1000) })).toBe(null);
  });

  it('passes when there is no open timestamp to judge', () => {
    expect(looksAutomated({ honeypot: '' })).toBe(null);
  });
});
