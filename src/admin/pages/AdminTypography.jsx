import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllContent, upsertContent } from '../../lib/queries/siteContent';
import { PALETTE_KEY, overridesFromContent, previewVarsFor } from '../../lib/palette';
import {
  BLOCKS, CASES, FONTS, FONT_BY_ID, PROPS, STYLES, TYPE_GROUPS, TYPE_KEY, TYPE_PRESETS, WEIGHTS,
  parseType, sanitizeBlock, sanitizeType,
} from '../../lib/typography';
import { writeTypePreview } from '../../lib/theme';
import { useSearch } from '../hooks';
import { Button, ErrorState, PageHeader, Panel, SearchInput, TableSkeleton } from '../components/ui';
import { DesignTabs, JumpBar, MiniSite } from '../components/design';
import { useGroupNav, usePreviewType } from '../designHooks';
import { brand } from '../../data/site';

/**
 * Admin → Fonts & text.
 *
 * Every kind of text on the site as a block with its own font, weight,
 * italic, size, letter spacing, line height and capitals. Anything on Auto
 * keeps what the site does today; "Body text" and "Headings" set the two
 * fonts everything else follows. The block list and the fonts on offer live
 * in src/lib/typography.js.
 */

/** Blocks the site sets in the heading font by default — their Auto shows that. */
const DISPLAY_BLOCKS = new Set([
  'headings', 'brand', 'hero-title', 'hero-word', 'stat', 'page-title', 'section-title', 'cta-title',
  'card-title', 'quote', 'faq', 'breath', 'dialog-title', 'article-title', 'article-heading',
]);

const SAMPLES = {
  body: 'Licensed clinicians, matched to you by a human in under a day.',
  headings: 'Care built around the thing you came for',
  nav: 'Care   Resources   How it works',
  brand: brand.name,
  button: 'Join our community →',
  pill: 'Taking new clients',
  label: 'What we treat',
  'hero-title': 'Therapy for anxiety',
  'hero-word': 'anxiety',
  'hero-text': 'Video, phone or in person — and a first session this week.',
  stat: '14,200+',
  'page-title': 'Everything we offer',
  'page-lead': 'Every clinician here specialises, so you are never handed to whoever is free.',
  'section-title': 'Something to take with you.',
  'section-lead': 'Articles and short videos from the clinical team.',
  'cta-title': 'You do not have to wait in the room.',
  'card-title': 'Individual therapy',
  'card-text': 'Weekly one-to-one work on anxiety, depression and burnout.',
  quote: '“I had been meaning to see someone for two years.”',
  faq: 'How soon can I start?',
  breath: 'Breathe in · 4',
  'dialog-title': 'Pick a time',
  field: 'you@email.com',
  footer: 'Our services · How it works · Privacy policy',
  'footer-heading': 'Practice',
  crisis: 'In immediate crisis? Call 14416, free, 24/7.',
  'article-title': 'What actually happens in your first session',
  'article-text': 'The first session is mostly getting to know each other.',
  'article-heading': 'Before you arrive',
  'article-quote': '“I wish I had come sooner.”',
};

const DEVICE_NOTE = 'Already on the visitor\'s device — nothing to download. Regular and bold only.';

function effectiveFont(id, draft) {
  if (draft[id]?.font) return FONT_BY_ID[draft[id].font];
  if (DISPLAY_BLOCKS.has(id)) return FONT_BY_ID[draft.headings?.font ?? 'fraunces'];
  return FONT_BY_ID[draft.body?.font ?? 'jakarta'];
}

