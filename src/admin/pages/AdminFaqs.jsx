import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { listAllFaqs, upsertFaq, deleteFaq } from '../../lib/queries/faqs';
import { isDemo } from '../../lib/supabase';
import StatusBadge from '../components/StatusBadge';

const EMPTY = { question: '', answer: '', category: '', sort_order: 0, is_published: true };

function FaqForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) { toast.error('Question and answer are required'); return; }
    setSaving(true);
    try {
      await upsertFaq(form);
      toast.success('Saved');
      onSave();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">{initial?.id ? 'Edit FAQ' : 'New FAQ'}</h3>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Question *</label>
        <input type="text" value={form.question} onChange={(e) => set('question', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Answer *</label>
        <textarea value={form.answer} onChange={(e) => set('answer', e.target.value)} rows={4}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <input type="text" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Pricing"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sort order</label>
          <input type="number" min={0} value={form.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
        </div>
        <div className="flex items-center pt-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_published} onChange={(e) => set('is_published', e.target.checked)} className="rounded" />
            <span className="text-sm text-gray-700">Published</span>
          </label>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save FAQ'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}

export default function AdminFaqs() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    listAllFaqs().then(setFaqs).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id, q) => {
    if (!window.confirm(`Delete this FAQ?`)) return;
    try { await deleteFaq(id); toast.success('Deleted'); setFaqs((p) => p.filter((f) => f.id !== id)); }
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
        <h1 className="text-2xl font-semibold text-gray-900">FAQs</h1>
        <button onClick={() => setEditing('new')}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
          + New FAQ
        </button>
      </div>

      {editing && (
        <div className="mb-8">
          <FaqForm initial={editing === 'new' ? null : editing} onSave={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="h-40 flex items-center justify-center text-sm text-gray-400">Loading…</div>
        ) : faqs.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-gray-400">No FAQs yet. The site uses built-in defaults.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Question</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Category</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {faqs.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-900 max-w-sm truncate">{f.question}</td>
                  <td className="px-5 py-3 text-gray-500">{f.category || '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={f.is_published ? 'published' : 'draft'} /></td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setEditing(f)} className="text-teal-600 hover:underline text-xs">Edit</button>
                      <button onClick={() => handleDelete(f.id, f.question)} className="text-red-500 hover:underline text-xs">Delete</button>
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
