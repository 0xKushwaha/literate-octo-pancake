import { useEffect, useState } from 'react';
import { supabase, isDemo } from '../supabase';
import { demoSiteContent } from '../demoData';

export async function getSectionContent(section) {
  if (isDemo) return demoSiteContent.getSection(section);

  const { data } = await supabase
    .from('site_content')
    .select('key, value, type, label')
    .eq('section', section);
  if (!data) return {};
  return Object.fromEntries(
    data.map(({ key, value, type, label }) => [key.split('.').pop(), { value, type, label, key }]),
  );
}

export async function getAllContent() {
  if (isDemo) return demoSiteContent.getAll();

  const { data, error } = await supabase
    .from('site_content')
    .select('*')
    .order('section')
    .order('key');
  if (error) throw error;
  return data ?? [];
}

export async function upsertContent({ key, value, section, label, type = 'text' }) {
  if (isDemo) return demoSiteContent.upsert({ key, value, section, label, type });

  const { error } = await supabase
    .from('site_content')
    .upsert({ key, value, section, label, type, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

export async function deleteContent(key) {
  if (isDemo) return demoSiteContent.delete(key);

  const { error } = await supabase.from('site_content').delete().eq('key', key);
  if (error) throw error;
}

/**
 * Hook that fetches CMS content for a section and merges it over static defaults.
 */
export function useSiteContent(section, defaults = {}) {
  const [content, setContent] = useState(defaults);

  useEffect(() => {
    getSectionContent(section).then((remote) => {
      if (!remote || Object.keys(remote).length === 0) return;
      setContent((prev) => {
        const merged = { ...prev };
        for (const [shortKey, { value }] of Object.entries(remote)) {
          if (shortKey in merged) merged[shortKey] = value;
        }
        return merged;
      });
    });
  }, [section]);

  return content;
}
