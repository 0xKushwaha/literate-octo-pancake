import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { listAllArticles, deleteArticle } from '../../lib/queries/articles';
import { isDemo } from '../../lib/supabase';
import StatusBadge from '../components/StatusBadge';

export default function AdminBlog() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listAllArticles()
      .then(setArticles)
      .catch(() => toast.error('Failed to load articles'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteArticle(id);
      toast.success('Article deleted');
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error('Failed to delete article');
    }
  };

  return (
    <div className="p-8">
      <Toaster />
      {isDemo && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800"><strong>Demo mode</strong> — Changes persist in-memory during this session only.</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Blog</h1>
          <p className="mt-1 text-sm text-gray-500">{articles.length} articles</p>
        </div>
        <Link
          to="/admin/blog/new"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          + New article
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-gray-400 text-sm">Loading…</div>
        ) : articles.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <p className="text-sm text-gray-400">No articles yet</p>
            <Link to="/admin/blog/new" className="text-sm text-teal-600 hover:underline">Write the first one →</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Title</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Category</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Updated</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {articles.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium text-gray-900 max-w-xs truncate">{a.title}</td>
                  <td className="px-5 py-4 text-gray-600">{a.category || '—'}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={a.is_published ? 'published' : 'draft'} />
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    {a.updated_at ? new Date(a.updated_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link to={`/admin/blog/${a.id}`} className="text-teal-600 hover:underline text-xs">Edit</Link>
                      <button onClick={() => handleDelete(a.id, a.title)} className="text-red-500 hover:underline text-xs">Delete</button>
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
