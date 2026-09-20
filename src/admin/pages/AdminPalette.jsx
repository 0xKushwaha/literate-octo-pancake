import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllContent, upsertContent } from '../../lib/queries/siteContent';
import {
  CONTRAST_CHECKS, GROUPS, PALETTE_KEY, TOKENS, TOKEN_BY_ID,
  contentFromOverrides, normalizeHex, overridesFromContent, previewVarsFor, sanitizeOverrides,
} from '../../lib/palette';
import { writePreview } from '../../lib/theme';
import { SCHEMA_BY_KEY } from '../../data/contentSchema';
import { brand } from '../../data/site';
import { useSearch } from '../hooks';
import { Button, ErrorState, PageHeader, Panel, SearchInput, TableSkeleton } from '../components/ui';

/**
 * Admin → Colour palette.
 *
 * Every colour on the public site, grouped the way the page is laid out, each
 * one either "Auto" (following the main colours) or set by hand. Nothing
 * reaches the site until Save; "Preview on site" shows the draft on the real
 * pages in another tab, in this browser only.
 *
 * The token list lives in src/lib/palette.js — add a colour there and in
 * index.css and it appears here.
 */

/** Starting points. They set the three main colours and leave the rest alone. */
const PRESETS = [
  { name: 'Lumen (original)', colors: { accent: '#055F81', highlight: '#FFBF00', peach: '#FFCBA4' } },
  { name: 'Forest & honey', colors: { accent: '#2F5D50', highlight: '#F2B84B', peach: '#F4C7AB' } },
  { name: 'Plum & marigold', colors: { accent: '#5B2A6E', highlight: '#FFB400', peach: '#F7C6C7' } },
  { name: 'Ocean & coral', colors: { accent: '#0B4F6C', highlight: '#FF8A5B', peach: '#FFD6BA' } },
  { name: 'Clay & sage', colors: { accent: '#8A4B2F', highlight: '#E9C46A', peach: '#CFDCC3' } },
];

/** Groups folded away until opened: fine-tuning most people never need. */
const ADVANCED = new Set(['lines', 'brand-tints', 'warm-tints']);

/** What a zone colour falls back to when it is on Auto. */
const ZONE_FALLBACK = {
  'header-bg': '--color-bg', 'header-hover': '--color-surface-2', 'header-active': '--color-surface-3',
  'crisis-bg': '--color-amber-500', 'footer-bg': '--color-bg', 'band-bg': '--color-bg-2', 'hero-bg': '--color-bg-2',
  'mobilebar-bg': '--color-surface', 'popup-bg': '--color-surface',
};

function exprFor(tok) {
  if (tok.kind === 'theme') return `var(${tok.cssVar})`;
  if (tok.kind === 'slot') return `var(${tok.cssVar}, var(--color-ink-4))`;
  const fallback = ZONE_FALLBACK[tok.id] ?? (tok.slot === 'ink' ? '--color-ink' : '--color-bg');
  return `var(${tok.cssVar}, var(${fallback}))`;
}

// ── colour maths ────────────────────────────────────────────────────────────

let painter = null;
/** Any CSS colour → [r, g, b, a(0-255)], by painting a pixel. */
function toRgba(css) {
  if (!painter) painter = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  painter.clearRect(0, 0, 1, 1);
  painter.fillStyle = '#000';
  painter.fillStyle = css;
  painter.fillRect(0, 0, 1, 1);
  return [...painter.getImageData(0, 0, 1, 1).data];
}

