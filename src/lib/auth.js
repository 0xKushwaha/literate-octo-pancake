import { useEffect, useState } from 'react';
import { supabase, isDemo } from './supabase';

// Demo credentials for testing without real Supabase
const DEMO_EMAIL = 'admin@lumen.dev';
const DEMO_PASS = 'admin123';

export async function signInAdmin(email, password) {
  // Demo mode — bypass Supabase entirely
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

  if (profileError || !profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
    await supabase.auth.signOut();
    throw new Error('Access denied: not an admin account');
  }

  return data;
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
