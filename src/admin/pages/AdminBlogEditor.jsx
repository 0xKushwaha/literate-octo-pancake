import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { articleImagesReady, getArticleById, saveArticle } from '../../lib/queries/articles';
import { cleanupReplacedMedia } from '../../lib/queries/media';
import { supabase, isDemo } from '../../lib/supabase';
import RichTextEditor from '../components/RichTextEditor';
import ImageField from '../components/ImageField';
import { publishedAtFor } from '../articlePublishDate';
import { useSaveShortcut, useUnsavedChanges } from '../hooks';
import { Button, FormSkeleton } from '../components/ui';

const EMPTY = { title: '', slug: '', excerpt: '', category: '', content: '', is_published: false, is_featured: false, cover_image: '', cover_alt: '', cover_focal: '' };

const CATEGORIES = ['Anxiety', 'Depression', 'Relationships', 'Mindfulness', 'Trauma', 'Sleep', 'Psychiatry', 'Self-care'];

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AdminBlogEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState(null);

  // Whether the database can store a cover picture yet (migration 008). Asked
  // once on mount so the picture field can say so up front, and re-askable
  // from the field itself, because the usual way this gets fixed is the editor
  // running the migration in another tab and coming straight back.
  const [imagesReady, setImagesReady] = useState(null);
  const [checkingImages, setCheckingImages] = useState(false);

  const recheckImages = useCallback(async () => {
    setCheckingImages(true);
    try {
      const ok = await articleImagesReady();
      setImagesReady(ok);
      if (ok) toast.success('Pictures are set up — you can add a cover now');
      else toast('Still not there. Check the query ran without an error.', { icon: 'ℹ️' });
    } finally {
      setCheckingImages(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    articleImagesReady().then((ok) => { if (active) setImagesReady(ok); });
    return () => { active = false; };
  }, []);

  // The article's existing publish date. It has to travel with every save —
  // see src/admin/articlePublishDate.js for why.
  const [publishedAt, setPublishedAt] = useState(null);

  // What was last persisted, serialised. Comparing against this is what makes
  // the unsaved-changes prompt accurate rather than firing on every visit.
  // State, not a ref, because it is read during render to compute `dirty`.
  const [baseline, setBaseline] = useState(() => JSON.stringify(EMPTY));

  useEffect(() => {
    if (isNew) {
      setBaseline(JSON.stringify(EMPTY));
      setForm(EMPTY);
      setPublishedAt(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getArticleById(id)
      .then((a) => {
        if (!active) return;
        const loaded = {
          title: a.title ?? '',
          slug: a.slug ?? '',
          excerpt: a.excerpt ?? '',
          category: a.category ?? '',
          content: a.content ?? '',
          is_published: a.is_published ?? false,
          is_featured: a.is_featured ?? false,
          cover_image: a.cover_image ?? '',
          cover_alt: a.cover_alt ?? '',
          cover_focal: a.cover_focal ?? '',
        };
        setBaseline(JSON.stringify(loaded));
        setForm(loaded);
        setPublishedAt(a.published_at ?? null);
        setLoadError(null);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err?.message || 'Could not load that article.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, isNew]);

  const dirty = !loading && JSON.stringify(form) !== baseline;
  const allowLeaving = useUnsavedChanges(dirty && !saving);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleTitleChange = (val) => {
    set('title', val);
    if (!slugEdited) set('slug', slugify(val));
  };

  const handleSave = useCallback(async (publish) => {
    if (!form.title.trim()) { toast.error('A title is required'); return; }
    if (!form.slug.trim()) { toast.error('A slug is required — it becomes the article URL'); return; }
    setSaving(true);
    try {
      let userId = 'demo-admin';
      if (!isDemo) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? null;
      }
      const nextPublished = publish ?? form.is_published;
      const nextPublishedAt = publishedAtFor({ isPublished: nextPublished, existing: publishedAt });

      const payload = {
        ...(!isNew ? { id } : {}),
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim() || null,
        category: form.category || null,
        content: form.content,
        author_id: userId,
        is_published: nextPublished,
        published_at: nextPublishedAt,
        is_featured: form.is_featured,
        cover_image: form.cover_image.trim() || null,
        cover_alt: form.cover_alt.trim() || null,
        cover_focal: form.cover_focal || null,
      };
      const { featuredSaved, coverSaved } = await saveArticle(payload);
      if (!featuredSaved && form.is_featured) {
        toast('Saved, but "Show on homepage" needs migration 007 run in Supabase. Until then the homepage shows the newest posts.', { icon: '⚠️', duration: 8000 });
      }
      if (!coverSaved && form.cover_image.trim()) {
        toast('Saved, but the cover image needs migration 008 run in Supabase. The article is fine; the picture was not stored.', { icon: '⚠️', duration: 8000 });
      }
      setPublishedAt(nextPublishedAt);
      // Stand the guard down before navigating, or it prompts on the redirect
      // back to the list — which reads as the save having failed.
      setBaseline(JSON.stringify({ ...form, is_published: payload.is_published }));
      allowLeaving();
      toast.success(publish ? 'Article published' : 'Saved as draft');
      // Whatever picture(s) the article no longer points to — the cover, or
      // any image swapped or removed from the body in the editor above —
      // stopped being live the moment this save landed, so this is the first
      // safe moment to delete the files they used to be. Only the cover half
      // is skipped if migration 008 was not there to store it: the old cover
      // is still the live one then, not an orphan.
      const before = JSON.parse(baseline);
      cleanupReplacedMedia(before, coverSaved ? form : { ...form, cover_image: before.cover_image, cover_alt: before.cover_alt });
      navigate('/admin/blog');
    } catch (err) {
      const message = err?.code === '23505'
        ? `The slug "${form.slug}" is already used by another article.`
        : err?.message || 'Could not save that article';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [form, id, isNew, navigate, allowLeaving, publishedAt, baseline]);

  // ⌘S / Ctrl+S saves without publishing, matching every editor people already
  // use. Without it the browser's own "save page" dialog opens instead.
  useSaveShortcut(() => handleSave(false), !saving && !loading);

  if (loadError) {
    return (
      <div role="alert" className="mx-auto max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-red-700">Could not load that article</p>
        <p className="mt-2 text-sm text-gray-500">{loadError}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/admin/blog')}>
          Back to all articles
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <button
          onClick={() => navigate('/admin/blog')}
          className="text-sm text-gray-500 transition hover:text-gray-900"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">{isNew ? 'New article' : 'Edit article'}</h1>
        {dirty && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            Unsaved changes
          </span>
        )}
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Content *</label>
            {loading ? (
              <FormSkeleton />
            ) : (
              <RichTextEditor value={form.content} onChange={(html) => set('content', html)} canUpload={imagesReady !== false && !isDemo} />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Publish</h3>

            <Button
              variant="accent"
              className="w-full"
              onClick={() => handleSave(true)}
              disabled={saving || loading}
            >
              {saving ? 'Saving…' : form.is_published ? 'Update & publish' : 'Publish now'}
            </Button>
            <Button
              variant="ghost"
              className="w-full !py-1.5 !text-xs"
              onClick={() => handleSave(false)}
              disabled={saving || loading}
            >
              Save as draft (hidden from site)
            </Button>

            <p className="text-center text-[11px] text-gray-400">⌘S / Ctrl+S saves a draft</p>

            {form.is_published && (
              <p className="text-xs text-green-600">● Currently published</p>
            )}

            <label className="flex cursor-pointer items-start gap-2 border-t border-gray-100 pt-3">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => set('is_featured', e.target.checked)}
                className="mt-0.5 size-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span>
                <span className="block text-xs font-medium text-gray-700">Show on homepage</span>
                <span className="block text-[11px] text-gray-400">
                  Offers this article to the cards on the homepage. With none ticked, the newest posts show there.
                </span>
              </span>
            </label>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Picture</h3>
            <ImageField
              url={form.cover_image}
              alt={form.cover_alt}
              focal={form.cover_focal}
              aspect="16 / 9"
              minWidth={960}
              ready={imagesReady}
              canUpload={imagesReady !== false && !isDemo}
              onRecheck={recheckImages}
              checking={checkingImages}
              onChange={({ url, alt, focal }) => setForm((f) => ({ ...f, cover_image: url, cover_alt: alt, cover_focal: focal ?? f.cover_focal }))}
            />
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
    </>
  );
}
