import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { shouldSyncEditorContent } from '../editorSync';

const ToolbarBtn = ({ onClick, active, disabled, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`rounded px-2 py-1 text-sm transition ${
      active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
    } disabled:opacity-30`}
  >
    {children}
  </button>
);

export default function RichTextEditor({ value, onChange }) {
  // Keeps the latest onChange without re-creating the editor on every render.
  // Assigned in an effect rather than during render: a render can be thrown
  // away or replayed, and a ref written there would then be holding a callback
  // from a render that never committed.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Tracks the HTML the editor itself produced, so an echo of our own output
  // coming back through `value` does not trigger a setContent (which would
  // reset the cursor to the start of the document on every keystroke).
  const lastEmitted = useRef(value ?? '');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content: value ?? '',
    onUpdate({ editor }) {
      const html = editor.getHTML();
      lastEmitted.current = html;
      onChangeRef.current?.(html);
    },
  });

  // `useEditor` only reads `content` on first mount. When the parent loads an
  // existing article asynchronously, the new body arrives *after* that mount —
  // without this sync the editor stays blank and saving overwrites the article
  // with an empty document.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const incoming = value ?? '';
    const sync = shouldSyncEditorContent({
      incoming,
      lastEmitted: lastEmitted.current,
      currentHtml: editor.getHTML(),
    });
    if (!sync) return;
    lastEmitted.current = incoming;
    editor.commands.setContent(incoming, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="min-h-[360px] animate-pulse rounded-xl border border-gray-300 bg-gray-50" />
    );
  }

  const addLink = () => {
    const url = window.prompt('URL:', 'https://');
    if (!url) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-300 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <strong>B</strong>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <em>I</em>
        </ToolbarBtn>
        <span className="mx-1 h-4 w-px bg-gray-200" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
          H2
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
          H3
        </ToolbarBtn>
        <span className="mx-1 h-4 w-px bg-gray-200" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
          ≡
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
          1.
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
          ❝
        </ToolbarBtn>
        <span className="mx-1 h-4 w-px bg-gray-200" />
        <ToolbarBtn onClick={addLink} active={editor.isActive('link')} title="Add link">
          🔗
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')} title="Remove link">
          ✂
        </ToolbarBtn>
        <span className="mx-1 h-4 w-px bg-gray-200" />
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
          —
        </ToolbarBtn>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="prose prose-sm min-h-[320px] max-w-none p-4 focus:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
