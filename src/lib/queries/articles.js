import { supabase, isDemo } from '../supabase';
import { demoArticles } from '../demoData';

/**
 * The cover picture, added by migration 008.
 *
 * Every listing asks for these two columns and runs again without them if the
 * database has not been migrated yet. Selecting a column that does not exist
 * is a hard error in PostgREST, so without this the entire blog — not just the
 * pictures — would go blank on a database that is one migration behind. The
 * same shape as the `is_featured` fallback below, for the same reason.
 */
const COVER_COLUMNS = 'cover_image, cover_alt';

const MISSING_COLUMN_CODES = new Set(['42703', 'PGRST204']);
const OPTIONAL_COLUMNS = /cover_image|cover_alt|is_featured/;

/**
 * Does this error mean *this particular* column is not in the database?
 *
 * The message names the column — "column articles.cover_image does not exist"
 * — and that has to be what decides, because the error *code* is the same for
 * every missing column. Testing the code alone made both group tests answer
 * "yes" to one cover error, so a save on a database missing only 008 dropped
 * the 007 homepage tick as well and reported it as lost.
 *
 * The code is still the fallback for the case where the message names no
 * column at all: then any optional column could be the culprit and dropping
 * them is better than failing the save.
 */
function isMissingColumn(err, pattern) {
  if (!MISSING_COLUMN_CODES.has(err?.code)) return false;
  const text = `${err?.message ?? ''} ${err?.details ?? ''} ${err?.hint ?? ''}`;
  if (OPTIONAL_COLUMNS.test(text)) return pattern.test(text);
  return true;
}

const isMissingCoverColumn = (err) => isMissingColumn(err, /cover_image|cover_alt/);

/** Runs `run(coverColumns)`, retrying with no cover columns if they are absent. */
async function withCover(run) {
  try {
    return await run(`, ${COVER_COLUMNS}`);
  } catch (err) {
    if (!isMissingCoverColumn(err)) throw err;
    return run('');
  }
}

export async function listPublishedArticles({ page = 1, pageSize = 9, category = null } = {}) {
  if (isDemo) return demoArticles.listPublished({ page, pageSize, category });

  return withCover(async (cover) => {
    let query = supabase
      .from('articles')
      .select(`id, title, slug, excerpt, category, published_at, author_id${cover}`, { count: 'exact' })
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (category) query = query.eq('category', category);

    const { data, error, count } = await query;
    if (error) throw error;
    return { articles: data, total: count };
  });
}

export async function getLatestArticles(limit = 3) {
  if (isDemo) return demoArticles.getLatest(limit);

  return withCover(async (cover) => {
    const { data, error } = await supabase
      .from('articles')
      .select(`id, title, slug, excerpt, category, published_at, content${cover}`)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  });
}

/**
 * The articles offered to the homepage cards.
 *
 * `is_featured` is the "Show on homepage" tick in the blog editor (migration
 * 007). Two fallbacks to the newest published posts, both deliberate:
 *   - the column does not exist yet, because 007 has not been run
 *   - nothing is ticked
 * A homepage that empties itself because nobody ticked a box reads as broken,
 * so the tick narrows the list rather than being a prerequisite for one.
 */
