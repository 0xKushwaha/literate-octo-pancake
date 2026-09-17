import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PasswordFields from '../components/PasswordFields';
import { setPasswordFromLink } from '../../lib/auth';
import { parseAuthLink } from '../../lib/authLinks';
import { brand } from '../../data/site';

/**
 * /admin/reset-password — where "reset your password" and "you have been
 * invited" emails land. Reads the link once, clears it from the address bar
 * (so the tokens are not left in history or a screenshot), and asks for a new
 * password.
 */
export default function AdminSetPassword() {
  const link = useMemo(() => {
    const parsed = parseAuthLink(window.location.hash, window.location.search);
    if (parsed) window.history.replaceState(null, '', window.location.pathname);
    return parsed;
  }, []);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [state, setState] = useState('idle'); // idle | saving | done
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setState('saving');
    try {
      await setPasswordFromLink(link, password, confirm);
      setState('done');
    } catch (err) {
      setError(err.message);
      setState('idle');
    }
  }

  const invalid = !link || link.kind === 'error';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900">{brand.name} Admin</h1>
          <p className="mt-1 text-sm text-gray-500">Choose your password</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {state === 'done' ? (
            <div className="space-y-4 text-sm text-gray-700">
              <p>Your password is set.</p>
              <Link to="/admin/login" className="font-medium text-teal-700 hover:underline">
                Sign in
              </Link>
            </div>
          ) : invalid ? (
            <div className="space-y-4 text-sm text-gray-700">
              <p>{link?.message || 'This page only works from the link in a password email.'}</p>
              <p>
                Links work once and expire after a while. Ask for a new one from the{' '}
                <Link to="/admin/login" className="font-medium text-teal-700 hover:underline">
                  sign-in page
                </Link>{' '}
                (Forgot password?).
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <PasswordFields password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} />
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <button
                type="submit"
                disabled={state === 'saving'}
                className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
              >
                {state === 'saving' ? 'Saving…' : 'Set password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
