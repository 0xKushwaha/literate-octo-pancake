import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listAllArticles, deleteArticle } from '../../lib/queries/articles';
import StatusBadge from '../components/StatusBadge';
import { useList, useSearch, useSort } from '../hooks';
import {
  Button, EmptyState, ErrorState, PageHeader, Panel, SearchInput, TableSkeleton, Th,
} from '../components/ui';

const SEARCH_FIELDS = ['title', 'slug', 'category'];

export default function AdminBlog() {
  const { rows, setRows, loading, error, reload } = useList(listAllArticles);
  const { query, setQuery, filtered } = useSearch(rows, SEARCH_FIELDS);
  const { sort, toggle, sorted } = useSort(filtered, 'updated_at', 'desc');

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
    const snapshot = rows;
    // Optimistic: the row goes immediately and comes back if the delete failed,
    // which is far less jarring than a table that sits still for a second.
    setRows((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteArticle(id);
      toast.success(`Deleted “${title}”`);
    } catch (err) {
      setRows(snapshot);
      toast.error(err?.message || 'Could not delete that article');
    }
  };

  const published = rows.filter((a) => a.is_published).length;

  return (
    <>
      <PageHeader
        title="Blog"
        count={rows.length}
        subtitle={rows.length ? `${published} published, ${rows.length - published} draft` : null}
      >
        <Link
          to="/admin/blog/new"
          className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          + New article
        </Link>
      </PageHeader>

      {rows.length > 0 && (
        <div className="mb-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by title, slug or category…"
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
            title="No articles yet"
            hint="Posts you publish here appear on the public blog and in the homepage carousel."
            action={
              <Link to="/admin/blog/new" className="text-sm text-teal-600 hover:underline">
                Write the first one →
              </Link>
            }
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            title={`Nothing matches “${query}”`}
            hint="Try a shorter search, or clear it to see every article."
            action={<Button variant="ghost" onClick={() => setQuery('')}>Clear search</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <Th sortKey="title" sort={sort} onSort={toggle}>Title</Th>
                  <Th sortKey="category" sort={sort} onSort={toggle}>Category</Th>
                  <Th sortKey="is_published" sort={sort} onSort={toggle}>Status</Th>
                  <Th sortKey="updated_at" sort={sort} onSort={toggle}>Updated</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="max-w-xs truncate px-5 py-4 font-medium text-gray-900">
                      <Link to={`/admin/blog/${a.id}`} className="hover:text-teal-700 hover:underline">
                        {a.title}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{a.category || '—'}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={a.is_published ? 'published' : 'draft'} />
                    </td>
                    <td className="px-5 py-4 tabular-nums text-gray-500">
                      {a.updated_at ? new Date(a.updated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link to={`/admin/blog/${a.id}`} className="text-xs text-teal-600 hover:underline">Edit</Link>
                        <button
                          onClick={() => handleDelete(a.id, a.title)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
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
