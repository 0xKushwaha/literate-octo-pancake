import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { getArticleById, upsertArticle } from '../../lib/queries/articles';
import { supabase, isDemo } from '../../lib/supabase';
import RichTextEditor from '../components/RichTextEditor';

const CATEGORIES = ['Anxiety', 'Depression', 'Relationships', 'Mindfulness', 'Trauma', 'Sleep', 'Psychiatry', 'Self-care'];

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AdminBlogEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', slug: '', excerpt: '', category: '', content: '', is_published: false,
  });
  const [saving, setSaving] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (!isNew) {
      getArticleById(id)
        .then((a) => setForm({
          title: a.title ?? '',
          slug: a.slug ?? '',
          excerpt: a.excerpt ?? '',
          category: a.category ?? '',
          content: a.content ?? '',
          is_published: a.is_published ?? false,
        }))
        .catch(() => toast.error('Failed to load article'));
    }
  }, [id, isNew]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleTitleChange = (val) => {
    set('title', val);
    if (!slugEdited) set('slug', slugify(val));
  };

  const handleSave = async (publish) => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.slug.trim()) { toast.error('Slug is required'); return; }
    setSaving(true);
    try {
      let userId = 'demo-admin';
      if (!isDemo) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? null;
      }
      const payload = {
        ...(!isNew ? { id } : {}),
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim() || null,
        category: form.category || null,
        content: form.content,
        author_id: userId,
        is_published: publish ?? form.is_published,
        ...(publish && !form.is_published ? { published_at: new Date().toISOString() } : {}),
      };
      await upsertArticle(payload);
      toast.success(publish ? 'Article published!' : 'Saved as draft');
      navigate('/admin/blog');
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <Toaster />
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/admin/blog')} className="text-sm text-gray-500 hover:text-gray-900">← Back</button>
        <h1 className="text-2xl font-semibold text-gray-900">{isNew ? 'New article' : 'Edit article'}</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* Main content */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Article title…"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
            <textarea
              value={form.excerpt}
              onChange={(e) => set('excerpt', e.target.value)}
              rows={2}
              placeholder="Brief summary shown in the blog listing…"
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
            <RichTextEditor value={form.content} onChange={(html) => set('content', html)} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Publish</h3>

            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : form.is_published ? 'Update & publish' : 'Publish now'}
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="w-full rounded-lg border border-gray-300 px-4 py-1.5 text-xs text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Save as draft (hidden from site)
            </button>

            {form.is_published && (
              <p className="text-xs text-green-600">● Published</p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Settings</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Slug (URL)</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => { setSlugEdited(true); set('slug', slugify(e.target.value)); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 outline-none font-mono focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              <p className="mt-1 text-[11px] text-gray-400">/blog/{form.slug || '…'}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              >
                <option value="">— none —</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
