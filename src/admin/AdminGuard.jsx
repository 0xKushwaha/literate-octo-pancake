import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase, isDemo } from '../lib/supabase';

export default function AdminGuard({ children }) {
  const [status, setStatus] = useState('loading');
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    async function check() {
      // Demo mode — check sessionStorage
      if (isDemo) {
        const stored = sessionStorage.getItem('lumen.demo.session');
        if (mounted) setStatus(stored ? 'authorized' : 'unauthorized');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (mounted) setStatus('unauthorized');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (mounted) {
        setStatus(
          profile && ['ADMIN', 'SUPER_ADMIN'].includes(profile.role)
            ? 'authorized'
            : 'unauthorized',
        );
      }
    }
    check();
    return () => { mounted = false; };
  }, []);

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
