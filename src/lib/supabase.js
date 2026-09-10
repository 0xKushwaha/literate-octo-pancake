import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// True when real Supabase credentials haven't been configured yet
export const isDemo = !url || url.includes('your-project-ref') || !key || key === 'your-anon-key-here';

// The anon key is safe to expose in the browser — RLS policies are the
// security boundary. Never put service_role key in a VITE_ variable.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      storageKey: 'lumen.auth.session',
      storage: localStorage,
      autoRefreshToken: true,
    },
  },
);