const hex2 = (n) => n.toString(16).padStart(2, '0');
function rgbaToHex([r, g, b, a]) {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${a < 255 ? hex2(a) : ''}`;
}

function over([r, g, b, a], [R, G, B]) {
  const k = a / 255;
  return [Math.round(r * k + R * (1 - k)), Math.round(g * k + G * (1 - k)), Math.round(b * k + B * (1 - k)), 255];
}

function luminance([r, g, b]) {
  const f = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// ── the page ────────────────────────────────────────────────────────────────

export default function AdminPalette() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saved, setSaved] = useState({});
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [previewOn, setPreviewOn] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [openAdvanced, setOpenAdvanced] = useState(() => new Set());
  const [resolved, setResolved] = useState({});
  const [checks, setChecks] = useState([]);
  const previewRef = useRef(null);
  const probeRef = useRef(null);

  const load = useCallback(() => {
    getAllContent()
      .then((rows) => {
        const stored = {};
        let palette = '';
        for (const r of rows) {
          if (r.key.startsWith('brand.')) stored[r.key.slice(6)] = r.value;
          if (r.key === PALETTE_KEY) palette = r.value;
        }
        const overrides = overridesFromContent({ brand: stored, palette });
        setSaved(overrides);
        setDraft(overrides);
      })
      .catch((err) => setLoadError(err?.message || 'Could not reach the content database.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirtyIds = useMemo(() => {
    const ids = new Set([...Object.keys(saved), ...Object.keys(draft)]);
    return [...ids].filter((id) => saved[id] !== draft[id]);
  }, [saved, draft]);
  const dirty = dirtyIds.length > 0;

  // Leaving with unsaved colours asks first.
  useEffect(() => {
    if (!dirty) return undefined;
    const onLeave = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);

  // The live preview on the real site, in another tab of this browser.
  useEffect(() => {
    if (!previewOn) return undefined;
    const timer = setTimeout(() => writePreview(draft), 80);
    return () => clearTimeout(timer);
  }, [previewOn, draft]);
  useEffect(() => () => writePreview(null), []);

  // Paint the mini preview, then read back every colour as the browser sees it.
  useLayoutEffect(() => {
    const el = previewRef.current;
    const probe = probeRef.current;
    if (!el || !probe) return;
    const vars = previewVarsFor(draft);
    for (const [name, value] of Object.entries(vars)) el.style.setProperty(name, value);

    const read = (expr) => {
      probe.style.color = expr;
      return toRgba(getComputedStyle(probe).color);
    };
    const next = {};
    for (const tok of TOKENS) next[tok.id] = rgbaToHex(read(exprFor(tok)));
    setResolved(next);

    const white = [255, 255, 255, 255];
    setChecks(CONTRAST_CHECKS.map(([fg, bg, label]) => {
      const ground = over(read(bg), white);
      const ratio = contrast(over(read(fg), ground), ground);
      return { label, ratio, fg: rgbaToHex(over(read(fg), ground)), bg: rgbaToHex(ground) };
    }));
  }, [draft, loading]);

  const setColor = useCallback((id, hex) => {
    setDraft((prev) => {
      const next = { ...prev };
      const clean = normalizeHex(hex);
      if (clean) next[id] = clean; else delete next[id];
      return next;
    });
  }, []);

  const resetOne = useCallback((id) => setColor(id, ''), [setColor]);

  const applyPreset = (preset) => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const [id, hex] of Object.entries(preset.colors)) {
        if (normalizeHex(hex) === normalizeHex(TOKEN_BY_ID[id].value)) delete next[id];
        else next[id] = normalizeHex(hex);
      }
      return next;
    });
  };

  const togglePreview = () => {
    if (previewOn) {
      writePreview(null);
      setPreviewOn(false);
      return;
    }
    writePreview(draft);
    setPreviewOn(true);
    window.open('/', 'lumen-palette-preview');
  };

  const save = async () => {
    setSaving(true);
    try {
      const { core, palette } = contentFromOverrides(draft);
      const before = contentFromOverrides(saved);
      for (const [key, value] of Object.entries(core)) {
        if (before.core[key] === value) continue;
        const schema = SCHEMA_BY_KEY[key];
        await upsertContent({ key, value, section: 'brand', label: schema?.label ?? key, type: 'text' });
      }
      if (before.palette !== palette) {
        await upsertContent({ key: PALETTE_KEY, value: palette, section: 'theme', label: 'Colour palette', type: 'json' });
      }
      setSaved(sanitizeOverrides(draft));
      toast.success('Colours saved — live on the next page load.');
    } catch (err) {
      toast.error(err?.message || 'Could not save the colours.');
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(() => TOKENS.map((tok) => ({
    ...tok,
    groupTitle: GROUPS.find((g) => g.id === tok.group)?.title ?? '',
  })), []);
  const { query, setQuery, filtered } = useSearch(rows, ['label', 'hint', 'groupTitle', 'cssVar', 'follows']);
  const searching = query.trim().length > 0;
  const visible = useMemo(() => new Set(filtered.map((r) => r.id)), [filtered]);
  const changedCount = Object.keys(draft).length;
  const poor = checks.filter((c) => c.ratio < 4.5);

  if (loadError) {
    return (
      <>
        <PageHeader title="Colour palette" />
        <Panel><ErrorState message={loadError} onRetry={() => { setLoadError(null); setLoading(true); load(); }} /></Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Colour palette"
        subtitle={`Every colour on the public site. ${changedCount} set by hand, the rest follow the main colours. Saved colours go live on the next page load — no rebuild.`}
      >
        <Button variant="ghost" onClick={togglePreview} aria-pressed={previewOn}>
          {previewOn ? '● Previewing — stop' : 'Preview on site ↗'}
        </Button>
        {dirty && (
          <Button variant="ghost" onClick={() => setDraft(saved)} disabled={saving}>Discard</Button>
        )}
        <Button onClick={save} disabled={!dirty || saving || loading}>
          {saving ? 'Saving…' : dirty ? `Save ${dirtyIds.length} change${dirtyIds.length === 1 ? '' : 's'}` : 'Saved'}
        </Button>
      </PageHeader>

      {previewOn && (
        <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          The site is open in another tab and follows every change you make here, before you save. Only you
          can see it, in this browser. Visitors keep seeing the saved colours.
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <Panel className="p-5">
            <p className="text-[15px] font-semibold text-gray-900">Start from a set</p>
            <p className="mt-0.5 text-xs text-gray-500">Sets the three main colours. Anything you have set by hand stays as it is.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="flex items-center gap-2 rounded-full border border-gray-200 py-1.5 pl-1.5 pr-3 text-xs text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                >
                  <span className="flex -space-x-1">
                    {Object.values(p.colors).map((c) => (
                      <Swatch key={c} color={c} className="size-5 rounded-full ring-2 ring-white" />
                    ))}
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          </Panel>

          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Find a colour — button, footer, link, header…"
            resultCount={filtered.length}
            total={rows.length}
          />

          {loading ? (
            <Panel><TableSkeleton rows={8} cols={3} /></Panel>
          ) : (
            GROUPS.map((group) => {
              const tokens = group.tokens.filter((tok) => visible.has(tok.id));
              if (!tokens.length) return null;
              const changed = group.tokens.filter((tok) => draft[tok.id]).length;
              const advanced = ADVANCED.has(group.id);
              const open = searching || !advanced || openAdvanced.has(group.id);
              return (
                <Panel key={group.id}>
                  <button
                    type="button"
                    disabled={!advanced || searching}
                    onClick={() => setOpenAdvanced((prev) => {
                      const next = new Set(prev);
                      if (next.has(group.id)) next.delete(group.id); else next.add(group.id);
                      return next;
                    })}
                    className="flex w-full items-start gap-3 px-5 pt-4 pb-3 text-left disabled:cursor-default"
                    aria-expanded={open}
                  >
                    {advanced && <span className={`mt-0.5 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>}
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[15px] font-semibold text-gray-900">{group.title}</span>
                        {advanced && <span className="text-[11px] text-gray-400">fine-tuning</span>}
                        {changed > 0 && (
                          <span className="rounded-full bg-amber-100 px-2 py-px text-[10.5px] font-medium text-amber-800">{changed} set by hand</span>
                        )}
                      </span>
                      {group.blurb && <span className="mt-0.5 block text-xs text-gray-500">{group.blurb}</span>}
                    </span>
                    {!open && (
                      <span className="flex shrink-0 -space-x-1">
                        {group.tokens.map((tok) => <Swatch key={tok.id} color={resolved[tok.id]} className="size-4 rounded-full ring-2 ring-white" />)}
                      </span>
                    )}
                  </button>
                  {open && (
                    <div className="divide-y divide-gray-100 border-t border-gray-100 px-5">
                      {tokens.map((tok) => (
                        <TokenRow
                          key={tok.id}
                          token={tok}
                          value={draft[tok.id] ?? ''}
                          resolved={resolved[tok.id]}
                          dirty={saved[tok.id] !== draft[tok.id]}
                          onChange={setColor}
                          onReset={resetOne}
                        />
                      ))}
                    </div>
                  )}
                </Panel>
              );
            })
          )}

          <Panel className="p-5">
            <p className="text-[15px] font-semibold text-gray-900">Start over</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Puts every colour back to the original Lumen palette. Nothing changes on the site until you save.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                variant="danger"
                onClick={() => {
                  if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000); return; }
                  setDraft({});
                  setConfirmReset(false);
                }}
              >
                {confirmReset ? 'Click again to reset every colour' : 'Reset all colours'}
              </Button>
            </div>
            <Backup draft={draft} onLoad={(o) => setDraft(o)} />
          </Panel>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <Panel>
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Preview</span>
              {dirty && <span className="text-[11px] text-amber-700">Unsaved</span>}
            </div>
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
              <MiniSite ref={previewRef} probeRef={probeRef} />
            </div>
          </Panel>

          <Panel className="p-4">
            <p className="text-sm font-semibold text-gray-900">Readability</p>
            {poor.length === 0 ? (
              <p className="mt-1 text-xs text-gray-500">Every text and background pair checked here is easy to read (4.5:1 or better).</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">These pairs are hard to read. Aim for 4.5 or more; under 3 most people will struggle.</p>
            )}
            <ul className="mt-3 space-y-1.5">
              {(poor.length ? poor : checks).map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-xs">
                  <span className="grid h-5 w-8 shrink-0 place-items-center rounded text-[10px] font-semibold" style={{ backgroundColor: c.bg, color: c.fg }}>Aa</span>
                  <span className="min-w-0 flex-1 truncate text-gray-700">{c.label}</span>
                  <span className={`tabular-nums font-medium ${c.ratio < 3 ? 'text-red-600' : c.ratio < 4.5 ? 'text-amber-700' : 'text-gray-500'}`}>
                    {c.ratio.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </>
  );
}

