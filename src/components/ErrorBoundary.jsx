import { Component } from 'react';
import { brand } from '../data/site';

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

    const tel = brand.phone.replace(/[^\d+]/g, '');
    return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center gap-8 bg-bg px-6 py-20 text-center">
        <div>
          <p className="eyebrow">Something went wrong</p>
          <h1 className="mt-5 max-w-[20ch] font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight tracking-tight text-ink">
            This page failed to load.
          </h1>
          <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-relaxed text-ink-3">
            That is on us, not you. Reloading usually fixes it — and you can always reach the
            practice directly.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-[15px] font-medium text-white transition-colors hover:bg-[#161e33]"
          >
            Reload the page
          </button>
          <a
            href={`tel:${tel}`}
            className="inline-flex h-12 items-center rounded-full border border-line-2 bg-surface px-6 text-[15px] text-ink transition-colors hover:border-aqua-500"
          >
            Call {brand.phone}
          </a>
        </div>

        <div className="mt-4 max-w-[52ch] rounded-2xl border border-coral-500 bg-coral-100 px-6 py-4">
          <p className="text-[14px] leading-relaxed text-ink-2">
            <strong className="font-medium text-coral-700">In immediate crisis?</strong> Call or
            text <strong className="font-medium">988</strong> — Suicide &amp; Crisis Lifeline,
            24/7. If someone is in danger right now, call 911.
          </p>
        </div>
      </div>
    );
  }
}
