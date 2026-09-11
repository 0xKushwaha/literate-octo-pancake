/**
 * The one decision behind the blog editor's content sync, isolated so it can be
 * tested without mounting TipTap.
 *
 * TipTap reads its `content` option once, at mount. The editor page mounts with
 * an empty form and fetches the article afterwards, so the body always arrives
 * late — and without a sync the editor stayed blank and Publish wrote that
 * blankness over the article.
 *
 * The naive fix (call setContent whenever `value` changes) replaces the bug
 * with a worse one: the editor emits HTML on every keystroke, the parent stores
 * it, it comes back as a new `value`, and setContent resets the caret to the
 * top of the document mid-sentence.
 */
export function shouldSyncEditorContent({ incoming, lastEmitted, currentHtml }) {
  const next = incoming ?? '';
  // Our own output echoing back through the parent. Ignore it.
  if (next === lastEmitted) return false;
  // Already displaying exactly this. A setContent would be a no-op that still
  // costs the caret position.
  if (next === currentHtml) return false;
  return true;
}
