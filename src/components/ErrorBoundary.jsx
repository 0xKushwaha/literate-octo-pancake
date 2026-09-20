import { Component } from 'react';
import { telHref, useBrand, useSiteContent } from '../lib/queries/siteContent';

/**
 * Catches render errors anywhere below it.
 *
 * The important part for this particular site is the fallback content: if the
 * app breaks, the crisis line and the practice's phone number must still be on
 * screen. Someone who came here in a bad moment should never be left looking
 * at a blank page.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // No third-party error reporter: this page handles health data, and
    // shipping stack traces (which can carry form values) to someone else's
    // server is not a trade worth making. Console only.
    console.error('[lumen] render error', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <CrashScreen />;
  }
}

/**
 * A function component so the fallback can read the CMS like everything else.
 * `useSiteContent` starts from the built-in defaults and never throws, so this
 * still renders something useful when the database is exactly what broke.
 */
function CrashScreen() {
  const brand = useBrand();
  const ui = useSiteContent('ui');
  return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center gap-8 bg-bg px-6 py-20 text-center">
        <div>
          <p className="eyebrow">{ui.error_title}</p>
          <h1 className="mt-5 max-w-[20ch] font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight tracking-tight text-ink">
            {ui.crash_title}
          </h1>
          <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-relaxed text-ink-3">
            {ui.crash_body}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-[15px] font-medium text-on-ink transition-colors hover:bg-ink-2"
          >
            {ui.error_button}
          </button>
          {brand.phone && <a
            href={telHref(brand.phone)}
            className="inline-flex h-12 items-center rounded-full border border-line-2 bg-surface px-6 text-[15px] text-ink transition-colors hover:border-brand-500"
          >
            {ui.call_prefix} {brand.phone}
          </a>}
        </div>

        <div className="mt-4 max-w-[52ch] rounded-2xl border border-amber-500 bg-amber-500 px-6 py-4">
          <p className="text-[14px] leading-relaxed text-ink-2">
            <strong className="font-medium text-ink">{ui.crisis_prefix}</strong> {brand.crisis_line}
          </p>
        </div>
      </div>
  );
}
