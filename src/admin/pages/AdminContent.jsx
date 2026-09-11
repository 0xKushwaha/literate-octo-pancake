import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { deleteContent, getAllContent, upsertContent } from '../../lib/queries/siteContent';
import { parseJsonValue, stringifyContentValue } from '../../lib/contentMerge';
import {
  CONTENT_SCHEMA, PAGE_BLURBS, PAGE_ORDER, PAGE_PATHS, PAGE_TITLES,
  SCHEMA_BY_KEY, SECTION_ORDER, SECTION_PAGE, SECTION_TITLES,
} from '../../data/contentSchema';
import { iconNames } from '../../components/Icon';
import { useSearch } from '../hooks';
import { Button, EmptyState, PageHeader, Panel, SearchInput, TableSkeleton } from '../components/ui';

const SEARCH_FIELDS = ['label', 'key', 'value', 'section', 'sectionTitle', 'pageTitle', 'hint'];

const inputBase =
  'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500';
const dirtyBase =
  'w-full rounded-lg border border-amber-400 px-3 py-1.5 text-sm outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500';

/* ------------------------------------------------------------------ helpers */

/** Validates the text of a `json` field. Returns an error message or null. */
function validateJson(text, defaultValue) {
  const parsed = parseJsonValue(text);
  if (parsed === undefined) return 'Not valid JSON. Check for a missing comma, quote or bracket.';
  const wantArray = Array.isArray(defaultValue);
  if (wantArray && !Array.isArray(parsed)) return 'This field must be a list: it should start with [ and end with ].';
  if (!wantArray && (typeof parsed !== 'object' || parsed === null)) return 'This field must be an object: it should start with { and end with }.';
  return null;
}

/**
 * A one-line summary of a list item, for the collapsed row header.
 *
 * It prefers the field the schema names as `summaryKey`, so a stat reads
 * "Sessions held" rather than "14200" — the caption is what someone scanning
 * the page is looking for, not the number.
 */
function itemSummary(item, spec) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return '';
  const named = spec?.summaryKey && item[spec.summaryKey];
  const first = (spec?.fields ?? []).find((f) => !f.advanced && item[f.key] != null && item[f.key] !== '');
  const value = named || (first ? item[first.key] : Object.values(item)[0]);
  return Array.isArray(value) ? value.join(', ') : String(value ?? '');
}

function blankItem(spec) {
  if (spec?.itemType === 'string') return '';
  const out = {};
  for (const f of spec?.fields ?? []) {
    out[f.key] = f.type === 'number' ? 0 : f.type === 'boolean' ? false : f.type === 'tags' ? [] : '';
  }
  return out;
}

/* ------------------------------------------------------------- item fields */

