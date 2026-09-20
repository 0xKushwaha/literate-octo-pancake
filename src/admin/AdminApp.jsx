import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AdminGuard from './AdminGuard';
import AdminNav from './components/AdminNav';
import AdminLogin from './pages/AdminLogin';
import AdminSetPassword from './pages/AdminSetPassword';
import { isDemo } from '../lib/supabase';
import { DemoBanner } from './components/ui';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminBlog = lazy(() => import('./pages/AdminBlog'));
const AdminBlogEditor = lazy(() => import('./pages/AdminBlogEditor'));
const AdminBreathing = lazy(() => import('./pages/AdminBreathing'));
const AdminYouTube = lazy(() => import('./pages/AdminYouTube'));
const AdminInfographics = lazy(() => import('./pages/AdminInfographics'));
const AdminContent = lazy(() => import('./pages/AdminContent'));
const AdminPalette = lazy(() => import('./pages/AdminPalette'));
const AdminTypography = lazy(() => import('./pages/AdminTypography'));
const AdminFaqs = lazy(() => import('./pages/AdminFaqs'));
const AdminAccount = lazy(() => import('./pages/AdminAccount'));

/**
 * One Toaster for the whole admin, mounted here rather than in each page.
 *
 * Every page used to render its own `<Toaster />`. Because the shell stays
 * mounted across route changes, that meant several toasters alive at once and
 * a single `toast.success` painting duplicate stacked notifications.
 */
function AdminShell({ children }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50 font-sans text-gray-900">
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3200,
          style: { fontSize: '0.875rem', borderRadius: '0.5rem' },
          success: { iconTheme: { primary: '#FFBF00', secondary: '#fff' } },
          error: { duration: 6000 },
        }}
      />
      <AdminNav />
      {/* The main column is the scroller, not the window: the sidebar stays put,
          and the sticky save bar on the Colour palette and Fonts pages sticks. */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-8">
          {isDemo && <DemoBanner />}
          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center">
                <div className="size-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
              </div>
            }
          >
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route path="reset-password" element={<AdminSetPassword />} />
      <Route
        path="*"
        element={
          <AdminGuard>
            <AdminShell>
              <Routes>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="blog" element={<AdminBlog />} />
                <Route path="blog/new" element={<AdminBlogEditor />} />
                <Route path="blog/:id" element={<AdminBlogEditor />} />
                <Route path="breathing" element={<AdminBreathing />} />
                <Route path="youtube" element={<AdminYouTube />} />
                <Route path="infographics" element={<AdminInfographics />} />
                <Route path="content" element={<AdminContent />} />
                <Route path="colours" element={<AdminPalette />} />
                <Route path="fonts" element={<AdminTypography />} />
                <Route path="faqs" element={<AdminFaqs />} />
                <Route path="account" element={<AdminAccount />} />
                {/* Unknown admin URLs (including the removed /admin/community and
                    /admin/bookings screens) land on the dashboard, not a blank page. */}
                {/* Absolute on purpose: inside this splat-nested <Routes> a relative
                    "dashboard" resolves against the unknown URL and loops forever. */}
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Routes>
            </AdminShell>
          </AdminGuard>
        }
      />
    </Routes>
  );
}
