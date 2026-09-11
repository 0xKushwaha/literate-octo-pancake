import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { listAllFaqs, upsertFaq, deleteFaq } from '../../lib/queries/faqs';
import StatusBadge from '../components/StatusBadge';
import { useEscape, useList, useSaveShortcut, useSearch, useSort, useUnsavedChanges } from '../hooks';
import {
  Button, EmptyState, ErrorState, PageHeader, Panel, SearchInput, TableSkeleton, Th,
} from '../components/ui';

const EMPTY = { question: '', answer: '', category: '', sort_order: 0, is_published: true };
const SEARCH_FIELDS = ['question', 'answer', 'category'];

function FaqForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Compared against what was loaded, so opening a form and closing it again
  // without typing does not prompt.
  const dirty = JSON.stringify(form) !== JSON.stringify(initial ?? EMPTY);
  useUnsavedChanges(dirty && !saving);

  const save = useCallback(async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error('A question and an answer are both required');
      return;
    }
    setSaving(true);
    try {
      await upsertFaq({ ...form, question: form.question.trim(), answer: form.answer.trim() });
      toast.success(initial?.id ? 'FAQ updated' : 'FAQ created');
      onSaved();
    } catch (err) {
      toast.error(err?.message || 'Could not save that FAQ');
    } finally {
      setSaving(false);
    }
  }, [form, initial, onSaved]);

  useSaveShortcut(save, !saving);
  useEscape(() => { if (!dirty) onCancel(); }, true);

  const field = 'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500';
  const label = 'mb-1 block text-xs font-medium text-gray-600';

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save(); }}
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">{initial?.id ? 'Edit FAQ' : 'New FAQ'}</h2>
        {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
      </div>

      <div>
        <label className={label} htmlFor="faq-question">Question <span className="text-red-500">*</span></label>
        <input id="faq-question" type="text" value={form.question} autoFocus
          onChange={(e) => set('question', e.target.value)} className={field} />
      </div>

      <div>
        <label className={label} htmlFor="faq-answer">Answer <span className="text-red-500">*</span></label>
        <textarea id="faq-answer" value={form.answer} rows={4}
          onChange={(e) => set('answer', e.target.value)} className={`${field} resize-y`} />
        <p className="mt-1 text-[11px] text-gray-400">{form.answer.length} / 4000 characters</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={label} htmlFor="faq-category">Category</label>
          <input id="faq-category" type="text" value={form.category ?? ''} placeholder="e.g. Pricing"
            onChange={(e) => set('category', e.target.value)} className={field} />
        </div>
        <div>
          <label className={label} htmlFor="faq-order">Sort order</label>
          <input id="faq-order" type="number" min={0} value={form.sort_order}
            onChange={(e) => set('sort_order', Number(e.target.value))} className={`${field} tabular-nums`} />
        </div>
        <div className="flex items-center pt-5">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={form.is_published} className="rounded"
              onChange={(e) => set('is_published', e.target.checked)} />
            <span className="text-sm text-gray-700">Published</span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save FAQ'}</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <span className="text-xs text-gray-400">⌘S / Ctrl+S to save</span>
      </div>
    </form>
  );
}

export default function AdminFaqs() {
  const { rows, setRows, loading, error, reload } = useList(listAllFaqs);
  const { query, setQuery, filtered } = useSearch(rows, SEARCH_FIELDS);
  const { sort, toggle, sorted } = useSort(filtered, 'sort_order', 'asc');
  const [editing, setEditing] = useState(null);

  const handleDelete = async (faq) => {
    if (!window.confirm(`Delete “${faq.question}”?`)) return;
    const snapshot = rows;
    setRows((prev) => prev.filter((f) => f.id !== faq.id));
    try {
      await deleteFaq(faq.id);
      toast.success('FAQ deleted');
    } catch (err) {
      setRows(snapshot);
      toast.error(err?.message || 'Could not delete that FAQ');
    }
  };

  return (
    <>
      <PageHeader
        title="FAQs"
        count={rows.length}
        subtitle="Shown in the FAQ section of the public site, in sort order."
      >
        <Button onClick={() => setEditing('new')} disabled={editing === 'new'}>+ New FAQ</Button>
      </PageHeader>

      {editing && (
        <div className="mb-6">
          <FaqForm
            initial={editing === 'new' ? null : editing}
            onSaved={() => { setEditing(null); reload(); }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {rows.length > 0 && (
        <div className="mb-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search questions and answers…"
            resultCount={filtered.length} total={rows.length} />
        </div>
      )}

      <Panel>
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No FAQs stored yet"
            hint="Until you add some, the public site falls back to the built-in list in src/data/site.js."
            action={<Button onClick={() => setEditing('new')}>Add the first one</Button>}
          />
        ) : sorted.length === 0 ? (
          <EmptyState title={`Nothing matches “${query}”`}
            action={<Button variant="ghost" onClick={() => setQuery('')}>Clear search</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <Th sortKey="sort_order" sort={sort} onSort={toggle} className="w-16">#</Th>
                  <Th sortKey="question" sort={sort} onSort={toggle}>Question</Th>
                  <Th sortKey="category" sort={sort} onSort={toggle}>Category</Th>
                  <Th sortKey="is_published" sort={sort} onSort={toggle}>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 tabular-nums text-gray-400">{f.sort_order}</td>
                    <td className="max-w-sm truncate px-5 py-3 text-gray-900">{f.question}</td>
                    <td className="px-5 py-3 text-gray-500">{f.category || '—'}</td>
                    <td className="px-5 py-3"><StatusBadge status={f.is_published ? 'published' : 'draft'} /></td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setEditing(f)} className="text-xs text-teal-600 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(f)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
