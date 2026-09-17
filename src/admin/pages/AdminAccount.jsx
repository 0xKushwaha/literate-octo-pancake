import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button, PageHeader, Panel } from '../components/ui';
import PasswordFields, { inputCls } from '../components/PasswordFields';
import { changePassword } from '../../lib/auth';
import { supabase, isDemo } from '../../lib/supabase';

/**
 * The signed-in admin's own account: who they are signed in as, and a
 * password change. Adding and removing admins is deliberately not here; it is
 * done by the practice owner in Supabase (see HANDOVER.md, section 4), so a
 * single stolen admin session cannot hand out more access.
 */
export default function AdminAccount() {
  const [email, setEmail] = useState('');
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDemo) {
      setEmail('admin@lumen.dev');
      return;
    }
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user?.email ?? ''));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await changePassword(current, password, confirm);
      setCurrent('');
      setPassword('');
      setConfirm('');
      toast.success('Password changed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Your account" subtitle={email ? `Signed in as ${email}` : undefined} />
      <Panel className="max-w-lg">
        <form onSubmit={submit} className="space-y-4 p-6">
          <h2 className="text-base font-semibold text-gray-900">Change password</h2>
          <div>
            <label htmlFor="current-password" className="mb-1 block text-sm font-medium text-gray-700">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className={inputCls}
            />
          </div>
          <PasswordFields password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Change password'}
          </Button>
        </form>
      </Panel>
      <p className="mt-6 max-w-lg text-sm text-gray-500">
        Need to give someone else access, or take it away? The practice owner does that in Supabase. The steps are in
        HANDOVER.md, section 4.
      </p>
    </>
  );
}
