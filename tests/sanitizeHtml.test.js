/**
 * @vitest-environment jsdom
 *
 * sanitizeHtml runs through DOMParser, so these need a DOM. Everything else in
 * tests/ runs in plain Node.
 */
import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../src/lib/sanitizeHtml.js';

describe('sanitizeHtml', () => {
  it('keeps the markup TipTap actually produces', () => {
    const html = '<h2>Heading</h2><p>Body with <strong>bold</strong> and <em>italic</em>.</p><ul><li>One</li></ul>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('removes script elements and their contents', () => {
    const out = sanitizeHtml('<p>Before</p><script>alert(1)</script><p>After</p>');
    expect(out).not.toContain('script');
    expect(out).not.toContain('alert');
    expect(out).toContain('Before');
    expect(out).toContain('After');
  });

  it('strips inline event handlers', () => {
    const out = sanitizeHtml('<p onclick="steal()">Text</p><img src="/x.png" onerror="steal()">');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('onerror');
    expect(out).toContain('Text');
  });

  it('blocks javascript: and data: URLs but keeps ordinary links', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:');
    expect(sanitizeHtml('<a href="data:text/html,hi">x</a>')).not.toContain('data:');
    expect(sanitizeHtml('<a href="https://example.com">x</a>')).toContain('https://example.com');
    expect(sanitizeHtml('<a href="/blog/post">x</a>')).toContain('/blog/post');
    expect(sanitizeHtml('<a href="mailto:hi@example.com">x</a>')).toContain('mailto:');
  });

  it('adds rel="noopener noreferrer" to links that open a new tab', () => {
    const out = sanitizeHtml('<a href="https://example.com" target="_blank">x</a>');
    expect(out).toContain('noopener');
    expect(out).toContain('noreferrer');
  });

  it('unwraps disallowed elements but keeps their text', () => {
    expect(sanitizeHtml('<marquee>Still readable</marquee>')).toContain('Still readable');
  });

  it('drops iframes outright', () => {
    expect(sanitizeHtml('<iframe src="https://evil.test"></iframe>')).not.toContain('iframe');
  });

  it('returns an empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });

  it('handles deeply nested attacks', () => {
    const out = sanitizeHtml('<div><p><span onmouseover="x()"><script>y()</script>text</span></p></div>');
    expect(out).not.toContain('onmouseover');
    expect(out).not.toContain('script');
    expect(out).toContain('text');
  });
});
