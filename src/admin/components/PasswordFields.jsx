import { PASSWORD_MIN } from '../../lib/authLinks';

export const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500';

/** New password + confirmation, shared by the account page and the link page. */
export default function PasswordFields({ password, confirm, onPassword, onConfirm }) {
  return (
    <>
      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-700">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN}
          value={password}
          onChange={(e) => onPassword(e.target.value)}
          className={inputCls}
        />
        <p className="mt-1 text-xs text-gray-500">
          At least {PASSWORD_MIN} characters. A few unrelated words is easy to remember and hard to guess.
        </p>
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-gray-700">
          Type it again
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => onConfirm(e.target.value)}
          className={inputCls}
        />
      </div>
    </>
  );
}
