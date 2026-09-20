import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigate, createBrowserRouter, RouterProvider } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import HowItWorksPage from './pages/HowItWorksPage';
import TherapistsPage from './pages/TherapistsPage';
import PricingPage from './pages/PricingPage';
import NotFoundPage from './pages/NotFoundPage';
import { useSiteContent } from './lib/queries/siteContent';
import { useFeatures } from './lib/features';
import './index.css';
import { isSetPasswordHash } from './lib/authLinks';
import { applyPaletteAtBoot } from './lib/theme';

// Password-reset and invitation emails sent from the Supabase dashboard land
// on the site's home page with the sign-in tokens in the address. Send them to
// the page that knows what to do with them, before anything else renders.
if (window.location.pathname !== '/admin/reset-password' && isSetPasswordHash(window.location.hash)) {
  window.location.replace(`/admin/reset-password${window.location.hash}`);
}

// A recoloured site should not flash the default colours while the saved
// palette loads: put back the one this browser saw last, before first paint.
applyPaletteAtBoot();

// Split off the pages most visitors never open, so the first load stays small.
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'));
const BreathePage = lazy(() => import('./pages/BreathePage'));
const BlogIndexPage = lazy(() => import('./pages/BlogIndexPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const AdminApp = lazy(() => import('./admin/AdminApp'));
const LegalPage = lazy(() => import('./pages/LegalPage'));

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
        className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-[15px] font-medium text-on-ink transition-colors hover:bg-ink-2"
      >
        {ui.error_button}
      </button>
    </div>
  );
}

/**
 * A page that is behind one of the Show & hide switches.
 *
 * The route stays registered either way, so an old link, a bookmark or a
 * search result never lands on a 404 while the section is switched off — it
 * lands on the home page. Switch the section back on and the same URL serves
 * the page again, unchanged.
 */
function Gated({ feature, children }) {
  const features = useFeatures();
  return features[feature] ? children : <Navigate to="/" replace />;
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
      { path: '/therapists', element: <Gated feature="therapists"><TherapistsPage /></Gated> },
      { path: '/pricing', element: <Gated feature="pricing"><PricingPage /></Gated> },
      { path: '/resources', element: <Lazy><ResourcesPage /></Lazy> },
      { path: '/breathe', element: <Lazy><BreathePage /></Lazy> },
      { path: '/blog', element: <Lazy><BlogIndexPage /></Lazy> },
      { path: '/blog/:slug', element: <Lazy><BlogPostPage /></Lazy> },
      { path: '/privacy', element: <Lazy><LegalPage kind="privacy" /></Lazy> },
      { path: '/terms', element: <Lazy><LegalPage kind="terms" /></Lazy> },
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
