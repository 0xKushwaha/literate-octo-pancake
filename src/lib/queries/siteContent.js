import { useEffect, useState } from 'react';
import { supabase, isDemo } from '../supabase';
import { demoSiteContent } from '../demoData';
import { indexRows, isValidContentKey, mergeContent, sectionOf } from '../contentMerge';

export { shortKeyOf, sectionOf } from '../contentMerge';

// ── Tiny request cache ──────────────────────────────────────────────────────
// Six components call useSiteContent on the homepage. Without this each one
// fires its own request for its own section on every mount.
const cache = new Map();
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn();
}

/** Drops cached content so the next read hits the source. */
export function invalidateSiteContent() {
  cache.clear();
  notify();
}

export async function getSectionContent(section, { force = false } = {}) {
  if (!force && cache.has(section)) return cache.get(section);

  let rows;
  if (isDemo) {
    rows = demoSiteContent.getAllInSection(section);
  } else {
    const { data, error } = await supabase
      .from('site_content')
      .select('key, value, type, label')
      .eq('section', section);
    if (error) throw error;
    rows = data ?? [];
  }

  const result = indexRows(rows);
  cache.set(section, result);
  return result;
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
  if (!isValidContentKey(key)) {
    throw new Error(
      `Invalid content key "${key}" — expected lowercase "<section>.<name>", e.g. "hero.tagline".`,
    );
  }

  if (isDemo) {
    demoSiteContent.upsert({ key, value, section, label, type });
    invalidateSiteContent();
    return;
  }

  let updatedBy = null;
  try {
    const { data } = await supabase.auth.getUser();
    updatedBy = data?.user?.id ?? null;
  } catch {
    // Non-fatal: the row still saves, it just loses the audit trail.
  }

  const { data, error } = await supabase
    .from('site_content')
    .upsert(
      {
        key,
        value: value ?? '',
        section: section ?? sectionOf(key),
        label: label ?? null,
        type,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    )
    .select('key')
    .single();

  if (error) throw error;
  // A row-level-security denial can come back as a successful request that
  // simply wrote nothing. Treat that as the failure it is, rather than
  // showing the editor a "Saved" toast for a no-op.
  if (!data) throw new Error('Save was rejected — this account is not allowed to edit site content.');

  invalidateSiteContent();
}

export async function deleteContent(key) {
  if (isDemo) {
    demoSiteContent.delete(key);
    invalidateSiteContent();
    return;
  }

  const { error } = await supabase.from('site_content').delete().eq('key', key);
  if (error) throw error;
  invalidateSiteContent();
}

/**
 * Fetches CMS content for a section and merges it over static defaults.
 *
 * Every key returned by the CMS is applied, including ones the caller did not
 * list in `defaults` — otherwise a field added in the admin panel would be
 * editable but have no effect on the site, which is worse than not offering it.
 */
export function useSiteContent(section, defaults = {}) {
  const [content, setContent] = useState(defaults);

  useEffect(() => {
    let active = true;

    const load = () => {
      getSectionContent(section)
        .then((remote) => {
          if (!active || !remote) return;
          setContent((prev) => mergeContent(prev, remote));
        })
        .catch((err) => {
          // The static defaults are already on screen; the site stays usable.
          console.warn(`[lumen] site content for "${section}" unavailable`, err);
        });
    };

    load();
    listeners.add(load);
    return () => {
      active = false;
      listeners.delete(load);
    };
  }, [section]);

  return content;
}
