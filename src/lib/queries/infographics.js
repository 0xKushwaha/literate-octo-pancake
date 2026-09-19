import { supabase, isDemo } from '../supabase';
import { demoInfographics } from '../demoData';

/**
 * Infographics: one picture and the words that go with it.
 *
 * Every function here answers "the table is not there yet" with an empty list
 * rather than an error. Migration 011 is run by hand in the SQL editor, so
 * there is always a window where the code is deployed and the table is not,
 * and during that window the Resources page has to keep rendering its videos
 * and articles. This is the same lesson as the cover-column fallback in
 * articles.js: never let one missing migration take down a whole page.
 */

// 42P01 is Postgres "undefined_table"; PGRST205 is PostgREST's own "that
// relation is not in the schema cache", which is what you actually get first.
const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205']);

function isMissingTable(err) {
  return MISSING_TABLE_CODES.has(err?.code);
}

/** True when migration 011 has been run. `null` means "could not tell". */
export async function infographicsReady() {
  if (isDemo) return true;
  const { error } = await supabase.from('infographics').select('id').limit(1);
  if (!error) return true;
  if (isMissingTable(error)) return false;
  return null;
}

export async function listActiveInfographics({ category = null } = {}) {
  if (isDemo) return demoInfographics.listActive({ category });

  let query = supabase
    .from('infographics')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return data ?? [];
}

// Admin only
export async function listAllInfographics() {
  if (isDemo) return demoInfographics.listAll();

  const { data, error } = await supabase
    .from('infographics')
    .select('*')
    .order('sort_order');
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return data ?? [];
}

export async function upsertInfographic(item) {
  if (isDemo) return demoInfographics.upsert(item);

  const { data, error } = await supabase
    .from('infographics')
    .upsert(item, { onConflict: 'id' })
    .select()
    .single();
  if (error) {
    // Here the missing table IS the answer, because the editor just tried to
    // save something. Name the file to run rather than showing a PostgREST code.
    if (isMissingTable(error)) {
      throw new Error('Infographics need one setup step: run database/migrations/011_infographics.sql in the Supabase SQL editor.');
    }
    throw error;
  }
  return data;
}

export async function deleteInfographic(id) {
  if (isDemo) return demoInfographics.delete(id);

  const { error } = await supabase.from('infographics').delete().eq('id', id);
  if (error) throw error;
}
