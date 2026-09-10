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

export async function deleteArticle(id) {
  if (isDemo) return demoArticles.delete(id);

  const { error } = await supabase.from('articles').delete().eq('id', id);
  if (error) throw error;
}