export default function AdminTypography() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saved, setSaved] = useState({});
  const [draft, setDraft] = useState({});
  const [palette, setPalette] = useState({});
  const [saving, setSaving] = useState(false);
  const [previewOn, setPreviewOn] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const previewRef = useRef(null);

  const load = useCallback(() => {
    getAllContent()
      .then((rows) => {
        const stored = {};
        let paletteText = '';
        let typeText = '';
        for (const r of rows) {
          if (r.key.startsWith('brand.')) stored[r.key.slice(6)] = r.value;
          if (r.key === PALETTE_KEY) paletteText = r.value;
          if (r.key === TYPE_KEY) typeText = r.value;
        }
        const type = parseType(typeText);
        setPalette(overridesFromContent({ brand: stored, palette: paletteText }));
        setSaved(type);
        setDraft(type);
      })
      .catch((err) => setLoadError(err?.message || 'Could not reach the content database.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  // The preview wears the saved colours, and the draft fonts.
  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    for (const [name, value] of Object.entries(previewVarsFor(palette))) el.style.setProperty(name, value);
  }, [palette, loading]);
  usePreviewType(draft);

  const dirtyIds = useMemo(() => {
    const ids = new Set([...Object.keys(saved), ...Object.keys(draft)]);
    return [...ids].filter((id) => JSON.stringify(saved[id] ?? {}) !== JSON.stringify(draft[id] ?? {}));
  }, [saved, draft]);
  const dirty = dirtyIds.length > 0;

  useEffect(() => {
    if (!dirty) return undefined;
    const onLeave = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);

  useEffect(() => {
    if (!previewOn) return undefined;
    const timer = setTimeout(() => writeTypePreview(draft), 80);
    return () => clearTimeout(timer);
  }, [previewOn, draft]);
  useEffect(() => () => writeTypePreview(null), []);

  const setBlock = useCallback((id, patch) => {
    setDraft((prev) => {
      const blk = BLOCKS.find((x) => x.id === id);
      const merged = { ...(prev[id] ?? {}), ...patch };
      for (const [k, v] of Object.entries(patch)) if (v === undefined || v === '' || v === null) delete merged[k];
      const clean = sanitizeBlock(merged, blk.props);
      const next = { ...prev };
      if (Object.keys(clean).length) next[id] = clean; else delete next[id];
      return next;
    });
  }, []);
  const resetBlock = useCallback((id) => setDraft((prev) => { const next = { ...prev }; delete next[id]; return next; }), []);

  const applyPreset = (preset) => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const id of ['body', 'headings']) {
        const clean = sanitizeBlock(preset[id], BLOCKS.find((x) => x.id === id).props);
        if (Object.keys(clean).length) next[id] = clean; else delete next[id];
      }
      return next;
    });
  };

  const togglePreview = () => {
    if (previewOn) { writeTypePreview(null); setPreviewOn(false); return; }
    writeTypePreview(draft);
    setPreviewOn(true);
    window.open('/', 'lumen-palette-preview');
  };

  const save = async () => {
    setSaving(true);
    try {
      const clean = sanitizeType(draft);
      await upsertContent({ key: TYPE_KEY, value: JSON.stringify(clean), section: 'theme', label: 'Fonts & text', type: 'json' });
      setSaved(clean);
      toast.success('Fonts saved — live on the next page load.');
    } catch (err) {
      toast.error(err?.message || 'Could not save the fonts.');
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(() => BLOCKS.map((blk) => ({
    ...blk,
    groupTitle: TYPE_GROUPS.find((g) => g.id === blk.group)?.title ?? '',
  })), []);
  const { query, setQuery, filtered } = useSearch(rows, ['label', 'hint', 'groupTitle']);
  const visible = useMemo(() => new Set(filtered.map((r) => r.id)), [filtered]);
  const changedCount = Object.keys(draft).length;
  const nav = useGroupNav('type', TYPE_GROUPS.map((g) => g.id), !loading);
  const blockLabels = useMemo(() => Object.fromEntries(BLOCKS.map((blk) => [blk.id, blk.label])), []);
  const groupOf = useMemo(() => Object.fromEntries(BLOCKS.map((blk) => [blk.id, blk.group])), []);

  const pickBlock = (id) => {
    setQuery('');
    setOnlyChanged(false);
    setExpanded((prev) => new Set(prev).add(id));
    requestAnimationFrame(() => {
      const el = document.getElementById(`type-block-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.animate?.([{ backgroundColor: 'rgb(204 251 241)' }, { backgroundColor: 'transparent' }], { duration: 1400 });
      } else {
        nav.jump(groupOf[id]);
      }
    });
  };

  if (loadError) {
    return (
      <>
        <DesignTabs />
        <PageHeader title="Fonts & text" />
        <Panel><ErrorState message={loadError} onRetry={() => { setLoadError(null); setLoading(true); load(); }} /></Panel>
      </>
    );
  }

  return (
    <>
      <DesignTabs />
      <PageHeader
        title="Fonts & text"
        subtitle={`The font and style of every kind of text on the site. ${changedCount} block${changedCount === 1 ? '' : 's'} changed, the rest follow Body text and Headings. Click any text in the preview to jump to it. Saved changes go live on the next page load.`}
      />

      <JumpBar
        groups={TYPE_GROUPS}
        active={nav.active}
        onJump={nav.jump}
        changedIn={(id) => TYPE_GROUPS.find((g) => g.id === id).blocks.filter((blk) => draft[blk.id]).length}
        dirtyCount={dirtyIds.length}
        saving={saving || loading}
        onSave={save}
        onDiscard={() => setDraft(saved)}
      >
        <Button variant="ghost" onClick={togglePreview} aria-pressed={previewOn} className="!px-3 !py-1.5 !text-xs">
          {previewOn ? '● Previewing — stop' : 'Preview on site ↗'}
        </Button>
      </JumpBar>

      {previewOn && (
        <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          The site is open in another tab and follows every change you make here, before you save. Only you
          can see it, in this browser. Visitors keep seeing the saved fonts.
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <Panel className="p-5">
            <p className="text-[15px] font-semibold text-gray-900">Start from a pairing</p>
            <p className="mt-0.5 text-xs text-gray-500">Sets Body text and Headings. Anything you have set on a single block stays as it is.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {TYPE_PRESETS.map((p) => {
                const head = FONT_BY_ID[p.headings.font ?? 'fraunces'];
                const body = FONT_BY_ID[p.body.font ?? 'jakarta'];
                const active = JSON.stringify(sanitizeBlock(p.headings)) === JSON.stringify(draft.headings ?? {})
                  && JSON.stringify(sanitizeBlock(p.body)) === JSON.stringify(draft.body ?? {});
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`rounded-lg border p-3 text-left transition hover:border-gray-400 ${active ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'}`}
                  >
                    <span className="block text-[18px] leading-tight text-gray-900" style={{ fontFamily: head.stack, fontWeight: p.headings.weight ?? 500 }}>{p.name}</span>
                    <span className="mt-1 block text-[11.5px] leading-snug text-gray-500" style={{ fontFamily: body.stack }}>
                      {head.name} + {body.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Find text — button, footer, headline, menu…"
            resultCount={filtered.length}
            total={rows.length}
          />
          <div className="-mt-1 flex flex-wrap items-center gap-4 text-xs text-gray-600">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} className="accent-gray-800" />
              Only changed blocks ({changedCount})
            </label>
            <button
              type="button"
              onClick={() => setExpanded((prev) => (prev.size ? new Set() : new Set(BLOCKS.map((blk) => blk.id))))}
              className="underline decoration-gray-300 underline-offset-2 hover:text-gray-900"
            >
              {expanded.size ? 'Close all options' : 'Open all options'}
            </button>
          </div>

          {loading ? (
            <Panel><TableSkeleton rows={8} cols={3} /></Panel>
          ) : (
            TYPE_GROUPS.map((group) => {
              const blocks = group.blocks.filter((blk) => visible.has(blk.id) && (!onlyChanged || draft[blk.id]));
              if (!blocks.length) return null;
              const changed = group.blocks.filter((blk) => draft[blk.id]).length;
              return (
                <div key={group.id} id={`type-${group.id}`} className={`scroll-mt-24 rounded-xl transition-shadow duration-500 ${nav.flash === group.id ? 'ring-2 ring-teal-500 ring-offset-2' : ''}`}>
                  <Panel>
                    <div className="px-5 pb-3 pt-4">
                      <span className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[15px] font-semibold text-gray-900">{group.title}</span>
                        {changed > 0 && <span className="rounded-full bg-amber-100 px-2 py-px text-[10.5px] font-medium text-amber-800">{changed} changed</span>}
                      </span>
                      {group.blurb && <span className="mt-0.5 block text-xs text-gray-500">{group.blurb}</span>}
                    </div>
                    <div className="divide-y divide-gray-100 border-t border-gray-100 px-5">
                      {blocks.map((blk) => (
                        <BlockRow
                          key={blk.id}
                          block={blk}
                          settings={draft[blk.id] ?? {}}
                          autoFont={effectiveFont(blk.id, { ...draft, [blk.id]: undefined })}
                          dirty={dirtyIds.includes(blk.id)}
                          open={expanded.has(blk.id)}
                          onToggle={() => setExpanded((prev) => {
                            const next = new Set(prev);
                            if (next.has(blk.id)) next.delete(blk.id); else next.add(blk.id);
                            return next;
                          })}
                          onChange={setBlock}
                          onReset={resetBlock}
                        />
                      ))}
                    </div>
                  </Panel>
                </div>
              );
            })
          )}
          {!loading && onlyChanged && changedCount === 0 && (
            <Panel className="p-6 text-center text-sm text-gray-500">Nothing changed yet — every block follows Body text and Headings.</Panel>
          )}

          <Panel className="p-5">
            <p className="text-[15px] font-semibold text-gray-900">Start over</p>
            <p className="mt-0.5 text-xs text-gray-500">Puts every block back to the original fonts. Nothing changes on the site until you save.</p>
            <div className="mt-3">
              <Button
                variant="danger"
                onClick={() => {
                  if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000); return; }
                  setDraft({});
                  setConfirmReset(false);
                }}
              >
                {confirmReset ? 'Click again to reset every block' : 'Reset all fonts'}
              </Button>
            </div>
          </Panel>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <Panel>
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Preview</span>
              {dirty && <span className="text-[11px] text-amber-700">Unsaved</span>}
            </div>
            <div className="max-h-[calc(100vh-11rem)] overflow-y-auto">
              <MiniSite ref={previewRef} pick="type" labels={blockLabels} onPick={pickBlock} />
            </div>
          </Panel>
          <p className="px-1 text-[11px] leading-relaxed text-gray-500">
            Sizes are shrunk to fit this preview. On the site, big sizes also scale down on phones by themselves.
          </p>
        </aside>
      </div>
    </>
  );
}

// ── pieces ──────────────────────────────────────────────────────────────────

function BlockRow({ block, settings, autoFont, dirty, open, onToggle, onChange, onReset }) {
  const font = settings.font ? FONT_BY_ID[settings.font] : autoFont;
  const set = Object.keys(settings).length > 0;
  const has = (p) => block.props.includes(p);
  const [lo, hi] = font.weights;
  const weights = WEIGHTS.filter(([w]) => (font.kind === 'device' ? w === 400 || w === 700 : w >= lo && w <= hi));

  const sample = {
    fontFamily: font.stack,
    fontWeight: settings.weight,
    fontStyle: settings.style,
    letterSpacing: settings.tracking !== undefined ? `${settings.tracking}em` : undefined,
    lineHeight: settings.leading,
    textTransform: settings.case,
    fontSize: settings.size ? `${Math.min(settings.size, 30)}px` : undefined,
  };

  const summary = [
    settings.weight && WEIGHTS.find(([w]) => w === settings.weight)?.[1],
    settings.style === 'italic' && 'Italic',
    settings.size && `${settings.size}px`,
    settings.tracking !== undefined && `spacing ${settings.tracking}em`,
    settings.leading !== undefined && `line ${settings.leading}`,
    settings.case && settings.case !== 'none' && CASES.find(([c]) => c === settings.case)?.[1],
  ].filter(Boolean);

  return (
    <div id={`type-block-${block.id}`} className="-mx-5 scroll-mt-28 px-5 py-3.5">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 sm:flex-nowrap">
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-gray-900">{block.label}</span>
            {set ? (
              <span className="rounded-full bg-teal-50 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-teal-700">Set</span>
            ) : (
              <span className="rounded-full bg-gray-100 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-gray-500">Auto</span>
            )}
            {dirty && <span className="size-1.5 rounded-full bg-amber-500" title="Not saved yet" />}
            {summary.length > 0 && <span className="text-[11px] text-gray-500">· {summary.join(' · ')}</span>}
          </div>
          {block.hint && <p className="mt-0.5 text-xs leading-snug text-gray-500">{block.hint}</p>}
          <p className="mt-2 truncate text-[17px] leading-snug text-gray-800" style={sample}>{SAMPLES[block.id] ?? 'The quick brown fox'}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <FontPicker value={settings.font} autoFont={autoFont} onChange={(id) => onChange(block.id, { font: id })} />
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${open ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            {open ? 'Less' : 'Style…'}
          </button>
          <button
            type="button"
            onClick={() => onReset(block.id)}
            disabled={!set}
            title="Back to Auto"
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-600 transition hover:bg-gray-50 disabled:invisible"
          >
            Auto
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 grid gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:grid-cols-2 xl:grid-cols-3">
          {has('weight') && (
            <Field label="Weight" onAuto={settings.weight ? () => onChange(block.id, { weight: undefined }) : null}>
              <select
                value={settings.weight ?? ''}
                onChange={(e) => onChange(block.id, { weight: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
              >
                <option value="">Auto</option>
                {weights.map(([w, name]) => <option key={w} value={w}>{name} ({w})</option>)}
              </select>
            </Field>
          )}
          {has('style') && (
            <Field label="Style" onAuto={settings.style ? () => onChange(block.id, { style: undefined }) : null}>
              <Segmented
                value={settings.style ?? ''}
                options={[['', 'Auto'], ...STYLES]}
                onChange={(v) => onChange(block.id, { style: v || undefined })}
              />
            </Field>
          )}
          {has('case') && (
            <Field label="Capitals" onAuto={settings.case ? () => onChange(block.id, { case: undefined }) : null}>
              <select
                value={settings.case ?? ''}
                onChange={(e) => onChange(block.id, { case: e.target.value || undefined })}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
              >
                <option value="">Auto</option>
                {CASES.map(([c, name]) => <option key={c} value={c}>{name}</option>)}
              </select>
            </Field>
          )}
          {has('size') && (
            <Slider prop="size" value={settings.size} onChange={(v) => onChange(block.id, { size: v })} />
          )}
          {has('tracking') && (
            <Slider prop="tracking" value={settings.tracking} onChange={(v) => onChange(block.id, { tracking: v })} />
          )}
          {has('leading') && (
            <Slider prop="leading" value={settings.leading} onChange={(v) => onChange(block.id, { leading: v })} />
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, onAuto, children }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</span>
        {onAuto && <button type="button" onClick={onAuto} className="text-[11px] text-gray-500 underline underline-offset-2 hover:text-gray-900">Auto</button>}
      </div>
      {children}
    </div>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="flex rounded-md border border-gray-300 bg-white p-0.5">
      {options.map(([v, name]) => (
        <button
          key={v || 'auto'}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`flex-1 rounded px-2 py-1 text-xs transition ${value === v ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

const SLIDER_DEFAULTS = { size: 18, tracking: 0, leading: 1.4 };

function Slider({ prop, value, onChange }) {
  const { label, min, max, step, unit } = PROPS[prop];
  const auto = value === undefined;
  // The number box keeps what is being typed and applies it on Enter or when
  // leaving the box — clamping each keystroke would turn "7" into the minimum
  // before the "2" of "72" arrives.
  const [text, setText] = useState(auto ? '' : String(value));
  const [shown, setShown] = useState(value);
  if (shown !== value) { setShown(value); setText(value === undefined ? '' : String(value)); }
  const commit = () => {
    const t = text.trim();
    if (t === '') { if (!auto) onChange(undefined); return; }
    const n = Number(t);
    if (!Number.isFinite(n)) { setText(auto ? '' : String(value)); return; }
    const c = Math.min(max, Math.max(min, n));
    setText(String(c));
    onChange(c);
  };
  return (
    <Field label={label} onAuto={auto ? null : () => onChange(undefined)}>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={auto ? SLIDER_DEFAULTS[prop] : value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`min-w-0 flex-1 accent-gray-800 ${auto ? 'opacity-40' : ''}`}
          aria-label={label}
        />
        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder="Auto"
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
          className="w-16 rounded-md border border-gray-300 bg-white px-1.5 py-1 text-right text-xs tabular-nums"
          aria-label={`${label} value`}
        />
        {unit && <span className="w-4 text-[11px] text-gray-500">{unit}</span>}
      </div>
    </Field>
  );
}

/**
 * A font dropdown where every option is drawn in its own font, grouped by
 * where it comes from. Only fonts from the supported list can be chosen.
 */
function FontPicker({ value, autoFont, onChange }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const current = value ? FONT_BY_ID[value] : null;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const choose = (id) => { onChange(id); setOpen(false); };
  const groups = [
    ['Included with the site', FONTS.filter((f) => f.kind === 'bundled')],
    ['Standard on every device', FONTS.filter((f) => f.kind === 'device')],
  ];

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-44 items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-left text-sm text-gray-900 transition hover:border-gray-400"
      >
        <span className="truncate" style={{ fontFamily: (current ?? autoFont).stack }}>
          {current ? current.name : <span className="text-gray-500">Auto · {autoFont.name}</span>}
        </span>
        <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div role="listbox" className="absolute right-0 top-full z-40 mt-1 max-h-80 w-72 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => choose(undefined)}
            className={`flex w-full flex-col rounded-md px-2.5 py-1.5 text-left hover:bg-gray-50 ${!value ? 'bg-gray-100' : ''}`}
          >
            <span className="text-sm text-gray-900">Auto</span>
            <span className="text-[11px] text-gray-500">Follow the site ({autoFont.name})</span>
          </button>
          {groups.map(([title, list]) => (
            <div key={title}>
              <p className="px-2.5 pb-1 pt-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">{title}</p>
              {list.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="option"
                  aria-selected={value === f.id}
                  onClick={() => choose(f.id)}
                  title={f.kind === 'device' ? DEVICE_NOTE : f.note}
                  className={`flex w-full items-baseline justify-between gap-2 rounded-md px-2.5 py-1.5 text-left hover:bg-gray-50 ${value === f.id ? 'bg-gray-100' : ''}`}
                >
                  <span className="text-[15px] text-gray-900" style={{ fontFamily: f.stack }}>{f.name}</span>
                  <span className="shrink-0 text-[10.5px] text-gray-400">{f.category}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
