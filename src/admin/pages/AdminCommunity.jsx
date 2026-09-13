import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  countCommunitySignups, deleteCommunitySignup, listCommunitySignups,
} from '../../lib/queries/community';
import { useSearch } from '../hooks';
import {
  Button, EmptyState, ErrorState, PageHeader, Panel, SearchInput, TableSkeleton,
} from '../components/ui';

const SEARCH_FIELDS = ['email', 'source'];

function formatWhen(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Signups since a cut-off, for the two headline numbers. */
function countSince(rows, days) {
  const cutoff = Date.now() - days * 86400000;
  return rows.filter((r) => Date.parse(r.created_at) >= cutoff).length;
}

/**
 * One row per line, quoted, so an address containing a comma cannot shift
 * every later column. Excel and Sheets both read this.
 */
function toCsv(rows) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [['Email', 'Joined from', 'When'].map(escape).join(',')];
  for (const r of rows) lines.push([r.email, r.source || '', r.created_at].map(escape).join(','));
  return lines.join('\n');
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1.5 text-3xl font-semibold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-[11.5px] text-gray-400">{hint}</p>}
    </div>
  );
}

/**
 * Who asked for the Discord invite.
 *
 * The number people actually want is "how many joined", so it leads. The list
 * underneath is the reason the email is collected at all: an invite link can
 * be revoked or rotated, and this is the only way to tell the people who
 * joined that it has.
 */
export default function AdminCommunity() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([listCommunitySignups(), countCommunitySignups()])
      .then(([list, count]) => {
        setRows(list);
        setTotal(count);
        setError(null);
      })
      .catch((err) => setError(err?.message || 'Could not load the community list.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const { query, setQuery, filtered } = useSearch(rows, SEARCH_FIELDS);

  const stats = useMemo(() => ({
    week: countSince(rows, 7),
    month: countSince(rows, 30),
  }), [rows]);

  const remove = async (row) => {
    if (!window.confirm(`Remove ${row.email} from the list? This does not remove them from Discord.`)) return;
    setBusy(row.id);
    try {
      await deleteCommunitySignup(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setTotal((n) => Math.max(0, n - 1));
      toast.success('Removed');
    } catch (err) {
      toast.error(err?.message || 'Could not remove that one.');
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `community-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    // Revoking immediately can beat the download on some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <PageHeader
        title="Community"
        count={total}
        subtitle="Everyone who left their email at the “Join our community” band and was sent to the Discord invite. The invite link itself lives in Site Content → Home page → Community."
      >
        <Button variant="ghost" onClick={exportCsv} disabled={loading || filtered.length === 0}>
          Export CSV
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Joined" value={total} hint="All time" />
        <Stat label="Last 7 days" value={stats.week} />
        <Stat label="Last 30 days" value={stats.month} />
      </div>

      {!loading && rows.length > 0 && (
        <div className="mb-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by email or page…"
            resultCount={filtered.length}
            total={rows.length}
          />
        </div>
      )}

      <Panel>
        {loading ? (
          <TableSkeleton rows={6} cols={3} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? 'Nobody has joined yet' : `Nothing matches “${query}”`}
            hint={
              rows.length === 0
                ? 'Addresses appear here as soon as someone uses the band at the foot of the site. Make sure the Discord invite link is set in Site Content → Home page → Community.'
                : 'Search covers the email address and the page they joined from.'
            }
            action={rows.length > 0 ? <Button variant="ghost" onClick={() => setQuery('')}>Clear search</Button> : null}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Joined from</th>
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-5 py-3">
                      <a href={`mailto:${r.email}`} className="text-gray-900 hover:text-teal-700 hover:underline">
                        {r.email}
                      </a>
                    </td>
                    <td className="px-5 py-3 font-mono text-[12px] text-gray-500">{r.source || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-500">{formatWhen(r.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => remove(r)}
                        disabled={busy === r.id}
                        className="text-[12px] text-gray-400 underline-offset-2 transition hover:text-red-600 hover:underline disabled:opacity-40"
                      >
                        {busy === r.id ? 'Removing…' : 'Remove'}
                      </button>
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
