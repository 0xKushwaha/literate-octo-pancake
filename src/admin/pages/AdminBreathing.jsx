import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { listAllExercises, upsertExercise, deleteExercise } from '../../lib/queries/breathing';
import { isDemo } from '../../lib/supabase';
import StatusBadge from '../components/StatusBadge';

const EMPTY = {
  name: '', slug: '', description: '', technique: '',
  inhale_sec: 4, hold_in_sec: 0, exhale_sec: 4, hold_out_sec: 0,
  cycles: 4, benefits: [], suitable_for: [], difficulty: 'beginner',
  is_active: true, sort_order: 0,
};

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

function ExerciseForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        slug: form.slug || slugify(form.name),
        benefits: typeof form.benefits === 'string' ? form.benefits.split(',').map((s) => s.trim()).filter(Boolean) : form.benefits,
        suitable_for: typeof form.suitable_for === 'string' ? form.suitable_for.split(',').map((s) => s.trim()).filter(Boolean) : form.suitable_for,
      };
      await upsertExercise(payload);
      toast.success('Saved!');
      onSave();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const numInput = (key, label, min = 0) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type="number" min={min} value={form[key]} onChange={(e) => set(key, Number(e.target.value))}
        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">{initial?.id ? 'Edit exercise' : 'New exercise'}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
          <input type="text" value={form.name} onChange={(e) => { set('name', e.target.value); if (!form.id) set('slug', slugify(e.target.value)); }}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Technique label</label>
          <input type="text" value={form.technique} onChange={(e) => set('technique', e.target.value)} placeholder="e.g. box, 4-7-8"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {numInput('inhale_sec', 'Inhale (s)', 1)}
        {numInput('hold_in_sec', 'Hold in (s)')}
        {numInput('exhale_sec', 'Exhale (s)', 1)}
        {numInput('hold_out_sec', 'Hold out (s)')}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {numInput('cycles', 'Cycles', 1)}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Difficulty</label>
          <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        {numInput('sort_order', 'Sort order')}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Benefits (comma-separated)</label>
          <input type="text" value={Array.isArray(form.benefits) ? form.benefits.join(', ') : form.benefits} onChange={(e) => set('benefits', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Suitable for (comma-separated)</label>
          <input type="text" value={Array.isArray(form.suitable_for) ? form.suitable_for.join(', ') : form.suitable_for} onChange={(e) => set('suitable_for', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="rounded" />
        <span className="text-sm text-gray-700">Active (visible on site)</span>
      </label>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save exercise'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminBreathing() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | exercise object

  const load = () => {
    setLoading(true);
    listAllExercises()
      .then(setExercises)
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await deleteExercise(id); toast.success('Deleted'); setExercises((p) => p.filter((e) => e.id !== id)); }
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
        <h1 className="text-2xl font-semibold text-gray-900">Breathing exercises</h1>
        <button onClick={() => setEditing('new')}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
          + New exercise
        </button>
      </div>

      {editing && (
        <div className="mb-8">
          <ExerciseForm
            initial={editing === 'new' ? null : editing}
            onSave={() => { setEditing(null); load(); }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="h-40 flex items-center justify-center text-sm text-gray-400">Loading…</div>
        ) : exercises.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-gray-400">No exercises yet. The site uses built-in defaults.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Name</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Timing</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Difficulty</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exercises.map((ex) => (
                <tr key={ex.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{ex.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">
                    {ex.inhale_sec}s·{ex.hold_in_sec}s·{ex.exhale_sec}s·{ex.hold_out_sec}s × {ex.cycles}
                  </td>
                  <td className="px-5 py-3 text-gray-600 capitalize">{ex.difficulty}</td>
                  <td className="px-5 py-3"><StatusBadge status={ex.is_active ? 'active' : 'inactive'} /></td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setEditing(ex)} className="text-teal-600 hover:underline text-xs">Edit</button>
                      <button onClick={() => handleDelete(ex.id, ex.name)} className="text-red-500 hover:underline text-xs">Delete</button>
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
