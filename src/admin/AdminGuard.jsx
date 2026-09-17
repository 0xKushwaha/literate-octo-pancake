import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase, isDemo, configError } from '../lib/supabase';
import { getAdminRole, signOut } from '../lib/auth';

// Signed-in admin sessions end after this long with no activity, so a laptop
// left open at the front desk does not stay inside the bookings list.
const IDLE_LIMIT_MS = 30 * 60 * 1000;


function ConfigError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-base font-semibold text-gray-900">Admin unavailable</h1>
        <p className="mt-2 text-sm text-gray-600">{configError}</p>
        <p className="mt-3 text-xs text-gray-400">
          Set the environment variables in your hosting provider and redeploy. The public site
          continues to work from its built-in content.
        </p>
      </div>
    </div>
  );
}

export default function AdminGuard({ children }) {
  const [status, setStatus] = useState('loading');
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const check = () =>
      getAdminRole()
        .then((role) => {
          if (mounted) setStatus(role ? 'authorized' : 'unauthorized');
        })
        .catch(() => {
          if (mounted) setStatus('unauthorized');
        });

    check();

    // Re-evaluate when the session changes — a token that expires or a sign-out
    // in another tab should bounce the user out rather than leave a dead shell
    // whose every request quietly fails.
    if (isDemo || configError) return () => { mounted = false; };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (mounted) setStatus('unauthorized');
      } else {
        check();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (status !== 'authorized') return undefined;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        signOut().finally(() => setStatus('unauthorized'));
      }, IDLE_LIMIT_MS);
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'visibilitychange'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [status]);

  if (configError) return <ConfigError />;

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="size-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
      </div>
    );
  }

  if (status === 'unauthorized') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}
