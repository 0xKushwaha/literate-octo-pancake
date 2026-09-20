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

// The homepage tick (011) and the focal point (013) both arrived after the
// table did, so a database can be missing either column independently. Same
// two codes mean "no such column" for both, so the message — which names the
// column — is what tells them apart; without that, dropping the wrong one
// could discard a homepage tick because a focal point was missing, or the
// reverse.
const MISSING_COLUMN_CODES = new Set(['42703', 'PGRST204']);
const OPTIONAL_COLUMNS = /is_featured|image_focal/;

function isMissingTable(err) {
  return MISSING_TABLE_CODES.has(err?.code);
}

function isMissingColumn(err, pattern) {
  if (!MISSING_COLUMN_CODES.has(err?.code)) return false;
  const text = `${err?.message ?? ''} ${err?.details ?? ''} ${err?.hint ?? ''}`;
  if (OPTIONAL_COLUMNS.test(text)) return pattern.test(text);
  return true;
}

const isMissingFeatured = (err) => isMissingColumn(err, /is_featured/);
const isMissingImageFocal = (err) => isMissingColumn(err, /image_focal/);

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

/**
 * Saves an infographic and survives a database that is behind on migrations.
 *
 * Two optional columns, each added by its own migration: the homepage tick
 * (011) and the focal point (013). Dropped one at a time and retried — a
 * database missing only one of them keeps the other — and the flags say which
 * parts made it, so the caller can name what was lost instead of reporting a
 * plain success for a save that quietly dropped something.
 */
export async function upsertInfographic(item) {
  if (isDemo) return demoInfographics.upsert({ ...item, featuredSaved: undefined, imageFocalSaved: undefined });

  const attempt = async (payload) => supabase.from('infographics').upsert(payload, { onConflict: 'id' }).select().single();
  const full = { featuredSaved: true, imageFocalSaved: true };

  let { data, error } = await attempt(item);
  if (!error) return { ...data, ...full };

  if (!isMissingFeatured(error) && !isMissingImageFocal(error)) {
    if (isMissingTable(error)) {
      throw new Error('Infographics need one setup step: run database/migrations/011_infographics.sql in the Supabase SQL editor.');
    }
    throw error;
  }

  const next = { ...item };
  const flags = { ...full };
  if (isMissingFeatured(error)) { delete next.is_featured; flags.featuredSaved = false; }
  if (isMissingImageFocal(error)) { delete next.image_focal; flags.imageFocalSaved = false; }

  ({ data, error } = await attempt(next));
  if (!error) return { ...data, ...flags };

  // The first error only ever names one missing column; a database behind on
  // both migrations needs a second pass to find the other.
  if (isMissingFeatured(error)) { delete next.is_featured; flags.featuredSaved = false; }
  else if (isMissingImageFocal(error)) { delete next.image_focal; flags.imageFocalSaved = false; }
  else {
    if (isMissingTable(error)) {
      throw new Error('Infographics need one setup step: run database/migrations/011_infographics.sql in the Supabase SQL editor.');
    }
    throw error;
  }

  ({ data, error } = await attempt(next));
  if (error) {
    if (isMissingTable(error)) {
      throw new Error('Infographics need one setup step: run database/migrations/011_infographics.sql in the Supabase SQL editor.');
    }
    throw error;
  }
  return { ...data, ...flags };
}

export async function deleteInfographic(id) {
  if (isDemo) return demoInfographics.delete(id);

  const { error } = await supabase.from('infographics').delete().eq('id', id);
  if (error) throw error;
}
