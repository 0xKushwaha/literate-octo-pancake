import { describe, expect, it } from 'vitest';
import { safeExternalUrl, safeUrl } from '../src/lib/safeUrl.js';

describe('safeUrl', () => {
  it('keeps https, mailto, tel and site paths', () => {
    expect(safeUrl('https://discord.gg/abc')).toBe('https://discord.gg/abc');
    expect(safeUrl('mailto:hello@example.com')).toBe('mailto:hello@example.com');
    expect(safeUrl('tel:+911234567890')).toBe('tel:+911234567890');
    expect(safeUrl('/privacy')).toBe('/privacy');
  });

  it('drops script and data links, however they are written', () => {
    for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,<script>', 'vbscript:x']) {
      expect(safeUrl(bad)).toBe(null);
    }
  });

  it('drops protocol-relative and plain http links', () => {
    expect(safeUrl('//evil.example')).toBe(null);
    expect(safeUrl('http://example.com')).toBe(null);
  });

  it('treats blank and # as no link', () => {
    expect(safeUrl('')).toBe(null);
    expect(safeUrl('#')).toBe(null);
    expect(safeUrl(undefined)).toBe(null);
  });

  it('external links must be https and not a path', () => {
    expect(safeExternalUrl('/privacy')).toBe(null);
    expect(safeExternalUrl('mailto:a@b.co')).toBe(null);
    expect(safeExternalUrl('https://discord.gg/x')).toBe('https://discord.gg/x');
  });
});
