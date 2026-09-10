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

export async function deleteExercise(id) {
  if (isDemo) return demoExercises.delete(id);

  const { error } = await supabase.from('breathing_exercises').delete().eq('id', id);
  if (error) throw error;
}
