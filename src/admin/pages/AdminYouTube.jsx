import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { listAllVideos, upsertVideo, deleteVideo } from '../../lib/queries/youtube';
import StatusBadge from '../components/StatusBadge';
import { useEscape, useList, useSaveShortcut, useSearch, useSort, useUnsavedChanges } from '../hooks';
import {
  Button, EmptyState, ErrorState, PageHeader, Panel, SearchInput, TableSkeleton, Th,
} from '../components/ui';

const SEARCH_FIELDS = ['title', 'category', 'youtube_id', 'curator_note'];

const CATEGORIES = ['Anxiety', 'Depression', 'Mindfulness', 'Sleep', 'Relationships', 'Trauma', 'Self-care', 'Psychiatry'];

const EMPTY = {
  title: '', youtube_id: '', description: '', category: '', curator_note: '',
  duration_sec: '', tags: [], is_featured: false, is_active: true, sort_order: 0,
};

function isValidYouTubeId(id) { return /^[A-Za-z0-9_-]{11}$/.test(id); }

function VideoForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const dirty = JSON.stringify(form) !== JSON.stringify(initial ?? EMPTY);
  useUnsavedChanges(dirty && !saving);

  const save = useCallback(async () => {
    if (!form.title.trim()) { toast.error('A title is required'); return; }
    if (!isValidYouTubeId(form.youtube_id)) {
      toast.error('The YouTube ID is the 11 characters after v= — not the whole URL');
      return;
    }
    setSaving(true);
    try {
      await upsertVideo({
        ...form,
        duration_sec: form.duration_sec ? Number(form.duration_sec) : null,
        tags: typeof form.tags === 'string' ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : form.tags,
      });
      toast.success(initial?.id ? 'Video updated' : 'Video added');
      onSave();
    } catch (err) {
      toast.error(err?.message || 'Could not save that video');
    } finally {
      setSaving(false);
    }
  }, [form, initial, onSave]);

  useSaveShortcut(save, !saving);
  useEscape(() => { if (!dirty) onCancel(); }, true);

  const handleSubmit = (e) => { e.preventDefault(); save(); };

  const thumbPreview = isValidYouTubeId(form.youtube_id)
    ? `https://img.youtube.com/vi/${form.youtube_id}/mqdefault.jpg`
    : null;

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">{initial?.id ? 'Edit video' : 'Add video'}</h2>
        {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
          <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">YouTube ID * (e.g. dQw4w9WgXcQ)</label>
          <input type="text" value={form.youtube_id} onChange={(e) => set('youtube_id', e.target.value.trim())} maxLength={11} placeholder="11-character ID"
            className={`w-full rounded-lg border px-3 py-1.5 text-sm font-mono outline-none focus:ring-1 ${isValidYouTubeId(form.youtube_id) ? 'border-green-400 focus:border-green-400 focus:ring-green-400' : 'border-gray-300 focus:border-teal-500 focus:ring-teal-500'}`} />
          {thumbPreview && <img src={thumbPreview} alt="preview" className="mt-2 rounded-lg w-32 h-auto opacity-90" />}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
            <option value="">— none —</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Duration (seconds)</label>
          <input type="number" min={0} value={form.duration_sec} onChange={(e) => set('duration_sec', e.target.value)} placeholder="e.g. 367"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Curator note (why you recommend it)</label>
        <textarea value={form.curator_note} onChange={(e) => set('curator_note', e.target.value)} rows={2}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tags (comma-separated)</label>
        <input type="text" value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags} onChange={(e) => set('tags', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sort order</label>
          <input type="number" min={0} value={form.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
        </div>
        <div className="flex flex-col gap-2 justify-center pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} className="rounded" />
            <span className="text-sm text-gray-700">Show on homepage (also shown first on the Resources page)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="rounded" />
            <span className="text-sm text-gray-700">Active (visible on the site)</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save video'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}

export default function AdminYouTube() {
  const { rows, setRows, loading, error, reload } = useList(listAllVideos);
  const { query, setQuery, filtered } = useSearch(rows, SEARCH_FIELDS);
  const { sort, toggle, sorted } = useSort(filtered, 'sort_order', 'asc');
  const [editing, setEditing] = useState(null);

  const handleDelete = async (video) => {
    if (!window.confirm(`Delete \u201C${video.title}\u201D?`)) return;
    const snapshot = rows;
    setRows((prev) => prev.filter((v) => v.id !== video.id));
    try {
      await deleteVideo(video.id);
      toast.success('Video deleted');
    } catch (err) {
      setRows(snapshot);
      toast.error(err?.message || 'Could not delete that video');
    }
  };

  const featured = rows.filter((v) => v.is_featured).length;
  const active = rows.filter((v) => v.is_active).length;

  return (
    <>
      <PageHeader
        title="YouTube resources"
        count={rows.length}
        subtitle={rows.length ? `${active} live on the Resources page · ${featured} shown first` : null}
      >
        <Button onClick={() => setEditing('new')} disabled={editing === 'new'}>+ Add video</Button>
      </PageHeader>

      {editing && (
        <div className="mb-6">
          <VideoForm
            initial={editing === 'new' ? null : editing}
            onSave={() => { setEditing(null); reload(); }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {rows.length > 0 && (
        <div className="mb-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search titles, categories and notes…"
            resultCount={filtered.length}
            total={rows.length}
          />
        </div>
      )}

      <Panel>
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No videos yet"
            hint="Featured videos appear in the Resources section of the public site."
            action={<Button onClick={() => setEditing('new')}>Add the first one</Button>}
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            title={`Nothing matches \u201C${query}\u201D`}
            action={<Button variant="ghost" onClick={() => setQuery('')}>Clear search</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <Th className="w-24">Thumb</Th>
                  <Th sortKey="title" sort={sort} onSort={toggle}>Title</Th>
                  <Th sortKey="category" sort={sort} onSort={toggle}>Category</Th>
                  <Th sortKey="is_featured" sort={sort} onSort={toggle}>Homepage</Th>
                  <Th sortKey="is_active" sort={sort} onSort={toggle}>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <img
                        src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`}
                        alt=""
                        loading="lazy"
                        width="64"
                        height="40"
                        className="h-10 w-16 rounded bg-gray-100 object-cover"
                      />
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 font-medium text-gray-900">{v.title}</td>
                    <td className="px-5 py-3 text-gray-500">{v.category || '\u2014'}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {v.is_featured ? <span title="On the homepage, and first on the Resources page">★</span> : '\u2014'}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={v.is_active ? 'active' : 'inactive'} /></td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setEditing(v)} className="text-xs text-teal-600 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(v)} className="text-xs text-red-500 hover:underline">Delete</button>
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
