import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import './index.css';

const BlogIndexPage = lazy(() => import('./pages/BlogIndexPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

function RouteError() {
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
        className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-[15px] font-medium text-white transition-colors hover:bg-ink-2"
      >
        Reload the page
      </button>
    </div>
  );
}

/**
 * Lazy routes need a Suspense boundary above them. Without one, React throws
 * while the chunk is in flight and the router falls straight through to the
 * error element — so /blog and /admin would intermittently render "Something
 * went wrong" on a cold load or a slow connection.
 */
function Lazy({ children }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100svh] items-center justify-center bg-bg">
          <div className="size-6 animate-spin rounded-full border-2 border-line-2 border-t-ink" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

const router = createBrowserRouter([
  { path: '/', element: <HomePage />, errorElement: <RouteError /> },
  { path: '/blog', element: <Lazy><BlogIndexPage /></Lazy>, errorElement: <RouteError /> },
  { path: '/blog/:slug', element: <Lazy><BlogPostPage /></Lazy>, errorElement: <RouteError /> },
  { path: '/admin/*', element: <Lazy><AdminApp /></Lazy>, errorElement: <RouteError /> },
  { path: '*', element: <NotFoundPage /> },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
);
