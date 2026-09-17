import { useEffect, useState } from 'react';
import { supabase, isDemo, configError } from './supabase';
import { passwordProblem } from './authLinks';

export const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export async function signInAdmin(email, password) {
  if (configError) throw new Error(configError);

  // Demo mode — bypass Supabase entirely. Dev builds only; see lib/supabase.js.
  // Credentials are scoped inside this block so the bundler can provably
  // dead-code-eliminate them from production builds.
  if (import.meta.env.DEV && isDemo) {
    const DEMO_EMAIL = 'admin@lumen.dev';
    const DEMO_PASS = 'admin123';
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

/**
 * Emails a password-reset link. Always resolves the same way whether or not
 * the address has a login, so the form cannot be used to find out who does.
 */
export async function requestPasswordReset(email) {
  if (configError) throw new Error(configError);
  if (isDemo) return;
  const redirectTo = `${window.location.origin}/admin/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(String(email).trim(), { redirectTo });
  // Rate-limit errors are worth showing; "user not found" is never returned.
  if (error && error.status === 429) throw new Error('Too many requests. Wait a minute and try again.');
}

/**
 * Changes the signed-in admin's password. The current password is checked
 * first, so a laptop left signed in cannot be used to lock its owner out.
 */
export async function changePassword(currentPassword, newPassword, confirm) {
  const problem = passwordProblem(newPassword, confirm);
  if (problem) throw new Error(problem);
  if (isDemo) return;

  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user?.email;
  if (!email) throw new Error('You are signed out. Sign in again.');

  const { error: checkError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (checkError) throw new Error('Your current password is not right.');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message || 'Could not change the password.');
}

/**
 * Finishes a reset or invitation link: signs in with what the link carries,
 * sets the new password, then signs out again so the person signs in fresh.
 */
export async function setPasswordFromLink(link, newPassword, confirm) {
  const problem = passwordProblem(newPassword, confirm);
  if (problem) throw new Error(problem);
  if (!link || link.kind === 'error') throw new Error(link?.message || 'This link is not valid.');

  let result;
  if (link.kind === 'tokens') {
    result = await supabase.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
  } else if (link.kind === 'token_hash') {
    result = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type });
  } else if (link.kind === 'code') {
    result = await supabase.auth.exchangeCodeForSession(link.code);
  }
  if (result?.error) {
    throw new Error('This link has expired or was already used. Ask for a new one.');
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  await supabase.auth.signOut();
  if (error) throw new Error(error.message || 'Could not set the password.');
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