// ── pieces ──────────────────────────────────────────────────────────────────

function Swatch({ color, className = '' }) {
  // A checkerboard under the colour, so a see-through one reads as see-through.
  return (
    <span className={`relative block shrink-0 overflow-hidden bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:8px_8px] ${className}`}>
      <span className="absolute inset-0" style={{ backgroundColor: color || 'transparent' }} />
    </span>
  );
}

function TokenRow({ token, value, resolved, dirty, onChange, onReset }) {
  const current = value || resolved || '#000000';
  const [text, setText] = useState(value);
  const [invalid, setInvalid] = useState(false);
  // Follow the stored value when it changes from outside the box (the picker,
  // a preset, Auto), adjusting during render rather than in an effect.
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setText(value);
    setInvalid(false);
  }

  const alphaHex = current.length === 9 ? current.slice(7) : '';
  const alphaPct = alphaHex ? Math.round((parseInt(alphaHex, 16) / 255) * 100) : 100;

  const commitText = () => {
    const raw = text.trim();
    if (!raw) { if (value) onReset(token.id); setInvalid(false); return; }
    const withHash = raw.startsWith('#') ? raw : `#${raw}`;
    const hex = normalizeHex(withHash);
    if (!hex) { setInvalid(true); return; }
    setInvalid(false);
    onChange(token.id, hex);
  };

  const pick = (e) => onChange(token.id, `${e.target.value}${alphaHex}`);
  const setAlpha = (pct) => {
    const a = Math.round((Number(pct) / 100) * 255);
    onChange(token.id, `${current.slice(0, 7)}${a >= 255 ? '' : hex2(a)}`);
  };

  const auto = !value;
  const follows = token.follows ?? (token.kind === 'theme' && token.value.startsWith('var(') ? 'another colour' : null);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:flex-nowrap">
      <label className="relative size-10 shrink-0 cursor-pointer rounded-lg shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]" title="Pick a colour">
        <Swatch color={current} className="size-full rounded-lg" />
        <input
          type="color"
          value={current.slice(0, 7)}
          onChange={pick}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-label={`${token.label} colour`}
        />
      </label>

      <div className="min-w-0 flex-1 basis-48">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-gray-900">{token.label}</span>
          {auto ? (
            <span className="rounded-full bg-gray-100 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-gray-500">Auto</span>
          ) : (
            <span className="rounded-full bg-teal-50 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-teal-700">Set</span>
          )}
          {dirty && <span className="size-1.5 rounded-full bg-amber-500" title="Not saved yet" />}
        </div>
        {(token.hint || (auto && follows)) && (
          <p className="mt-0.5 text-xs leading-snug text-gray-500">
            {token.hint}
            {auto && follows && <span className="text-gray-400">{token.hint ? ' · ' : ''}Follows {follows}.</span>}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {token.alpha && (
          <label className="flex items-center gap-1 text-[11px] text-gray-500" title="Strength">
            <input
              type="range"
              min="0"
              max="100"
              value={alphaPct}
              onChange={(e) => setAlpha(e.target.value)}
              className="w-16 accent-gray-700"
              aria-label={`${token.label} strength`}
            />
            <span className="w-8 tabular-nums">{alphaPct}%</span>
          </label>
        )}
        <input
          type="text"
          value={text}
          placeholder={resolved || ''}
          spellCheck={false}
          onChange={(e) => { setText(e.target.value); setInvalid(false); }}
          onBlur={commitText}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitText(); } }}
          aria-label={`${token.label} hex code`}
          aria-invalid={invalid}
          className={`w-[6.5rem] rounded-lg border px-2 py-1.5 font-mono text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-1 ${
            invalid ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:border-teal-500 focus:ring-teal-500'
          }`}
        />
        <button
          type="button"
          onClick={() => onReset(token.id)}
          disabled={auto}
          title="Back to Auto"
          className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-600 transition hover:bg-gray-50 disabled:invisible"
        >
          Auto
        </button>
      </div>
    </div>
  );
}

