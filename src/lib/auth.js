import { useEffect, useState } from 'react';
import { supabase, isDemo, configError } from './supabase';

export const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

// Demo credentials for local development only. lib/supabase.js guarantees
// isDemo is false in any production build, so this path cannot ship.
const DEMO_EMAIL = 'admin@lumen.dev';
const DEMO_PASS = 'admin123';

export async function signInAdmin(email, password) {
  if (configError) throw new Error(configError);

  // Demo mode — bypass Supabase entirely. Dev builds only; see lib/supabase.js.
  if (isDemo) {
    if (email === DEMO_EMAIL && password === DEMO_PASS) {
      const demoSession = { user: { id: 'demo-admin', email: DEMO_EMAIL, role: 'ADMIN' } };
      sessionStorage.setItem('lumen.demo.session', JSON.stringify(demoSession));
      return demoSession;
    }
    throw new Error('Invalid demo credentials. Use admin@lumen.dev / admin123');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile || !ADMIN_ROLES.includes(profile.role)) {
    // Never leave a half-authenticated session behind: without this the user
    // holds a valid Supabase session that the guard keeps rejecting, and every
    // subsequent write fails against RLS with no explanation.
    await supabase.auth.signOut();
    throw new Error('Access denied: this account does not have admin access.');
  }

  return data;
}

/** Resolves the signed-in user's admin role, or null. Used by the route guard. */
export async function getAdminRole() {
  if (isDemo) {
    return sessionStorage.getItem('lumen.demo.session') ? 'ADMIN' : null;
  }
  if (configError) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (error || !profile || !ADMIN_ROLES.includes(profile.role)) return null;
  return profile.role;
}

export async function signOut() {
  if (isDemo) {
    sessionStorage.removeItem('lumen.demo.session');
    return;
  }
  return supabase.auth.signOut();
}

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      const stored = sessionStorage.getItem('lumen.demo.session');
      setSession(stored ? JSON.parse(stored) : null);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}