function ItemField({ field, value, onChange }) {
  // A stable id per input: a fresh random one on every render would relabel the
  // field mid-keystroke.
  const id = useId();
  const common = { id, className: inputBase };

  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-[11px] font-medium text-gray-600">{field.label}</span>
      {field.type === 'richtext' ? (
        <textarea {...common} rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={`${inputBase} resize-y`} />
      ) : field.type === 'number' ? (
        <input {...common} type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
      ) : field.type === 'boolean' ? (
        <span className="flex h-[34px] items-center">
          <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="rounded" />
        </span>
      ) : field.type === 'tags' ? (
        <input
          {...common}
          type="text"
          value={Array.isArray(value) ? value.join(', ') : (value ?? '')}
          onChange={(e) => onChange(e.target.value.split(',').map((x) => x.trim()).filter(Boolean))}
        />
      ) : field.type === 'icon' ? (
        <select {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">None</option>
          {iconNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      ) : (
        <input {...common} type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.hint && <span className="mt-1 block text-[10.5px] text-gray-400">{field.hint}</span>}
    </label>
  );
}

/**
 * The row editor for a list field.
 *
 * Lists used to be a raw JSON textarea, which meant the four numbers under the
 * hero — the thing someone is most likely to want to change — could only be
 * edited by hand-writing JSON. Each entry is now a card of labelled inputs with
 * add, remove and reorder, and any key the schema does not describe is carried
 * through untouched so nothing is lost.
 */
function ListEditor({ spec, items, onChange, expandAll = false }) {
  const [open, setOpen] = useState(() => new Set([0]));
  const isStrings = spec.itemType === 'string';
  const toggle = (i) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  const setItem = (i, next) => onChange(items.map((item, n) => (n === i ? next : item)));
  const move = (i, by) => {
    const to = i + by;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[i], next[to]] = [next[to], next[i]];
    onChange(next);
  };
  const remove = (i) => onChange(items.filter((_, n) => n !== i));
  const add = () => {
    onChange([...items, blankItem(spec)]);
    setOpen((prev) => new Set(prev).add(items.length));
  };

  if (isStrings) {
    return (
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="text" value={item ?? ''} onChange={(e) => setItem(i, e.target.value)} className={inputBase} />
            <RowButtons i={i} count={items.length} onMove={move} onRemove={remove} />
          </div>
        ))}
        <AddButton onClick={add} label={spec.itemLabel ?? 'item'} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => {
        const isOpen = expandAll || open.has(i);
        return (
          <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/60">
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => toggle(i)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                aria-expanded={isOpen}
              >
                <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                <span className="shrink-0 text-[11px] font-medium text-gray-500">
                  {spec.itemLabel ?? 'Item'} {i + 1}
                </span>
                <span className="truncate text-[12.5px] text-gray-700">{itemSummary(item, spec)}</span>
              </button>
              <RowButtons i={i} count={items.length} onMove={move} onRemove={remove} />
            </div>
            {isOpen && (
              <div className="grid gap-3 border-t border-gray-200 px-3 py-3 sm:grid-cols-2">
                {(spec.fields ?? []).map((field) => (
                  <div key={field.key} className={field.type === 'richtext' ? 'sm:col-span-2' : ''}>
                    <ItemField
                      field={field}
                      value={item?.[field.key]}
                      onChange={(v) => setItem(i, { ...item, [field.key]: v })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <AddButton onClick={add} label={spec.itemLabel ?? 'item'} />
    </div>
  );
}

function RowButtons({ i, count, onMove, onRemove }) {
  const btn = 'grid size-7 shrink-0 place-items-center rounded-md text-gray-400 transition hover:bg-gray-200 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button type="button" className={btn} onClick={() => onMove(i, -1)} disabled={i === 0} title="Move up">↑</button>
      <button type="button" className={btn} onClick={() => onMove(i, 1)} disabled={i === count - 1} title="Move down">↓</button>
      <button
        type="button"
        className={`${btn} hover:bg-red-50 hover:text-red-600`}
        onClick={() => { if (window.confirm('Remove this entry?')) onRemove(i); }}
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

function AddButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-[12.5px] text-gray-500 transition hover:border-teal-400 hover:text-teal-700"
    >
      + Add {String(label).toLowerCase()}
    </button>
  );
}

/* --------------------------------------------------------------- field row */

function ContentRow({ item, onSave, onReset, expandAll = false }) {
  const saved = item.value ?? '';
  const [value, setValue] = useState(saved);
  const [seen, setSeen] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [raw, setRaw] = useState(false);
  const dirty = value !== saved;
  const isJson = item.type === 'json';
  const hasEditor = isJson && (item.fields || item.itemType);
  const jsonError = isJson ? validateJson(value, item.defaultValue) : null;
  const isDefault = !item.stored;

  // The parent replaces `item` whenever the list reloads. Without this the
  // input keeps showing whatever was in local state at first mount, which
  // looks exactly like "the admin panel is not updating the text".
  if (saved !== seen) {
    setSeen(saved);
    setValue(saved);
  }

  const parsed = hasEditor && !jsonError ? parseJsonValue(value) : undefined;
  const listItems = Array.isArray(parsed) ? parsed : [];

  const save = async () => {
    if (jsonError) { toast.error(jsonError); return; }
    setSaving(true);
    try {
      // Normalise JSON so what is stored is always well-formed and readable.
      const toStore = isJson ? JSON.stringify(JSON.parse(value), null, 2) : value;
      await upsertContent({ key: item.key, value: toStore, section: item.section, label: item.label, type: item.type });
      toast.success(`Saved "${item.label ?? item.key}"`);
      onSave(item.key, toStore);
    } catch (err) {
      // Surface the real reason — an RLS denial and a dropped connection are
      // very different problems and "Save failed" hides both.
      toast.error(err?.message || 'Save failed');
      console.error('[lumen] content save failed', item.key, err);
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm(`Reset "${item.label ?? item.key}" to the built-in default?`)) return;
    setSaving(true);
    try {
      await deleteContent(item.key);
      toast.success(`"${item.label ?? item.key}" reset to default`);
      onReset(item.key);
    } catch (err) {
      toast.error(err?.message || 'Reset failed');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = dirty ? dirtyBase : inputBase;

  return (
    <div className="border-b border-gray-100 py-4 last:border-0">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-[13px] font-medium text-gray-800">{item.label}</p>
        {isDefault ? (
          <span className="rounded-full bg-gray-100 px-1.5 py-px text-[10px] text-gray-500">default</span>
        ) : (
          <span className="rounded-full bg-teal-50 px-1.5 py-px text-[10px] text-teal-700">edited</span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {hasEditor && (
            <button
              type="button"
              onClick={() => setRaw((r) => !r)}
              className="text-[11px] text-gray-400 underline-offset-2 hover:text-gray-700 hover:underline"
            >
              {raw ? 'Use the editor' : 'Edit as JSON'}
            </button>
          )}
          {dirty && !saving && (
            <button onClick={() => setValue(saved)} className="rounded-lg px-2 py-1 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-gray-800">
              Undo
            </button>
          )}
          <button
            onClick={save}
            disabled={!dirty || saving || Boolean(jsonError)}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700 disabled:opacity-30"
          >
            {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </button>
        </span>
      </div>
      {item.hint && <p className="mb-2 text-[11.5px] text-gray-400">{item.hint}</p>}

      {hasEditor && !raw ? (
        jsonError ? (
          <p className="text-[12px] text-red-600">{jsonError} Switch to “Edit as JSON” to repair it.</p>
        ) : (
          <ListEditor
            spec={item}
            items={listItems}
            expandAll={expandAll}
            onChange={(next) => setValue(JSON.stringify(next, null, 2))}
          />
        )
      ) : isJson ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={Math.min(24, Math.max(6, value.split('\n').length + 1))}
          spellCheck={false}
          className={`${inputClass} resize-y font-mono text-[12px] leading-relaxed`}
        />
      ) : item.type === 'richtext' ? (
        <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} className={`${inputClass} resize-y`} />
      ) : item.type === 'number' ? (
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && dirty) { e.preventDefault(); save(); } }}
          className={`${inputClass} w-28`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && dirty) { e.preventDefault(); save(); } }}
          className={inputClass}
        />
      )}

      {jsonError && raw && <p className="mt-1 text-[11px] text-red-600">{jsonError}</p>}

      <div className="mt-1.5 flex items-center gap-3">
        <span className="font-mono text-[10px] text-gray-300">{item.key}</span>
        {!isDefault && !saving && (
          <button onClick={reset} className="text-[11px] text-gray-400 underline-offset-2 transition hover:text-gray-700 hover:underline">
            Reset to default
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- the page */

/** Builds the admin rows: every schema field, with stored values layered on. */
function buildItems(remote = []) {
  const remoteMap = Object.fromEntries(remote.map((r) => [r.key, r]));
  const items = CONTENT_SCHEMA.map((d) => {
    const r = remoteMap[d.key];
    const page = SECTION_PAGE[d.section] ?? 'everywhere';
    const base = {
      key: d.key,
      section: d.section,
      sectionTitle: SECTION_TITLES[d.section] ?? d.section,
      page,
      pageTitle: PAGE_TITLES[page] ?? page,
      label: d.label,
      type: d.type,
      hint: d.hint,
      fields: d.fields,
      itemType: d.itemType,
      itemLabel: d.itemLabel,
      defaultValue: d.value,
      stored: Boolean(r),
    };
    if (!r || r.value == null || r.value === '') {
      return { ...base, value: stringifyContentValue(d.value) };
    }
    return { ...base, value: String(r.value) };
  });
  // Keys stored in the database that the schema does not know about (from an
  // older version of the site) are still shown so they can be edited or reset.
  remote.forEach((r) => {
    if (SCHEMA_BY_KEY[r.key]) return;
    const section = r.section ?? r.key.split('.')[0];
    items.push({
      key: r.key,
      section,
      sectionTitle: SECTION_TITLES[section] ?? section,
      page: SECTION_PAGE[section] ?? 'everywhere',
      pageTitle: PAGE_TITLES[SECTION_PAGE[section] ?? 'everywhere'],
      label: r.label ?? r.key,
      type: r.type ?? 'text',
      hint: 'No longer used by the site. Reset to remove it.',
      defaultValue: '',
      stored: true,
      value: String(r.value ?? ''),
    });
  });
  return items;
}

function groupByPage(items) {
  const byPage = new Map();
  for (const item of items) {
    if (!byPage.has(item.page)) byPage.set(item.page, new Map());
    const sections = byPage.get(item.page);
    if (!sections.has(item.section)) sections.set(item.section, []);
    sections.get(item.section).push(item);
  }
  const pageRank = (p) => { const i = PAGE_ORDER.indexOf(p); return i === -1 ? PAGE_ORDER.length : i; };
  const sectionRank = (s) => { const i = SECTION_ORDER.indexOf(s); return i === -1 ? SECTION_ORDER.length : i; };
  return [...byPage.entries()]
    .sort(([a], [b]) => pageRank(a) - pageRank(b))
    .map(([page, sections]) => [page, [...sections.entries()].sort(([a], [b]) => sectionRank(a) - sectionRank(b))]);
}

export default function AdminContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  // Open by default. 187 fields is a long page, but a collapsed group is a
  // field nobody finds — and the search jumps straight to a match anyway.
  const [closedPages, setClosedPages] = useState(() => new Set());

  useEffect(() => {
    let active = true;
    getAllContent()
      .then((remote) => {
        if (!active) return;
        setLoadError(null);
        setItems(buildItems(remote));
      })
      .catch((err) => {
        if (!active) return;
        // Show the defaults so the page is still usable, but say plainly that
        // what is on screen is not what is stored.
        console.error('[lumen] could not load site content', err);
        setLoadError(err?.message || 'Could not reach the content database.');
        setItems(buildItems([]));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleSave = useCallback((key, newValue) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, value: newValue, stored: true } : i)));
  }, []);

  const handleReset = useCallback((key) => {
    setItems((prev) => prev
      .filter((i) => !(i.key === key && !SCHEMA_BY_KEY[key]))
      .map((i) => (i.key === key ? { ...i, value: stringifyContentValue(i.defaultValue), stored: false } : i)));
  }, []);

  const { query, setQuery, filtered } = useSearch(items, SEARCH_FIELDS);
  const searching = query.trim().length > 0;
  const grouped = useMemo(() => groupByPage(filtered), [filtered]);
  const edited = items.filter((i) => i.stored).length;

  return (
    <>
      {loadError && (
        <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">
            <strong>Showing built-in defaults.</strong> {loadError} Anything you save from here will
            still be written once the connection is back.
          </p>
        </div>
      )}

      <PageHeader
        title="Site content"
        count={items.length}
        subtitle={`Every word, photo and list on the public site, grouped by the page it appears on. ${edited} changed from the default. Saved edits go live on the next page load — no rebuild.`}
      />

      {!loading && items.length > 0 && (
        <div className="mb-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search for any text on the site…"
            resultCount={filtered.length}
            total={items.length}
          />
        </div>
      )}

      {loading ? (
        <Panel><TableSkeleton rows={6} cols={2} /></Panel>
      ) : filtered.length === 0 ? (
        <Panel>
          <EmptyState
            title={`Nothing matches “${query}”`}
            hint="Search covers the page, the section, the label, the key and the text itself — try a phrase you can see on the site."
            action={<Button variant="ghost" onClick={() => setQuery('')}>Clear search</Button>}
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {grouped.map(([page, sections]) => {
            const isOpen = searching || !closedPages.has(page);
            const count = sections.reduce((n, [, list]) => n + list.length, 0);
            return (
              <Panel key={page}>
                <button
                  type="button"
                  onClick={() => setClosedPages((prev) => {
                    const next = new Set(prev);
                    if (next.has(page)) next.delete(page); else next.add(page);
                    return next;
                  })}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left"
                >
                  <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-2">
                      <span className="text-[15px] font-semibold text-gray-900">{PAGE_TITLES[page] ?? page}</span>
                      {PAGE_PATHS[page] && <span className="font-mono text-[11px] text-gray-400">{PAGE_PATHS[page]}</span>}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-gray-500">{PAGE_BLURBS[page]}</span>
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-gray-400">{count}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-200">
                    {sections.map(([section, list]) => (
                      <section key={section} className="border-b border-gray-100 last:border-0">
                        <h3 className="bg-gray-50 px-5 py-2 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                          {SECTION_TITLES[section] ?? section}
                        </h3>
                        <div className="px-5">
                          {list.map((item) => (
                            <ContentRow key={item.key} item={item} onSave={handleSave} onReset={handleReset} expandAll={searching} />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
