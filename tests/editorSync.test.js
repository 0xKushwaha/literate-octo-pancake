import { describe, it, expect } from 'vitest';
import { shouldSyncEditorContent } from '../src/admin/editorSync.js';

describe('shouldSyncEditorContent', () => {
  // The data-loss bug: the editor mounted empty, the article arrived a moment
  // later, and nothing put it on screen — so Publish saved the empty document.
  it('syncs when an article loads after the editor mounted', () => {
    expect(shouldSyncEditorContent({
      incoming: '<p>The real article</p>',
      lastEmitted: '',
      currentHtml: '<p></p>',
    })).toBe(true);
  });

  // The bug the naive fix introduces: our own HTML round-trips through the
  // parent's state and comes back, and a setContent here jumps the caret to
  // the top of the document on every keystroke.
  it('ignores our own output echoing back through the parent', () => {
    const html = '<p>Half a sentence being typ</p>';
    expect(shouldSyncEditorContent({
      incoming: html,
      lastEmitted: html,
      currentHtml: html,
    })).toBe(false);
  });

  it('skips a sync that would change nothing', () => {
    expect(shouldSyncEditorContent({
      incoming: '<p>Same</p>',
      lastEmitted: '<p>Different</p>',
      currentHtml: '<p>Same</p>',
    })).toBe(false);
  });

  it('treats a missing incoming value as empty rather than throwing', () => {
    expect(shouldSyncEditorContent({
      incoming: undefined,
      lastEmitted: '<p>Something</p>',
      currentHtml: '<p>Something</p>',
    })).toBe(true);
    expect(shouldSyncEditorContent({
      incoming: null,
      lastEmitted: '',
      currentHtml: '',
    })).toBe(false);
  });

  it('syncs when switching from one article to another', () => {
    expect(shouldSyncEditorContent({
      incoming: '<p>Second article</p>',
      lastEmitted: '<p>First article</p>',
      currentHtml: '<p>First article</p>',
    })).toBe(true);
  });
});
