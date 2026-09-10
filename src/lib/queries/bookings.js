import { supabase, isDemo } from '../supabase';
import { demoBookings } from '../demoData';

export async function submitBooking(form, reference) {
  if (isDemo) return demoBookings.submit(form, reference);

  const { error } = await supabase.from('booking_submissions').insert({
    reference,
    concerns: form.concerns ?? [],
    who: form.who ?? null,
    format: form.format ?? null,
    cadence: form.cadence ?? null,
    preferred_therapist: form.therapist === 'any' || !form.therapist ? null : form.therapist,
    preferred_date: form.date ?? null,
    preferred_time: form.time ?? null,
    name: form.name,
    email: form.email,
    phone: form.phone || null,
    insurer: form.insurer ?? null,
    notes: form.notes || null,
  });
  if (error) throw error;
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
