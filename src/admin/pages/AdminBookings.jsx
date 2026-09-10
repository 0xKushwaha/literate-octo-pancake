import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { listBookings, getBookingById, updateBookingStatus } from '../../lib/queries/bookings';
import { isDemo } from '../../lib/supabase';
import StatusBadge from '../components/StatusBadge';

const STATUSES = ['all', 'pending', 'contacted', 'booked', 'declined'];

function maskEmail(email) {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 4))}@${domain}`;
}

function BookingDetail({ id, onClose }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    getBookingById(id)
      .then(setBooking)
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatus = async (status) => {
    setUpdating(true);
    try {
      await updateBookingStatus(id, status);
      setBooking((b) => ({ ...b, status }));
      toast.success(`Marked as ${status}`);
    } catch { toast.error('Update failed'); }
    finally { setUpdating(false); }
  };

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;
  if (!booking) return null;

  const date = booking.submitted_at ? new Date(booking.submitted_at).toLocaleString() : '—';

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs text-gray-400">{booking.reference}</p>
          <h2 className="text-lg font-semibold text-gray-900 mt-0.5">{booking.name}</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
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
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    listBookings({ status: filter === 'all' ? null : filter })
      .then(setBookings)
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="p-8">
      <Toaster />
      {isDemo && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800"><strong>Demo mode</strong> — Showing sample booking data. Changes persist in-memory during this session only.</p>
        </div>
      )}
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Booking requests</h1>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${
              filter === s ? 'bg-gray-900 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {selected && (
        <div className="mb-8">
          <BookingDetail id={selected} onClose={() => setSelected(null)} />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">Loading…</div>
        ) : bookings.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">
            No {filter !== 'all' ? filter : ''} bookings yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Reference</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Name</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Email</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Service</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <tr key={b.id} className={`hover:bg-gray-50 ${selected === b.id ? 'bg-teal-50' : ''}`}>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{b.reference}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{b.name}</td>
                  <td className="px-5 py-3 text-gray-500">{maskEmail(b.email)}</td>
                  <td className="px-5 py-3 text-gray-500 capitalize">{b.who || '—'}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {b.submitted_at ? new Date(b.submitted_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setSelected(selected === b.id ? null : b.id)}
                      className="text-teal-600 hover:underline text-xs"
                    >
                      {selected === b.id ? 'Close' : 'View'}
                    </button>
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
