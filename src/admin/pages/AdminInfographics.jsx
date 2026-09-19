import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  infographicsReady, listAllInfographics, upsertInfographic, deleteInfographic,
} from '../../lib/queries/infographics';
import { isDemo } from '../../lib/supabase';
import ImageField from '../components/ImageField';
import StatusBadge from '../components/StatusBadge';
import { useEscape, useList, useSaveShortcut, useSearch, useSort, useUnsavedChanges } from '../hooks';
import {
  Button, EmptyState, ErrorState, PageHeader, Panel, SearchInput, TableSkeleton, Th,
} from '../components/ui';

const SEARCH_FIELDS = ['title', 'category', 'description'];

const CATEGORIES = ['Getting Started', 'Anxiety', 'Depression', 'Mindfulness', 'Sleep', 'Relationships', 'Trauma', 'Self-care'];

const EMPTY = {
  title: '', description: '', image_url: '', image_alt: '', category: '',
  is_active: true, sort_order: 0,
};

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500';

function InfographicForm({ initial, onSave, onCancel, ready, checking, onRecheck }) {
  const [form, setForm] = useState(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const dirty = JSON.stringify(form) !== JSON.stringify(initial ?? EMPTY);
  useUnsavedChanges(dirty && !saving);

  const save = useCallback(async () => {
    if (!form.title.trim()) { toast.error('A title is required'); return; }
    // The picture is the whole point of an infographic, so an empty one is not
    // a draft, it is a broken card on the public page.
    if (!form.image_url) { toast.error('An infographic needs its image'); return; }
    if (!form.image_alt?.trim()) {
      toast.error('Describe the image. An infographic carries its meaning in the picture, so without this a screen reader gets nothing.');
      return;
    }
    setSaving(true);
    try {
      await upsertInfographic({ ...form, sort_order: Number(form.sort_order) || 0 });
      toast.success(initial?.id ? 'Infographic updated' : 'Infographic added');
      onSave();
    } catch (err) {
      toast.error(err?.message || 'Could not save that infographic');
    } finally {
      setSaving(false);
    }
  }, [form, initial, onSave]);

  useSaveShortcut(save, !saving);
  useEscape(() => { if (!dirty) onCancel(); }, true);

  const handleSubmit = (e) => { e.preventDefault(); save(); };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">{initial?.id ? 'Edit infographic' : 'Add infographic'}</h2>
        {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
      </div>

      <ImageField
        url={form.image_url}
        alt={form.image_alt}
        onChange={({ url, alt }) => setForm((f) => ({ ...f, image_url: url, image_alt: alt }))}
        folder="infographics"
        label="The infographic *"
        hint="The picture itself. Tall images are fine: the card shows the top and the full thing opens when someone clicks it."
        ready={ready !== false}
        canUpload={ready !== false && !isDemo}
        checking={checking}
        onRecheck={onRecheck}
      />

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Title *</label>
        <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Text</label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className={`${inputCls} resize-none`}
          placeholder="What this shows, and why it is worth a minute." />
        <p className="mt-1 text-xs text-gray-400">Shown under the title on the card. Keep it to a sentence or two.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Category</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
            <option value="">— none —</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Sort order</label>
          <input type="number" min={0} value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} className={inputCls} />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="rounded" />
        <span className="text-sm text-gray-700">Active (visible on the Resources page)</span>
      </label>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save infographic'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}

export default function AdminInfographics() {
  const { rows, setRows, loading, error, reload } = useList(listAllInfographics);
  const { query, setQuery, filtered } = useSearch(rows, SEARCH_FIELDS);
  const { sort, toggle, sorted } = useSort(filtered, 'sort_order', 'asc');
  const [editing, setEditing] = useState(null);

  // Whether migration 011 has been run. `null` means the check itself failed,
  // which is treated as ready so a network blip never nags about a migration
  // that is already in place.
  const [ready, setReady] = useState(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(() => {
    setChecking(true);
    infographicsReady()
      .then(setReady)
      .catch(() => setReady(null))
      .finally(() => setChecking(false));
  }, []);

  useEffect(check, [check]);

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete \u201C${item.title}\u201D?`)) return;
    const snapshot = rows;
    setRows((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await deleteInfographic(item.id);
      toast.success('Infographic deleted');
    } catch (err) {
      setRows(snapshot);
      toast.error(err?.message || 'Could not delete that infographic');
    }
  };

  const active = rows.filter((i) => i.is_active).length;

  return (
    <>
      <PageHeader
        title="Infographics"
        count={rows.length}
        subtitle={rows.length ? `${active} live on the Resources page` : null}
      >
        <Button onClick={() => setEditing('new')} disabled={editing === 'new'}>+ Add infographic</Button>
      </PageHeader>

      {ready === false && (
        <div role="alert" className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            One setup step left: run <code className="font-mono">database/migrations/011_infographics.sql</code> in
            the Supabase SQL editor. Until then nothing here can be saved, and the Resources page simply leaves the
            section out.
          </p>
          <button onClick={check} disabled={checking}
            className="mt-2 text-xs font-medium text-amber-900 underline disabled:opacity-50">
            {checking ? 'Checking…' : 'I have run it — check again'}
          </button>
        </div>
      )}

      {editing && (
        <div className="mb-6">
          <InfographicForm
            initial={editing === 'new' ? null : editing}
            onSave={() => { setEditing(null); reload(); }}
            onCancel={() => setEditing(null)}
            ready={ready}
            checking={checking}
            onRecheck={check}
          />
        </div>
      )}

      {rows.length > 0 && (
        <div className="mb-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search titles, categories and text…"
            resultCount={filtered.length}
            total={rows.length}
          />
        </div>
      )}

      <Panel>
        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No infographics yet"
            hint="A picture and a sentence or two. They appear in their own section on the Resources page."
            action={<Button onClick={() => setEditing('new')}>Add the first one</Button>}
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            title={`Nothing matches \u201C${query}\u201D`}
            action={<Button variant="ghost" onClick={() => setQuery('')}>Clear search</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <Th className="w-24">Image</Th>
                  <Th sortKey="title" sort={sort} onSort={toggle}>Title</Th>
                  <Th sortKey="category" sort={sort} onSort={toggle}>Category</Th>
                  <Th sortKey="is_active" sort={sort} onSort={toggle}>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <img src={i.image_url} alt="" loading="lazy" width="64" height="40"
                        className="h-10 w-16 rounded bg-gray-100 object-cover" />
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 font-medium text-gray-900">{i.title}</td>
                    <td className="px-5 py-3 text-gray-500">{i.category || '\u2014'}</td>
                    <td className="px-5 py-3"><StatusBadge status={i.is_active ? 'active' : 'inactive'} /></td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setEditing(i)} className="text-xs text-teal-600 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(i)} className="text-xs text-red-500 hover:underline">Delete</button>
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
