import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const PLACEHOLDERS = ['your-project-ref', 'your-anon-key-here', 'placeholder'];
const looksLikePlaceholder = (v) => PLACEHOLDERS.some((p) => v.toLowerCase().includes(p));

/** True when real Supabase credentials are present and shaped correctly. */
export const isConfigured =
  Boolean(url) &&
  Boolean(key) &&
  !looksLikePlaceholder(url) &&
  !looksLikePlaceholder(key) &&
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url);

/**
 * Demo mode swaps the whole backend for an in-memory fixture store and unlocks
 * a hard-coded admin login. That is a development convenience and a security
 * hole in equal measure, so it is only ever available in a dev build.
 *
 * A production bundle with missing credentials does NOT fall back to demo mode:
 * it fails loudly instead. Shipping a site whose admin password is printed on
 * the login screen is worse than shipping one whose admin page does not open.
 */
export const isDemo = !isConfigured && import.meta.env.DEV;

/** Non-null when the app cannot talk to a backend and cannot fall back. */
export const configError =
  isConfigured || isDemo
    ? null
    : 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at build time.';

if (configError) {
  console.error(`[lumen] ${configError}`);
}

// The anon key is safe to expose in the browser — RLS policies are the
// security boundary. Never put the service_role key in a VITE_ variable.
export const supabase = createClient(
  isConfigured ? url.replace(/\/$/, '') : 'https://placeholder.supabase.co',
  isConfigured ? key : 'placeholder-key',
  {
    auth: {
      persistSession: true,
      storageKey: 'lumen.auth.session',
      storage: typeof window === 'undefined' ? undefined : window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
