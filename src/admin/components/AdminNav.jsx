import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from '../../lib/auth';
import { brand } from '../../data/site';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '⊞' },
  { to: '/admin/bookings', label: 'Bookings', icon: '📋' },
  { to: '/admin/community', label: 'Community', icon: '✻' },
  { to: '/admin/blog', label: 'Blog', icon: '✍' },
  { to: '/admin/breathing', label: 'Breathing', icon: '◎' },
  { to: '/admin/youtube', label: 'YouTube', icon: '▶' },
  { to: '/admin/faqs', label: 'FAQs', icon: '?' },
  { to: '/admin/content', label: 'Site Content', icon: '✦' },
];

export default function AdminNav() {
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/admin/login');
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="relative grid size-5 place-items-center">
            <span className="absolute inset-0 rounded-full bg-brand-500" />
            <span className="relative size-2 rounded-full bg-gray-900" />
          </span>
          <span className="font-semibold text-gray-900">{brand.name} Admin</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-gray-100 font-medium text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <span className="text-base">{icon}</span>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-gray-200 p-3 space-y-0.5">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-teal-600 transition-colors hover:bg-teal-50 hover:text-teal-700"
        >
          <span>↗</span>
          View site
        </a>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <span>↩</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
