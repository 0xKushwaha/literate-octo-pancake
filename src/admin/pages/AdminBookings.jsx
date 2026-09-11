import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { listBookings, getBookingById, updateBookingStatus } from '../../lib/queries/bookings';
import StatusBadge from '../components/StatusBadge';
import { useEscape, useList, useSearch, useSort } from '../hooks';
import {
  Button, EmptyState, ErrorState, FilterTabs, PageHeader, Panel, SearchInput, TableSkeleton, Th,
} from '../components/ui';

const STATUSES = ['all', 'pending', 'contacted', 'booked', 'declined'];
const SEARCH_FIELDS = ['reference', 'name', 'email', 'who', 'insurer'];

function maskEmail(email) {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 4))}@${domain}`;
}

function BookingDetail({ id, onClose, onStatusChange }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    getBookingById(id)
      .then((b) => { if (active) setBooking(b); })
      .catch((err) => { if (active) setLoadError(err?.message || 'Could not load this booking.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const handleStatus = async (status) => {
    const previous = booking?.status;
    setUpdating(true);
    setBooking((b) => ({ ...b, status }));
    try {
      await updateBookingStatus(id, status);
      toast.success(`Marked as ${status}`);
      // Refresh the list so the row's badge and any active status filter agree
      // with what the detail panel now shows.
      onStatusChange?.();
    } catch (err) {
      setBooking((b) => ({ ...b, status: previous }));
      toast.error(err?.message || 'Could not update the status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="h-5 w-48 rounded bg-gray-100" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-4 rounded bg-gray-100" />)}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <ErrorState message={loadError} onRetry={onClose} />
      </div>
    );
  }

  if (!booking) return null;

  const date = booking.submitted_at ? new Date(booking.submitted_at).toLocaleString() : '—';

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs text-gray-400">{booking.reference}</p>
          <h2 className="text-lg font-semibold text-gray-900 mt-0.5">{booking.name}</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close booking details"
          className="rounded p-1 text-xl leading-none text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          ×
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <div><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-900">{booking.email}</span></div>
        <div><span className="text-gray-500">Phone:</span> <span className="font-medium text-gray-900">{booking.phone || '—'}</span></div>
        <div><span className="text-gray-500">Insurance:</span> <span className="font-medium text-gray-900">{booking.insurer || '—'}</span></div>
        <div><span className="text-gray-500">Submitted:</span> <span className="font-medium text-gray-900">{date}</span></div>
        <div><span className="text-gray-500">Format:</span> <span className="font-medium text-gray-900">{booking.format || '—'}</span></div>
        <div><span className="text-gray-500">Cadence:</span> <span className="font-medium text-gray-900">{booking.cadence || '—'}</span></div>
        <div><span className="text-gray-500">Therapist pref:</span> <span className="font-medium text-gray-900">{booking.preferred_therapist || 'Any'}</span></div>
        <div><span className="text-gray-500">Preferred date:</span> <span className="font-medium text-gray-900">{booking.preferred_date || '—'} {booking.preferred_time || ''}</span></div>
      </div>

      {booking.concerns?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Concerns</p>
          <div className="flex flex-wrap gap-1.5">
            {booking.concerns.map((c) => (
              <span key={c} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Notes shown only here, not in the list — deliberate click-to-view */}
      {booking.notes && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-xs font-medium text-amber-700 mb-1">Notes from client</p>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{booking.notes}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Update status</p>
        <div className="flex flex-wrap gap-2">
          {['pending', 'contacted', 'booked', 'declined'].map((s) => (
            <button
              key={s}
              onClick={() => handleStatus(s)}
              disabled={updating || booking.status === s}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition capitalize ${
                booking.status === s
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminBookings() {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const loader = useCallback(
    () => listBookings({ status: filter === 'all' ? null : filter }),
    [filter],
  );
  const { rows, loading, error, reload } = useList(loader, [filter]);
  const { query, setQuery, filtered } = useSearch(rows, SEARCH_FIELDS);
  const { sort, toggle, sorted } = useSort(filtered, 'submitted_at', 'desc');

  useEscape(() => setSelected(null), Boolean(selected));

  return (
    <>
      <PageHeader
        title="Booking requests"
        count={rows.length}
        subtitle="Enquiries from the public booking form. Click a row to see the full submission."
      />

      <div className="mb-4 flex flex-col gap-3">
        <FilterTabs options={STATUSES} value={filter} onChange={(f) => { setFilter(f); setSelected(null); }} />
        {rows.length > 0 && (
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by reference, name, email or insurer…"
            resultCount={filtered.length}
            total={rows.length}
          />
        )}
      </div>

      {selected && (
        <div className="mb-6">
          <BookingDetail
            id={selected}
            onClose={() => setSelected(null)}
            onStatusChange={reload}
          />
        </div>
      )}

      <Panel>
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={filter === 'all' ? 'No booking requests yet' : `No ${filter} requests`}
            hint={
              filter === 'all'
                ? 'Submissions from the booking form on the public site land here.'
                : 'Try a different status filter.'
            }
            action={filter !== 'all' ? <Button variant="ghost" onClick={() => setFilter('all')}>Show all</Button> : null}
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            title={`Nothing matches \u201C${query}\u201D`}
            action={<Button variant="ghost" onClick={() => setQuery('')}>Clear search</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <Th sortKey="reference" sort={sort} onSort={toggle}>Reference</Th>
                  <Th sortKey="name" sort={sort} onSort={toggle}>Name</Th>
                  <Th>Email</Th>
                  <Th sortKey="who" sort={sort} onSort={toggle}>Service</Th>
                  <Th sortKey="submitted_at" sort={sort} onSort={toggle}>Submitted</Th>
                  <Th sortKey="status" sort={sort} onSort={toggle}>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => setSelected(selected === b.id ? null : b.id)}
                    className={`cursor-pointer transition hover:bg-gray-50 ${selected === b.id ? 'bg-teal-50' : ''}`}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{b.reference}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{b.name}</td>
                    <td className="px-5 py-3 text-gray-500">{maskEmail(b.email)}</td>
                    <td className="px-5 py-3 capitalize text-gray-500">{b.who || '\u2014'}</td>
                    <td className="px-5 py-3 tabular-nums text-gray-500">
                      {b.submitted_at ? new Date(b.submitted_at).toLocaleDateString() : '\u2014'}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs text-teal-600">
                        {selected === b.id ? 'Close' : 'View'}
                      </span>
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
