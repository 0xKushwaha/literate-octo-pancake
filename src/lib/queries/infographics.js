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

// The homepage tick arrived after the table did, so a database that ran an
// earlier copy of 011 has the table but not the column. Same two codes mean
// "no such column" as well, so the message is what tells them apart.
const MISSING_COLUMN_CODES = new Set(['42703', 'PGRST204']);

function isMissingTable(err) {
  return MISSING_TABLE_CODES.has(err?.code);
}

function isMissingFeatured(err) {
  if (!MISSING_COLUMN_CODES.has(err?.code)) return false;
  const text = `${err?.message ?? ''} ${err?.details ?? ''} ${err?.hint ?? ''}`;
  return /is_featured/.test(text);
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

/** The ones ticked "Show on homepage", in sort order. */
export async function listFeaturedInfographics(limit = 1) {
  if (isDemo) return demoInfographics.listActive({}).slice(0, limit);

  const { data, error } = await supabase
    .from('infographics')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('sort_order')
    .limit(limit);
  if (error) {
    // Table or column missing: the caller falls back to the first active ones,
    // so the homepage card is never simply absent because of a pending
    // migration.
    if (isMissingTable(error) || isMissingFeatured(error)) return [];
    throw error;
  }
  return data ?? [];
}

/**
 * What the homepage shows. Ticked first, and if nothing is ticked the first
 * active ones, for the same reason the articles and videos do it: a homepage
 * block that empties because nobody remembered to tick a box reads as broken.
 */
export async function getHomepageInfographics(limit = 1) {
  if (limit < 1) return [];
  const featured = await listFeaturedInfographics(limit);
  if (featured.length) return featured;
  const active = await listActiveInfographics();
  return (active ?? []).slice(0, limit);
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
  if (isDemo) return demoInfographics.upsert({ ...item, featuredSaved: undefined });

  let { data, error } = await supabase
    .from('infographics')
    .upsert(item, { onConflict: 'id' })
    .select()
    .single();

  // One retry without the tick, so an editor on a database that predates the
  // column still saves their title and picture instead of losing the lot. The
  // caller is told what was dropped rather than being left to assume it stuck.
  if (error && isMissingFeatured(error)) {
    const { is_featured: _dropped, ...rest } = item;
    ({ data, error } = await supabase
      .from('infographics')
      .upsert(rest, { onConflict: 'id' })
      .select()
      .single());
    if (!error) return { ...data, featuredSaved: false };
  }

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