function Backup({ draft, onLoad }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const current = JSON.stringify(draft, null, 2);
  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-gray-600 hover:text-gray-900" aria-expanded={open}>
        {open ? '▾' : '▸'} Back up or restore a palette
      </button>
      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-gray-500">This palette — copy it somewhere safe.</p>
            <textarea readOnly value={current} rows={7} className="w-full rounded-lg border border-gray-300 p-2 font-mono text-[11px] text-gray-700" onFocus={(e) => e.target.select()} />
          </div>
          <div>
            <p className="mb-1 text-xs text-gray-500">Paste a saved palette to load it (then Save).</p>
            <textarea value={text} onChange={(e) => { setText(e.target.value); setError(''); }} rows={7} className="w-full rounded-lg border border-gray-300 p-2 font-mono text-[11px] text-gray-700" />
            <div className="mt-1 flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(text);
                    onLoad(sanitizeOverrides(parsed));
                    setText('');
                  } catch {
                    setError('That is not a palette — paste the whole block, including the { }.');
                  }
                }}
                disabled={!text.trim()}
              >
                Load
              </Button>
              {error && <span className="text-xs text-red-600">{error}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A miniature of the site built from the same classes the real pages use, so
 * it recolours exactly the way they do. The palette variables are set on the
 * outer element by the page (previewVarsFor), which scopes them here.
 */
const MiniSite = function MiniSite({ ref, probeRef }) {
  return (
    <div ref={ref} className="palette-preview relative bg-bg font-sans text-ink" aria-hidden="true">
      <span ref={probeRef} className="pointer-events-none absolute size-0 opacity-0" />

      {/* header */}
      <div className="zone-header flex h-11 items-center justify-between gap-2 border-b border-line bg-bg px-3">
        <span className="font-display text-[14px] font-semibold tracking-tight text-ink">{brand.name}</span>
        <span className="flex items-center gap-0.5 text-[10.5px] font-medium">
          <span className="rounded-full bg-surface-3 px-2 py-1 text-ink">Care</span>
          <span className="relative rounded-full bg-surface-2 px-2 py-1 text-ink-2">
            Resources
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-badge px-1 text-[8px] font-semibold leading-3 text-badge-ink">New</span>
          </span>
        </span>
        <span className="rounded-full bg-btn px-2.5 py-1 text-[10px] font-semibold text-btn-ink">Join</span>
      </div>

      {/* hero */}
      <div className="backdrop-soft zone-hero px-4 pb-4 pt-5">
        <span className="inline-flex items-center rounded-full border border-peach-200/60 bg-peach-100 px-2 py-0.5 text-[9px] font-medium text-ink">Taking new clients</span>
        <h3 className="mt-2 font-display text-[23px] leading-[1.05] tracking-tight text-ink">
          Therapy for <span className="mark text-aurora italic">anxiety</span>
        </h3>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-2">Licensed clinicians, matched to you by a human in under a day.</p>
        <div className="mt-3 flex gap-1.5">
          <span className="rounded-full bg-btn px-3 py-1.5 text-[10.5px] font-semibold text-btn-ink shadow-[var(--shadow-card)]">Join our community</span>
          <span className="rounded-full border border-btn-2-line bg-btn-2 px-3 py-1.5 text-[10.5px] font-semibold text-btn-2-ink">How it works</span>
        </div>
        <div className="mt-4 grid grid-cols-2 border-t border-line pt-2">
          <div><div className="font-display text-[18px] leading-none text-accent-strong">14,200+</div><div className="mt-1 text-[9.5px] text-ink-3">Sessions held</div></div>
          <div className="border-l border-line pl-3"><div className="font-display text-[18px] leading-none text-accent-strong">4.9/5</div><div className="mt-1 text-[9.5px] text-ink-3">Client rating</div></div>
        </div>
      </div>

      {/* a section of cards */}
      <div className="bg-bg px-4 py-5">
        <div className="flex items-center gap-1.5"><span className="h-2.5 w-[3px] rounded-full bg-label-bar" /><span className="eyebrow !text-[9px]">What we treat</span></div>
        <h4 className="mt-1.5 font-display text-[16px] leading-tight text-ink">Care built around you</h4>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {['bg-tone-1', 'bg-tone-2', 'bg-tone-3', 'bg-tone-4'].map((tone, i) => (
            <div key={tone} className={`rounded-xl border border-line p-2.5 ${tone}`}>
              <span className="grid size-5 place-items-center rounded-full bg-brand-500 text-[9px] text-on-brand">✓</span>
              <div className="mt-1.5 text-[10.5px] font-medium text-ink">{['Individual', 'Couples', 'Trauma', 'Teens'][i]}</div>
              <div className="text-[9px] leading-snug text-ink-3">50 min · Start here</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-brand-300 bg-brand-100 px-2 py-0.5 text-[9px] text-ink">CBT</span>
          <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[9px] text-ink-2">DBT</span>
          <span className="rounded-full bg-ink px-2 py-0.5 text-[9px] text-on-ink">All</span>
        </div>
        <p className="mt-3 text-[10.5px] font-semibold text-ink"><span className="underline decoration-link-mark decoration-2 underline-offset-2">See every service</span> →</p>
      </div>

      {/* tinted band */}
      <div className="backdrop-soft px-4 py-4">
        <div className="flex items-center gap-1.5"><span className="h-2.5 w-[3px] rounded-full bg-label-bar" /><span className="eyebrow !text-[9px]">One minute</span></div>
        <div className="mt-1 font-display text-[14px] text-ink">Before you go: breathe</div>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-surface p-2">
          <span className="size-5 rounded-full bg-tone-1" />
          <span className="text-[10px] text-ink">Box breathing <span className="text-ink-4">· 4 cycles</span></span>
        </div>
      </div>

      {/* dark band */}
      <div className="px-3 py-4">
        <div className="on-deep rounded-2xl px-4 py-4 text-center">
          <div className="font-display text-[15px] leading-tight">You do not have to wait <span className="italic text-amber-500">in the room.</span></div>
          <p className="mt-1.5 text-[9.5px] text-on-deep/80">A moderated community for people working on the same things.</p>
          <span className="mt-2.5 inline-block rounded-full bg-btn-3 px-3 py-1.5 text-[10px] font-semibold text-btn-3-ink">Join our community</span>
          <div className="mt-2.5 flex items-center justify-center gap-1">
            <span className="size-2 rounded-full bg-breath-in" /><span className="size-2 rounded-full bg-breath-hold" /><span className="size-2 rounded-full bg-breath-out" />
            <span className="ml-1 text-[8.5px] text-on-deep/60">in · hold · out</span>
          </div>
        </div>
      </div>

      {/* pop-up and phone bar */}
      <div className="grid grid-cols-2 gap-2 px-3 pb-4">
        <div className="zone-popup rounded-xl border border-line bg-surface p-2 shadow-[var(--shadow-card)]">
          <div className="text-[9px] font-semibold text-ink">Menu</div>
          <div className="mt-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] text-ink-2">Anxiety</div>
          <div className="px-1.5 py-0.5 text-[9px] text-ink-3">Couples</div>
        </div>
        <div className="flex items-end">
          <div className="zone-mobilebar flex w-full items-center gap-1.5 rounded-full border border-line bg-surface/95 p-1 pl-2 shadow-[var(--shadow-card)]">
            <span className="text-[10px] text-ink-2">☏</span>
            <span className="flex-1 rounded-full bg-btn px-2 py-1 text-center text-[9px] font-semibold text-btn-ink">Join</span>
          </div>
        </div>
      </div>

      {/* article */}
      <div className="border-t border-line px-4 py-3">
        <div className="font-display text-[13px] text-article-heading">From the blog</div>
        <p className="mt-1 text-[10px] leading-relaxed text-article-text">
          The first session is mostly <span className="underline decoration-article-link decoration-2 underline-offset-2">getting to know each other</span>.
        </p>
        <p className="mt-1.5 border-l-2 border-article-quote pl-2 text-[10px] italic text-ink-3">“I wish I had come sooner.”</p>
      </div>

      {/* footer */}
      <div className="zone-footer border-t border-line bg-bg">
        <div className="zone-crisis border-b border-line bg-amber-500 px-3 py-1.5 text-center text-[9.5px] text-ink">
          In immediate crisis? <span className="text-ink-2">Call 14416, free, 24/7.</span>
        </div>
        <div className="grid grid-cols-2 gap-2 px-4 py-3">
          <div>
            <div className="font-display text-[12px] font-semibold text-ink">{brand.name}</div>
            <div className="mt-1 text-[9px] text-ink-3">{brand.email}</div>
          </div>
          <div>
            <div className="eyebrow !text-[8.5px]">Practice</div>
            <div className="mt-1 text-[9.5px] text-ink-3">Our services</div>
            <div className="text-[9.5px] text-ink-3">How it works</div>
          </div>
        </div>
        <div className="border-t border-line px-4 py-2 text-[8.5px] text-ink-4">© {new Date().getFullYear()} {brand.name}</div>
      </div>
    </div>
  );
};
