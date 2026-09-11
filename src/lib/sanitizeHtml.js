/**
 * Minimal allow-list sanitiser for editor-authored HTML.
 *
 * Article bodies are written in the admin panel and rendered with
 * dangerouslySetInnerHTML. Even though only admins can author them, that makes
 * one compromised (or careless) admin account enough to run script on every
 * visitor's page — on a site that handles mental-health enquiries. The CSP
 * blocks inline handlers in production, but a static site's CSP is one
 * misconfigured header away from not being there, so the markup is cleaned on
 * the way out as well.
 *
 * Deliberately dependency-free: it runs in the browser using DOMParser, which
 * parses into an inert document (no network requests, no script execution).
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'a', 'span', 'div',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'figure', 'figcaption', 'img',
]);

const ALLOWED_ATTRS = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  '*': [],
};

const SAFE_URL = /^(https?:|mailto:|tel:|#|\/)/i;

function cleanElement(el) {
  const tag = el.tagName.toLowerCase();

  if (!ALLOWED_TAGS.has(tag)) {
    // Keep the text, drop the element — a stray <script> loses its contents
    // entirely because the parser already put them in a text node we skip.
    const parent = el.parentNode;
    if (!parent) return;
    if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object' || tag === 'embed') {
      parent.removeChild(el);
      return;
    }
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
    return;
  }

  const allowed = new Set([...(ALLOWED_ATTRS[tag] ?? []), ...ALLOWED_ATTRS['*']]);
  for (const attr of [...el.attributes]) {
    const name = attr.name.toLowerCase();
    // Strips every on* handler, plus anything not explicitly allowed.
    if (!allowed.has(name)) {
      el.removeAttribute(attr.name);
      continue;
    }
    if ((name === 'href' || name === 'src') && !SAFE_URL.test(attr.value.trim())) {
      // Blocks javascript: and data: URLs.
      el.removeAttribute(attr.name);
    }
  }

  if (tag === 'a' && el.getAttribute('target') === '_blank') {
    el.setAttribute('rel', 'noopener noreferrer');
  }

  for (const child of [...el.children]) cleanElement(child);
}

export function sanitizeHtml(html) {
  if (!html) return '';
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') return '';

  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  for (const child of [...doc.body.children]) cleanElement(child);
  return doc.body.innerHTML;
}

export default sanitizeHtml;
