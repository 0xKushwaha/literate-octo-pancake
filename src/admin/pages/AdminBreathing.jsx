import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { listAllExercises, upsertExercise, deleteExercise } from '../../lib/queries/breathing';
import StatusBadge from '../components/StatusBadge';
import { useEscape, useList, useSaveShortcut, useSearch, useSort, useUnsavedChanges } from '../hooks';
import {
  Button, EmptyState, ErrorState, PageHeader, Panel, SearchInput, TableSkeleton, Th,
} from '../components/ui';

const SEARCH_FIELDS = ['name', 'slug', 'technique', 'difficulty', 'description'];

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

  const dirty = JSON.stringify(form) !== JSON.stringify(initial ?? EMPTY);
  useUnsavedChanges(dirty && !saving);

  const save = useCallback(async () => {
    if (!form.name.trim()) { toast.error('A name is required'); return; }
    // The timings drive an animation loop on the public site; a zero inhale or
    // exhale would leave it stuck on a phase that never advances.
    if (Number(form.inhale_sec) < 1 || Number(form.exhale_sec) < 1) {
      toast.error('Inhale and exhale must each be at least 1 second');
      return;
    }
    const toList = (v) =>
      typeof v === 'string' ? v.split(',').map((x) => x.trim()).filter(Boolean) : (v ?? []);

    setSaving(true);
    try {
      await upsertExercise({
        ...form,
        slug: form.slug || slugify(form.name),
        benefits: toList(form.benefits),
        suitable_for: toList(form.suitable_for),
      });
      toast.success(initial?.id ? 'Exercise updated' : 'Exercise created');
      onSave();
    } catch (err) {
      toast.error(err?.message || 'Could not save that exercise');
    } finally {
      setSaving(false);
    }
  }, [form, initial, onSave]);

  useSaveShortcut(save, !saving);
  useEscape(() => { if (!dirty) onCancel(); }, true);

  const handleSubmit = (e) => { e.preventDefault(); save(); };

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
  const { rows, setRows, loading, error, reload } = useList(listAllExercises);
  const { query, setQuery, filtered } = useSearch(rows, SEARCH_FIELDS);
  const { sort, toggle, sorted } = useSort(filtered, 'sort_order', 'asc');
  const [editing, setEditing] = useState(null);

  const handleDelete = async (exercise) => {
    if (!window.confirm(`Delete \u201C${exercise.name}\u201D?`)) return;
    const snapshot = rows;
    setRows((prev) => prev.filter((e) => e.id !== exercise.id));
    try {
      await deleteExercise(exercise.id);
      toast.success('Exercise deleted');
    } catch (err) {
      setRows(snapshot);
      toast.error(err?.message || 'Could not delete that exercise');
    }
  };

  /** Total seconds for one full cycle — the number that decides how it feels. */
  const cycleSeconds = (e) =>
    Number(e.inhale_sec || 0) + Number(e.hold_in_sec || 0) +
    Number(e.exhale_sec || 0) + Number(e.hold_out_sec || 0);

  const active = rows.filter((e) => e.is_active).length;

  return (
    <>
      <PageHeader
        title="Breathing exercises"
        count={rows.length}
        subtitle={rows.length ? `${active} live on the public site` : null}
      >
        <Button onClick={() => setEditing('new')} disabled={editing === 'new'}>+ New exercise</Button>
      </PageHeader>

      {editing && (
        <div className="mb-6">
          <ExerciseForm
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
            placeholder="Search by name, technique or difficulty…"
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
            title="No exercises yet"
            hint="Active exercises drive the guided breathing player on the public site."
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
                  <Th sortKey="sort_order" sort={sort} onSort={toggle} className="w-16">#</Th>
                  <Th sortKey="name" sort={sort} onSort={toggle}>Name</Th>
                  <Th>Pattern</Th>
                  <Th sortKey="difficulty" sort={sort} onSort={toggle}>Difficulty</Th>
                  <Th sortKey="is_active" sort={sort} onSort={toggle}>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 tabular-nums text-gray-400">{e.sort_order}</td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-gray-900">{e.name}</span>
                      <span className="ml-2 font-mono text-[11px] text-gray-400">{e.slug}</span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs tabular-nums text-gray-500">
                      {e.inhale_sec}-{e.hold_in_sec}-{e.exhale_sec}-{e.hold_out_sec}
                      <span className="ml-2 font-sans text-gray-400">
                        {e.cycles}\u00D7 &middot; {Math.round((cycleSeconds(e) * e.cycles) / 6) / 10} min
                      </span>
                    </td>
                    <td className="px-5 py-3 capitalize text-gray-500">{e.difficulty}</td>
                    <td className="px-5 py-3"><StatusBadge status={e.is_active ? 'active' : 'inactive'} /></td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setEditing(e)} className="text-xs text-teal-600 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(e)} className="text-xs text-red-500 hover:underline">Delete</button>
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
