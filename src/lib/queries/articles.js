import { supabase, isDemo } from '../supabase';
import { demoArticles } from '../demoData';

export async function listPublishedArticles({ page = 1, pageSize = 9, category = null } = {}) {
  if (isDemo) return demoArticles.listPublished({ page, pageSize, category });

  let query = supabase
    .from('articles')
    .select('id, title, slug, excerpt, category, published_at, author_id', { count: 'exact' })
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (category) query = query.eq('category', category);

  const { data, error, count } = await query;
  if (error) throw error;
  return { articles: data, total: count };
}

export async function getLatestArticles(limit = 3) {
  if (isDemo) return demoArticles.getLatest(limit);

  const { data, error } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, category, published_at, content')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
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
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, category, published_at')
      .eq('is_published', true)
      .eq('is_featured', true)
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    if (data?.length) return data;
  } catch (err) {
    console.warn('[lumen] homepage picks unavailable, falling back to the newest articles', err);
  }
  return getLatestArticles(limit);
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

  const { data } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, category, published_at')
    .eq('is_published', true)
    .eq('category', category)
    .neq('slug', excludeSlug)
    .order('published_at', { ascending: false })
    .limit(limit);
  return data ?? [];
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
function isMissingFeaturedColumn(err) {
  const text = `${err?.message ?? ''} ${err?.details ?? ''} ${err?.hint ?? ''}`;
  return err?.code === '42703' || err?.code === 'PGRST204' || text.includes('is_featured');
}

/**
 * Saves an article and survives a database where migration 007 has not been
 * run: the retry drops the homepage tick. `featuredSaved` says whether the
 * tick made it, so the editor can tell the truth instead of quietly losing it.
 */
export async function saveArticle(article) {
  try {
    return { article: await upsertArticle(article), featuredSaved: true };
  } catch (err) {
    if (!isMissingFeaturedColumn(err)) throw err;
    const withoutPick = { ...article };
    delete withoutPick.is_featured;
    return { article: await upsertArticle(withoutPick), featuredSaved: false };
  }
}

export async function deleteArticle(id) {
  if (isDemo) return demoArticles.delete(id);

  const { error } = await supabase.from('articles').delete().eq('id', id);
  if (error) throw error;
}
