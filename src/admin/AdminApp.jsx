import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminGuard from './AdminGuard';
import AdminNav from './components/AdminNav';
import AdminLogin from './pages/AdminLogin';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminBlog = lazy(() => import('./pages/AdminBlog'));
const AdminBlogEditor = lazy(() => import('./pages/AdminBlogEditor'));
const AdminBreathing = lazy(() => import('./pages/AdminBreathing'));
const AdminYouTube = lazy(() => import('./pages/AdminYouTube'));
const AdminContent = lazy(() => import('./pages/AdminContent'));
const AdminFaqs = lazy(() => import('./pages/AdminFaqs'));
const AdminBookings = lazy(() => import('./pages/AdminBookings'));

function AdminShell({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      <AdminNav />
      <main className="flex-1 overflow-y-auto">
        <Suspense
          fallback={
            <div className="flex h-64 items-center justify-center">
              <div className="size-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
    </div>
  );
}

export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
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
                <Route path="content" element={<AdminContent />} />
                <Route path="faqs" element={<AdminFaqs />} />
                <Route path="bookings" element={<AdminBookings />} />
              </Routes>
            </AdminShell>
          </AdminGuard>
        }
      />
    </Routes>
  );
}
