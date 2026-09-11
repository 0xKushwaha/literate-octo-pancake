import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInAdmin } from '../../lib/auth';
import { isDemo, configError } from '../../lib/supabase';
import { brand } from '../../data/site';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/admin/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInAdmin(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Sign-in failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-violet-400">
            <span className="size-3 rounded-full bg-white" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{brand.name} Admin</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to manage your practice</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {isDemo && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-xs font-medium text-amber-800">Demo Mode</p>
            <p className="mt-1 text-xs text-amber-600">
              Email: <code className="font-mono font-semibold">admin@lumen.dev</code>
            </p>
            <p className="text-xs text-amber-600">
              Password: <code className="font-mono font-semibold">admin123</code>
            </p>
          </div>
        )}
        {configError && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-medium text-red-800">Backend not configured</p>
            <p className="mt-1 text-xs text-red-600">{configError}</p>
          </div>
        )}
        {!isDemo && !configError && (
          <p className="mt-6 text-center text-xs text-gray-400">
            Restricted access — authorised personnel only
          </p>
        )}
      </div>
    </div>
  );
}
