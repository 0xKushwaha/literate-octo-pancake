/**
 * @vitest-environment jsdom
 *
 * The admin's Site content page is where every word on the site is edited, so
 * "does the row editor actually appear for a list" is worth asserting rather
 * than eyeballing. This renders the real page against a stubbed database and
 * looks for the four numbers under the hero — the field that prompted the
 * rewrite, because it used to be a raw JSON textarea.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const upsertContent = vi.fn(async () => {});

vi.mock('../src/lib/queries/siteContent.js', () => ({
  getAllContent: vi.fn(async () => []),
  upsertContent: (...args) => upsertContent(...args),
  deleteContent: vi.fn(async () => {}),
}));

let container;
let root;

beforeEach(() => {
  upsertContent.mockClear();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container.remove();
});

async function renderPage() {
  const { default: AdminContent } = await import('../src/admin/pages/AdminContent.jsx');
  await act(async () => {
    root = createRoot(container);
    root.render(createElement(AdminContent));
  });
  // let the getAllContent promise settle
  await act(async () => { await Promise.resolve(); });
  return container;
}

function findByText(el, text) {
  return [...el.querySelectorAll('*')].filter((n) => n.textContent.trim() === text);
}

/** The <input> that currently holds `value`. */
function inputWithValue(el, value) {
  return [...el.querySelectorAll('input')].find((i) => i.value === value);
}

/** Types into a controlled React input. */
function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}

describe('admin: site content', () => {
  it('groups the fields by page', async () => {
    const el = await renderPage();
    for (const page of ['Everywhere', 'Home page', 'Services page', 'Pricing page']) {
      expect(findByText(el, page).length, page).toBeGreaterThan(0);
    }
  });

  it('shows the four numbers as a row editor, not a JSON blob', async () => {
    const el = await renderPage();

    expect(findByText(el, 'The four numbers').length).toBeGreaterThan(0);

    const text = el.textContent;
    expect(text).toContain('Caption underneath');
    expect(text).toContain('+ Add number');
    // The collapsed rows name the stat, so the list is scannable.
    expect(text).toContain('Sessions held');
    expect(text).toContain('Median wait for a first session');

    expect(inputWithValue(el, '14200'), 'the number itself is an input').toBeTruthy();
    expect(inputWithValue(el, 'Sessions held'), 'the caption is an input').toBeTruthy();
  });

  // The site formats the number for display, so the text on screen ("14,200+")
  // is not the text in the database ("14200"). Searching for what you can see
  // has to work, or the field may as well not be there.
  it('finds the stats by the text shown on the site', async () => {
    const el = await renderPage();
    const search = el.querySelector('input[type="search"], input[placeholder*="Search"]');
    expect(search).toBeTruthy();

    for (const term of ['14,200+', 'Sessions held', '4.9/5']) {
      await act(async () => { type(search, term); });
      expect(el.textContent, `searching "${term}"`).toContain('The four numbers');
    }
  });

  it('saves an edited caption as JSON for that field', async () => {
    const el = await renderPage();

    const caption = inputWithValue(el, 'Sessions held');
    await act(async () => { type(caption, 'Sessions delivered'); });

    const save = [...el.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Save');
    expect(save, 'an edited field offers Save').toBeTruthy();
    await act(async () => { save.click(); });

    expect(upsertContent).toHaveBeenCalledTimes(1);
    const payload = upsertContent.mock.calls[0][0];
    expect(payload.key).toBe('trust.stats');
    expect(payload.type).toBe('json');
    const saved = JSON.parse(payload.value);
    expect(saved[0].label).toBe('Sessions delivered');
    expect(saved[0].value).toBe(14200);
    expect(saved).toHaveLength(4);
  });
});
