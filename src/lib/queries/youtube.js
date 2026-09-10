import { supabase, isDemo } from '../supabase';
import { demoVideos } from '../demoData';

export async function listFeaturedVideos(limit = 6) {
  if (isDemo) return demoVideos.listFeatured(limit);

  const { data, error } = await supabase
    .from('youtube_resources')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('sort_order')
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function listActiveVideos({ category = null } = {}) {
  if (isDemo) return demoVideos.listActive({ category });

  let query = supabase
    .from('youtube_resources')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// Admin only
export async function listAllVideos() {
  if (isDemo) return demoVideos.listAll();

  const { data, error } = await supabase
    .from('youtube_resources')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function upsertVideo(video) {
  if (isDemo) return demoVideos.upsert(video);

  const { data, error } = await supabase
    .from('youtube_resources')
    .upsert(video, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVideo(id) {
  if (isDemo) return demoVideos.delete(id);

  const { error } = await supabase.from('youtube_resources').delete().eq('id', id);
  if (error) throw error;
}
