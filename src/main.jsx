import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import HowItWorksPage from './pages/HowItWorksPage';
import TherapistsPage from './pages/TherapistsPage';
import PricingPage from './pages/PricingPage';
import NotFoundPage from './pages/NotFoundPage';
import { useSiteContent } from './lib/queries/siteContent';
import './index.css';

// Split off the pages most visitors never open, so the first load stays small.
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'));
const BreathePage = lazy(() => import('./pages/BreathePage'));
const BlogIndexPage = lazy(() => import('./pages/BlogIndexPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

function RouteError() {
  const ui = useSiteContent('ui');
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center gap-8 bg-bg px-6 py-20 text-center">
      <div>
        <h1 className="mt-5 max-w-[20ch] font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight tracking-tight text-ink">
          {ui.error_title}
        </h1>
        <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-relaxed text-ink-3">
          {ui.error_body}
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-[15px] font-medium text-white transition-colors hover:bg-ink-2"
      >
        {ui.error_button}
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
        <div className="flex min-h-[60svh] items-center justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-line-2 border-t-ink" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/services', element: <ServicesPage /> },
      { path: '/how-it-works', element: <HowItWorksPage /> },
      { path: '/therapists', element: <TherapistsPage /> },
      { path: '/pricing', element: <PricingPage /> },
      { path: '/resources', element: <Lazy><ResourcesPage /></Lazy> },
      { path: '/breathe', element: <Lazy><BreathePage /></Lazy> },
      { path: '/blog', element: <Lazy><BlogIndexPage /></Lazy> },
      { path: '/blog/:slug', element: <Lazy><BlogPostPage /></Lazy> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/admin/*', element: <Lazy><AdminApp /></Lazy>, errorElement: <RouteError /> },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
);
