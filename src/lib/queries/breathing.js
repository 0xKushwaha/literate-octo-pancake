import { supabase, isDemo } from '../supabase';
import { demoExercises } from '../demoData';

export async function listActiveExercises() {
  if (isDemo) return demoExercises.listActive();

  const { data, error } = await supabase
    .from('breathing_exercises')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

/**
 * The exercises offered to the homepage band: the ones ticked "Show on
 * homepage" in the admin, in sort order. Falls back to the first active
 * exercises when nothing is ticked — or when migration 007 has not been run,
 * so the column is not there yet.
 */
export async function getHomepageExercises(limit = 3) {
  if (limit < 1) return [];
  if (isDemo) return demoExercises.listHomepage(limit);

  try {
    const { data, error } = await supabase
      .from('breathing_exercises')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('sort_order')
      .limit(limit);
    if (error) throw error;
    if (data?.length) return data;
  } catch (err) {
    console.warn('[lumen] homepage picks unavailable, falling back to the first active exercises', err);
  }
  const active = await listActiveExercises();
  return (active ?? []).slice(0, limit);
}

// Admin only
export async function listAllExercises() {
  if (isDemo) return demoExercises.listAll();

  const { data, error } = await supabase
    .from('breathing_exercises')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function upsertExercise(exercise) {
  if (isDemo) return demoExercises.upsert(exercise);

  const { data, error } = await supabase
    .from('breathing_exercises')
    .upsert(exercise, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Migration 007 not run yet: the column simply is not there. */
function isMissingFeaturedColumn(err) {
  const text = `${err?.message ?? ''} ${err?.details ?? ''} ${err?.hint ?? ''}`;
  return err?.code === '42703' || err?.code === 'PGRST204' || text.includes('is_featured');
}

/**
 * Saves an exercise and survives a database without migration 007: the retry
 * drops the homepage tick. `featuredSaved` says whether it made it, so the
 * admin can tell the truth instead of quietly losing the choice.
 */
export async function saveExercise(exercise) {
  try {
    return { exercise: await upsertExercise(exercise), featuredSaved: true };
  } catch (err) {
    if (!isMissingFeaturedColumn(err)) throw err;
    const withoutPick = { ...exercise };
    delete withoutPick.is_featured;
    return { exercise: await upsertExercise(withoutPick), featuredSaved: false };
  }
}

export async function deleteExercise(id) {
  if (isDemo) return demoExercises.delete(id);

  const { error } = await supabase.from('breathing_exercises').delete().eq('id', id);
  if (error) throw error;
}
