import { StrictMode, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import { brand } from './data/site';
import './index.css';

const BlogIndexPage = lazy(() => import('./pages/BlogIndexPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

function RouteError() {
  const tel = brand.phone.replace(/[^\d+]/g, '');
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center gap-8 bg-bg px-6 py-20 text-center">
      <div>
        <h1 className="mt-5 max-w-[20ch] font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight tracking-tight text-ink">
          Something went wrong
        </h1>
        <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-relaxed text-ink-3">
          That is on us, not you. Reloading usually fixes it.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-[15px] font-medium text-white transition-colors hover:bg-[#161e33]"
      >
        Reload the page
      </button>
    </div>
  );
}

const router = createBrowserRouter([
  { path: '/', element: <HomePage />, errorElement: <RouteError /> },
  { path: '/blog', element: <BlogIndexPage />, errorElement: <RouteError /> },
  { path: '/blog/:slug', element: <BlogPostPage />, errorElement: <RouteError /> },
  { path: '/admin/*', element: <AdminApp />, errorElement: <RouteError /> },
  { path: '*', element: <NotFoundPage /> },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
);
