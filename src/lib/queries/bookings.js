import { supabase, isDemo } from '../supabase';
import { demoBookings } from '../demoData';

/**
 * Thrown when the server rejected the submission for a reason worth showing the
 * visitor — a field it did not accept, or too many attempts. `fields` carries
 * per-field messages the dialog can attach to the right input.
 */
export class BookingError extends Error {
  constructor(message, { fields = null, retryAfter = null } = {}) {
    super(message);
    this.name = 'BookingError';
    this.fields = fields;
    this.retryAfter = retryAfter;
  }
}

/**
 * Submits the intake form.
 *
 * Goes to /api/booking rather than straight to Supabase: the table holds
 * free-text mental-health disclosures, and the validation, bot checks, rate
 * limit and reference all have to happen somewhere the submitter cannot edit.
 * Migration 006 removed the anonymous INSERT policy, so this is the only path.
 *
 * Returns the server-issued reference.
 */
export async function submitBooking(form, meta = {}) {
  if (isDemo) {
    const reference = `LM-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
    demoBookings.submit(form, reference);
    return reference;
  }

  let response;
  try {
    response = await fetch('/api/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concerns: form.concerns ?? [],
        who: form.who ?? null,
        format: form.format ?? null,
        cadence: form.cadence ?? null,
        therapist: form.therapist ?? null,
        date: form.date ?? null,
        time: form.time ?? null,
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        insurer: form.insurer ?? null,
        notes: form.notes || null,
        consent: Boolean(form.consent),
        // Bot signals. Checked here for instant feedback and again on the
        // server, which is the copy that counts.
        company: form.company ?? '',
        elapsedMs: meta.elapsedMs ?? null,
      }),
    });
  } catch {
    throw new BookingError('We could not reach the booking service. Check your connection, or call us directly.');
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    /* a non-JSON error page; fall through to the status check below */
  }

  if (response.status === 429) {
    throw new BookingError(
      payload.error ?? 'Too many attempts. Please wait a moment, or call us directly.',
      { retryAfter: Number(response.headers.get('Retry-After')) || null },
    );
  }

  if (!response.ok) {
    throw new BookingError(payload.error ?? 'Something went wrong. Please try again or call us directly.', {
      fields: payload.fields ?? null,
    });
  }

  if (!payload.reference) {
    throw new BookingError('Something went wrong. Please try again or call us directly.');
  }

  return payload.reference;
}

// Admin only
export async function listBookings({ status = null } = {}) {
  if (isDemo) return demoBookings.list({ status });

  let query = supabase
    .from('booking_submissions')
    .select('id, reference, name, email, concerns, who, format, preferred_date, preferred_time, insurer, status, submitted_at, contacted_at')
    .order('submitted_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getBookingById(id) {
  if (isDemo) return demoBookings.getById(id);

  const { data, error } = await supabase
    .from('booking_submissions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateBookingStatus(id, status) {
  if (isDemo) return demoBookings.updateStatus(id, status);

  const update = { status };
  if (status === 'contacted') update.contacted_at = new Date().toISOString();

  const { error } = await supabase
    .from('booking_submissions')
    .update(update)
    .eq('id', id);
  if (error) throw error;
}
