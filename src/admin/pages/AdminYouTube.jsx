import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { listAllVideos, upsertVideo, deleteVideo } from '../../lib/queries/youtube';
import { isDemo } from '../../lib/supabase';
import StatusBadge from '../components/StatusBadge';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!isValidYouTubeId(form.youtube_id)) { toast.error('YouTube ID must be exactly 11 characters (just the ID, not the full URL)'); return; }
    setSaving(true);
    try {
      await upsertVideo({
        ...form,
        duration_sec: form.duration_sec ? Number(form.duration_sec) : null,
        tags: typeof form.tags === 'string' ? form.tags.split(',').map((s) => s.trim()).filter(Boolean) : form.tags,
      });
      toast.success('Saved!');
      onSave();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const thumbPreview = isValidYouTubeId(form.youtube_id)
    ? `https://img.youtube.com/vi/${form.youtube_id}/mqdefault.jpg`
    : null;

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">{initial?.id ? 'Edit video' : 'Add video'}</h3>

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
            <span className="text-sm text-gray-700">Featured (shown on homepage)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="rounded" />
            <span className="text-sm text-gray-700">Active</span>
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
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    listAllVideos().then(setVideos).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try { await deleteVideo(id); toast.success('Deleted'); setVideos((p) => p.filter((v) => v.id !== id)); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div className="p-8">
      <Toaster />
      {isDemo && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800"><strong>Demo mode</strong> — Changes persist in-memory during this session only.</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">YouTube resources</h1>
        <button onClick={() => setEditing('new')}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
          + Add video
        </button>
      </div>

      {editing && (
        <div className="mb-8">
          <VideoForm initial={editing === 'new' ? null : editing} onSave={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="h-40 flex items-center justify-center text-sm text-gray-400">Loading…</div>
        ) : videos.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-gray-400">No videos yet — add some above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Thumb</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Title</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Category</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Featured</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {videos.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <img src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" className="w-16 h-10 rounded object-cover" />
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900 max-w-xs truncate">{v.title}</td>
                  <td className="px-5 py-3 text-gray-500">{v.category || '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{v.is_featured ? '★' : '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={v.is_active ? 'active' : 'inactive'} /></td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setEditing(v)} className="text-teal-600 hover:underline text-xs">Edit</button>
                      <button onClick={() => handleDelete(v.id, v.title)} className="text-red-500 hover:underline text-xs">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
