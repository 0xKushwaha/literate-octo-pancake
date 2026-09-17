/**
 * Turns the plain text typed into the admin for a legal page into blocks.
 *
 * Deliberately not HTML: the text is split into headings, lists and
 * paragraphs and rendered as React elements, so nothing typed there can ever
 * become markup or script.
 *
 *   ## Heading          → a section heading (with an id for #links)
 *   - item              → a bullet
 *   anything else       → a paragraph; a blank line starts a new one
 *
 * {name}, {email} and {updated} are filled in from the admin.
 */

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function fillPlaceholders(text, values) {
  return String(text ?? '').replace(/\{(\w+)\}/g, (m, k) => (values[k] != null && values[k] !== '' ? String(values[k]) : m));
}

export function parseLegalText(text) {
  const blocks = [];
  let para = [];
  let list = null;

  const flushPara = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push({ type: 'ul', items: list });
    list = null;
  };

  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    if (line.startsWith('## ')) {
      flushPara();
      flushList();
      const heading = line.slice(3).trim();
      blocks.push({ type: 'h2', text: heading, id: slugify(heading) });
      continue;
    }
    if (/^[-*] /.test(line)) {
      flushPara();
      if (!list) list = [];
      list.push(line.slice(2).trim());
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}