export async function getHomepageArticles(limit = 3) {
  if (limit < 1) return [];
  if (isDemo) return demoArticles.getHomepage(limit);

  try {
    const data = await withCover(async (cover) => {
      const { data: rows, error } = await supabase
        .from('articles')
        .select(`id, title, slug, excerpt, category, published_at${cover}`)
        .eq('is_published', true)
        .eq('is_featured', true)
        .order('published_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return rows;
    });
    if (data?.length) return data;
  } catch (err) {
    console.warn('[lumen] homepage picks unavailable, falling back to the newest articles', err);
  }
  return getLatestArticles(limit);
}

/**
 * Is the database ready to store a cover picture — has migration 008 been run?
 *
 * The editor asks this once, up front, so it can say so plainly instead of
 * accepting a picture and discarding it at save time. `null` means the
 * question could not be answered (offline, or an error that is not about a
 * missing column), which is treated as "assume it works" rather than nagging
 * about a migration that may well have been run.
 */
export async function articleImagesReady() {
  // Demo's in-memory store keeps whatever fields it is handed, so a cover can
  // be set and previewed there. Only *uploading* is impossible in demo, and
  // that is a separate question — see `canUpload` in the editor.
  if (isDemo) return true;
  const { error } = await supabase.from('articles').select('cover_image').limit(1);
  if (!error) return true;
  if (isMissingCoverColumn(error)) return false;
  console.warn('[lumen] could not check whether article covers are available', error);
  return null;
}

export async function getArticleBySlug(slug) {
  if (isDemo) return demoArticles.getBySlug(slug);

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();
  if (error) throw error;
  return data;
}

export async function getRelatedArticles(category, excludeSlug, limit = 3) {
  if (isDemo) return demoArticles.getRelated(category, excludeSlug);

  return withCover(async (cover) => {
    const { data, error } = await supabase
      .from('articles')
      .select(`id, title, slug, excerpt, category, published_at${cover}`)
      .eq('is_published', true)
      .eq('category', category)
      .neq('slug', excludeSlug)
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  });
}

// Admin only
export async function listAllArticles() {
  if (isDemo) return demoArticles.listAll();

  const { data, error } = await supabase
    .from('articles')
    .select('id, title, slug, category, is_published, published_at, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getArticleById(id) {
  if (isDemo) return demoArticles.getById(id);

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function upsertArticle(article) {
  if (isDemo) return demoArticles.upsert(article);

  const { data, error } = await supabase
    .from('articles')
    .upsert(article, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Migration 007 not run yet: the column simply is not there. */
const isMissingFeaturedColumn = (err) => isMissingColumn(err, /is_featured/);

/**
 * Saves an article and survives a database that is behind on migrations.
 *
 * Two optional groups of columns, each added by a migration the practice runs
 * itself: the homepage tick (007) and the cover picture (008). If the upsert
 * is rejected for a column that is not there, the offending group is dropped
 * and the save is retried, and the flags say which parts made it — so the
 * editor can name what was lost instead of showing a success toast for a save
 * that quietly discarded the picture.
 *
 * The retries are ordered rather than combined: the columns are dropped one
 * group at a time, so a database missing only 008 still keeps its homepage
 * tick, and vice versa.
 */
export async function saveArticle(article) {
  const attempt = async (payload, flags) => ({ article: await upsertArticle(payload), ...flags });
  const full = { featuredSaved: true, coverSaved: true };

  try {
    return await attempt(article, full);
  } catch (err) {
    const missingCover = isMissingCoverColumn(err);
    const missingFeatured = isMissingFeaturedColumn(err);
    if (!missingCover && !missingFeatured) throw err;

    const next = { ...article };
    const flags = { ...full };
    if (missingCover) {
      delete next.cover_image;
      delete next.cover_alt;
      flags.coverSaved = false;
    }
    if (missingFeatured) {
      delete next.is_featured;
      flags.featuredSaved = false;
    }

    try {
      return await attempt(next, flags);
    } catch (err2) {
      // The first error only ever names one missing column; a database behind
      // on both migrations needs a second pass to find the other.
      if (isMissingCoverColumn(err2)) {
        delete next.cover_image;
        delete next.cover_alt;
        flags.coverSaved = false;
      } else if (isMissingFeaturedColumn(err2)) {
        delete next.is_featured;
        flags.featuredSaved = false;
      } else {
        throw err2;
      }
      return attempt(next, flags);
    }
  }
}

export async function deleteArticle(id) {
  if (isDemo) return demoArticles.delete(id);

  const { error } = await supabase.from('articles').delete().eq('id', id);
  if (error) throw error;
}
