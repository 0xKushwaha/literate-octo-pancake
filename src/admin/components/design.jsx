import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { brand } from '../../data/site';

/**
 * Pieces shared by Admin → Colour palette and Admin → Fonts & text: the tabs
 * between the two, the sticky bar that jumps between groups and holds Save,
 * and the miniature site used as a clickable preview.
 */

/* ── Tabs ───────────────────────────────────────────────────────────────── */

export function DesignTabs() {
  const tab = ({ isActive }) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`;
  return (
    <nav aria-label="Design" className="mb-5 inline-flex rounded-lg bg-gray-200/70 p-1">
      <NavLink to="/admin/colours" className={tab}>Colours</NavLink>
      <NavLink to="/admin/fonts" className={tab}>Fonts &amp; text</NavLink>
    </nav>
  );
}

/* ── Sticky jump bar ────────────────────────────────────────────────────── */

/**
 * Stays at the top of the admin while the list scrolls under it: a chip per
 * group (with a dot when something in it is set), the filters, and the save
 * state — so Save is never a scroll away.
 */
export function JumpBar({ groups, active, onJump, changedIn, dirtyCount, saving, onSave, onDiscard, children }) {
  const row = useRef(null);
  // Keep the current chip in view by scrolling the row sideways only.
  // (scrollIntoView would also scroll the page, cutting a jump off mid-way.)
  useEffect(() => {
    const el = row.current;
    const chip = el?.querySelector('[aria-current="true"]');
    if (!el || !chip) return;
    const left = chip.offsetLeft; // the row is positioned, so this is relative to it
    if (left < el.scrollLeft || left + chip.offsetWidth > el.scrollLeft + el.clientWidth) {
      el.scrollTo({ left: Math.max(0, left - 40), behavior: 'smooth' });
    }
  }, [active]);
  return (
    <div className="sticky top-0 z-30 -mx-8 mb-4 border-b border-gray-200 bg-gray-50/95 px-8 py-2.5 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* One scrolling row, however many groups there are: a bar that wraps
            to three lines stops being a bar. */}
        <div ref={row} className="relative flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
          <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Jump to</span>
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onJump(g.id)}
              aria-current={active === g.id ? 'true' : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                active === g.id
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {g.title}
              {changedIn?.(g.id) > 0 && (
                <span className={`size-1.5 rounded-full ${active === g.id ? 'bg-amber-300' : 'bg-amber-500'}`} title="Something here is set by hand" />
              )}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {children}
          {dirtyCount > 0 && (
            <>
              <span className="text-xs text-amber-700">{dirtyCount} unsaved</span>
              <button type="button" onClick={onDiscard} disabled={saving} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-white">
                Discard
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={!dirtyCount || saving}
            className="rounded-lg bg-gray-900 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Saving…' : dirtyCount ? 'Save' : 'Saved'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Clickable mini site ────────────────────────────────────────────────── */

/**
 * A miniature of the site built from the same classes (and the same t-* text
 * markers) the real pages use, so colours and fonts restyle it exactly the
 * way they restyle the site. Every part carries data-pal (the colour group
 * that paints it) and data-type (the text block it is), so clicking it can
 * take the admin straight to the right controls. `pick` says which of the two
 * this page cares about.
 */
export function MiniSite({ ref, probeRef, pick, labels = {}, onPick }) {
  const [hot, setHot] = useState(null);
  const attr = pick === 'type' ? 'data-type' : 'data-pal';
  const hotEl = useRef(null);

  const target = (e) => (e.target instanceof Element ? e.target.closest(`[${attr}]`) : null);
  const onOver = (e) => {
    const el = target(e);
    if (el === hotEl.current) return;
    hotEl.current?.removeAttribute('data-hot');
    hotEl.current = el;
    el?.setAttribute('data-hot', '');
    setHot(el ? el.getAttribute(attr) : null);
  };
  const onLeave = () => {
    hotEl.current?.removeAttribute('data-hot');
    hotEl.current = null;
    setHot(null);
  };
  const onClick = (e) => {
    const el = target(e);
    if (el) onPick?.(el.getAttribute(attr));
  };

  return (
    <div>
      <div className="flex h-8 items-center justify-between border-b border-gray-100 bg-white px-4 text-[11px] text-gray-500">
        <span>{hot ? <>Edit <strong className="font-semibold text-gray-800">{labels[hot] ?? hot}</strong></> : 'Click any part to edit it'}</span>
      </div>
      {/* role="presentation": the real controls are the list on the left; this is a shortcut into it. */}
      <div
        ref={ref}
        role="presentation"
        onMouseOver={onOver}
        onMouseLeave={onLeave}
        onClick={onClick}
        className="palette-preview relative cursor-pointer select-none bg-bg font-sans text-ink [&_[data-hot]]:outline-2 [&_[data-hot]]:outline-offset-2 [&_[data-hot]]:outline-teal-600 [&_[data-hot]]:outline-dashed"
      >
        <span ref={probeRef} className="pointer-events-none absolute size-0 opacity-0" />

        {/* header */}
        <div data-pal="header" className="zone-header flex h-11 items-center justify-between gap-2 border-b border-line bg-bg px-3">
          <span data-type="brand" className="t-brand font-display text-[14px] font-semibold tracking-tight text-ink">{brand.name}</span>
          <span className="flex items-center gap-0.5 text-[10.5px] font-medium">
            <span data-type="nav" className="t-nav rounded-full bg-surface-3 px-2 py-1 text-ink">Care</span>
            <span data-type="nav" className="t-nav relative rounded-full bg-surface-2 px-2 py-1 text-ink-2">
              Resources
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-badge px-1 text-[8px] font-semibold leading-3 text-badge-ink">New</span>
            </span>
          </span>
          <span data-pal="buttons" data-type="button" className="t-button rounded-full bg-btn px-2.5 py-1 text-[10px] font-semibold text-btn-ink">Join</span>
        </div>

        {/* hero */}
        <div data-pal="hero" className="backdrop-soft zone-hero px-4 pb-4 pt-5">
          <span data-pal="core" data-type="pill" className="t-pill inline-flex items-center rounded-full border border-peach-200/60 bg-peach-100 px-2 py-0.5 text-[9px] font-medium text-ink">Taking new clients</span>
          <h3 data-type="hero-title" className="t-hero-title mt-2 font-display text-[23px] leading-[1.05] tracking-tight text-ink">
            Therapy for <span data-type="hero-word" className="t-hero-word mark text-aurora italic">anxiety</span>
          </h3>
          <p data-type="hero-text" className="t-hero-text mt-2 text-[11px] leading-relaxed text-ink-2">Licensed clinicians, matched to you by a human in under a day.</p>
          <div className="mt-3 flex gap-1.5">
            <span data-pal="buttons" data-type="button" className="t-button rounded-full bg-btn px-3 py-1.5 text-[10.5px] font-semibold text-btn-ink shadow-[var(--shadow-card)]">Join our community</span>
            <span data-pal="buttons" data-type="button" className="t-button rounded-full border border-btn-2-line bg-btn-2 px-3 py-1.5 text-[10.5px] font-semibold text-btn-2-ink">How it works</span>
          </div>
          <div className="mt-4 grid grid-cols-2 border-t border-line pt-2">
            <div data-pal="text"><div data-type="stat" className="t-stat font-display text-[18px] leading-none text-accent-strong">14,200+</div><div className="mt-1 text-[9.5px] text-ink-3">Sessions held</div></div>
            <div data-pal="text" className="border-l border-line pl-3"><div data-type="stat" className="t-stat font-display text-[18px] leading-none text-accent-strong">4.9/5</div><div className="mt-1 text-[9.5px] text-ink-3">Client rating</div></div>
          </div>
        </div>

        {/* a section of cards */}
        <div data-pal="surfaces" className="bg-bg px-4 py-5">
          <div data-pal="details" data-type="label" className="flex items-center gap-1.5"><span className="h-2.5 w-[3px] rounded-full bg-label-bar" /><span className="eyebrow !text-[9px]">What we treat</span></div>
          <h4 data-type="section-title" className="t-section-title mt-1.5 font-display text-[16px] leading-tight text-ink">Care built around you</h4>
          <p data-type="section-lead" className="t-section-lead mt-1 text-[10px] leading-snug text-ink-3">Every clinician here specialises.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {['bg-tone-1', 'bg-tone-2', 'bg-tone-3', 'bg-tone-4'].map((tone, i) => (
              <div key={tone} data-pal="tones" className={`rounded-xl border border-line p-2.5 ${tone}`}>
                <span data-pal="brand-tints" className="grid size-5 place-items-center rounded-full bg-brand-500 text-[9px] text-on-brand">✓</span>
                <div data-type="card-title" className="t-card-title mt-1.5 text-[10.5px] font-medium text-ink">{['Individual', 'Couples', 'Trauma', 'Teens'][i]}</div>
                <div data-type="card-text" className="t-card-text text-[9px] leading-snug text-ink-3">50 min · Start here</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span data-pal="brand-tints" data-type="pill" className="t-pill rounded-full border border-brand-300 bg-brand-100 px-2 py-0.5 text-[9px] text-ink">CBT</span>
            <span data-pal="surfaces" data-type="pill" className="t-pill rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[9px] text-ink-2">DBT</span>
            <span data-pal="text" data-type="pill" className="t-pill rounded-full bg-ink px-2 py-0.5 text-[9px] text-on-ink">All</span>
          </div>
          <p data-pal="details" className="mt-3 text-[10.5px] font-semibold text-ink"><span className="underline decoration-link-mark decoration-2 underline-offset-2">See every service</span> →</p>
          <div data-type="faq" className="t-faq mt-3 border-t border-line pt-2 font-display text-[12px] leading-snug text-ink-2">How soon can I start?</div>
        </div>

        {/* tinted band */}
        <div data-pal="band" className="backdrop-soft px-4 py-4">
          <div data-pal="details" data-type="label" className="flex items-center gap-1.5"><span className="h-2.5 w-[3px] rounded-full bg-label-bar" /><span className="eyebrow !text-[9px]">In their words</span></div>
          <blockquote data-pal="tones" data-type="quote" className="t-quote mt-2 rounded-xl border border-line bg-tone-3 p-2.5 font-display text-[11.5px] font-medium leading-snug text-ink">
            “I had been meaning to see someone for two years.”
          </blockquote>
          <div data-pal="breathing" data-type="breath" className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-surface p-2">
            <span className="size-5 rounded-full bg-tone-1" />
            <span className="t-breath font-display text-[10.5px] text-ink">Breathe in</span>
            <span className="ml-auto flex gap-1"><span className="size-2 rounded-full bg-breath-in" /><span className="size-2 rounded-full bg-breath-hold" /><span className="size-2 rounded-full bg-breath-out" /></span>
          </div>
        </div>

        {/* dark band */}
        <div className="px-3 py-4">
          <div data-pal="deep" className="on-deep rounded-2xl px-4 py-4 text-center">
            <div data-type="cta-title" className="t-cta-title font-display text-[15px] leading-tight">You do not have to wait <span className="italic text-amber-500">in the room.</span></div>
            <p className="mt-1.5 text-[9.5px] text-on-deep/80">A moderated community for people working on the same things.</p>
            <span data-pal="buttons" data-type="button" className="t-button mt-2.5 inline-block rounded-full bg-btn-3 px-3 py-1.5 text-[10px] font-semibold text-btn-3-ink">Join our community</span>
          </div>
        </div>

        {/* pop-up and phone bar */}
        <div className="grid grid-cols-2 gap-2 px-3 pb-4">
          <div data-pal="popup" className="zone-popup rounded-xl border border-line bg-surface p-2 shadow-[var(--shadow-card)]">
            <div data-type="dialog-title" className="t-dialog-title font-display text-[11px] text-ink">Pick a time</div>
            <div data-type="nav" className="t-nav mt-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] text-ink-2">Anxiety</div>
            <div data-type="field" className="t-field mt-1 rounded-md border border-field-line px-1.5 py-0.5 text-[9px] text-ink-3">you@email.com</div>
          </div>
          <div className="flex items-end">
            <div data-pal="mobilebar" className="zone-mobilebar flex w-full items-center gap-1.5 rounded-full border border-line bg-surface/95 p-1 pl-2 shadow-[var(--shadow-card)]">
              <span className="text-[10px] text-ink-2">☏</span>
              <span data-type="button" className="t-button flex-1 rounded-full bg-btn px-2 py-1 text-center text-[9px] font-semibold text-btn-ink">Join</span>
            </div>
          </div>
        </div>

        {/* article */}
        <div data-pal="article" className="border-t border-line px-4 py-3">
          <div data-type="article-title" className="t-article-title font-display text-[13px] text-article-heading">What happens in a first session</div>
          <div data-type="article-text" className="prose-lumen !max-w-none !text-[10px] !leading-relaxed">
            <p className="!mb-1 mt-1">The first session is mostly <a>getting to know each other</a>.</p>
            <blockquote data-type="article-quote" className="!mb-0 !pl-2 !text-[10px]">“I wish I had come sooner.”</blockquote>
          </div>
        </div>

        {/* footer */}
        <div data-pal="footer" data-type="footer" className="zone-footer border-t border-line bg-bg">
          <div data-pal="crisis" data-type="crisis" className="zone-crisis border-b border-line bg-amber-500 px-3 py-1.5 text-center text-[9.5px] text-ink">
            In immediate crisis? <span className="text-ink-2">Call 14416, free, 24/7.</span>
          </div>
          <div className="grid grid-cols-2 gap-2 px-4 py-3">
            <div>
              <div data-type="brand" className="t-brand font-display text-[12px] font-semibold text-ink">{brand.name}</div>
              <div className="mt-1 text-[9px] text-ink-3">{brand.email}</div>
            </div>
            <div>
              <div data-type="footer-heading" className="eyebrow !text-[8.5px]">Practice</div>
              <div className="mt-1 text-[9.5px] text-ink-3">Our services</div>
              <div className="text-[9.5px] text-ink-3">How it works</div>
            </div>
          </div>
          <div className="border-t border-line px-4 py-2 text-[8.5px] text-ink-4">© {new Date().getFullYear()} {brand.name}</div>
        </div>
      </div>
    </div>
  );
}
