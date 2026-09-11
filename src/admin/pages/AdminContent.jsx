import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { deleteContent, getAllContent, upsertContent } from '../../lib/queries/siteContent';
import { parseJsonValue, stringifyContentValue } from '../../lib/contentMerge';
import {
  CONTENT_SCHEMA, SCHEMA_BY_KEY, SECTION_ORDER, SECTION_TITLES,
} from '../../data/contentSchema';
import { useSearch } from '../hooks';
import { Button, EmptyState, PageHeader, Panel, SearchInput, TableSkeleton } from '../components/ui';

const SEARCH_FIELDS = ['label', 'key', 'value', 'section', 'sectionTitle'];

function groupBySection(items) {
  const grouped = items.reduce((acc, item) => {
    const s = item.section ?? 'other';
    if (!acc[s]) acc[s] = [];
    acc[s].push(item);
    return acc;
  }, {});
  const order = (s) => {
    const i = SECTION_ORDER.indexOf(s);
    return i === -1 ? SECTION_ORDER.length : i;
  };
  return Object.entries(grouped).sort(([a], [b]) => order(a) - order(b));
}

/** Validates the text of a `json` field. Returns an error message or null. */
function validateJson(text, defaultValue) {
  const parsed = parseJsonValue(text);
  if (parsed === undefined) return 'Not valid JSON. Check for a missing comma, quote or bracket.';
  const wantArray = Array.isArray(defaultValue);
  if (wantArray && !Array.isArray(parsed)) return 'This field must be a list: it should start with [ and end with ].';
  if (!wantArray && (typeof parsed !== 'object' || parsed === null)) return 'This field must be an object: it should start with { and end with }.';
  return null;
}

const inputClass = (dirty, invalid) =>
  `w-full rounded-lg border px-3 py-1.5 text-sm outline-none transition focus:ring-1 ${
    invalid
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
      : dirty
        ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500'
        : 'border-gray-300 focus:border-teal-500 focus:ring-teal-500'
  }`;

function ContentRow({ item, onSave, onReset }) {
  const saved = item.value ?? '';
  const [value, setValue] = useState(saved);
  const [seen, setSeen] = useState(saved);
  const [saving, setSaving] = useState(false);
  const dirty = value !== saved;
  const isJson = item.type === 'json';
  const jsonError = isJson ? validateJson(value, item.defaultValue) : null;
  const defaultText = stringifyContentValue(item.defaultValue);
  const isDefault = !item.stored;

  // The parent replaces `item` whenever the list reloads. Without this the
  // input keeps showing whatever was in local state at first mount, which
  // looks exactly like "the admin panel is not updating the text".
  //
  // Adjusting during render rather than in an effect: React discards this
  // render and redoes it immediately, so the stale value is never painted and
  // there is no second commit for the browser to flicker through.
  if (saved !== seen) {
    setSeen(saved);
    setValue(saved);
  }

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

  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="text-xs font-medium text-gray-600">{item.label}</p>
          <span className="font-mono text-[10px] text-gray-400">{item.key}</span>
          {isDefault ? (
            <span className="rounded-full bg-gray-100 px-1.5 py-px text-[10px] text-gray-500">default</span>
          ) : (
            <span className="rounded-full bg-teal-50 px-1.5 py-px text-[10px] text-teal-700">customised</span>
          )}
        </div>
        {item.hint && <p className="mb-1.5 text-[11px] text-gray-400">{item.hint}</p>}
        {isJson ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={Math.min(24, Math.max(6, value.split('\n').length + 1))}
            spellCheck={false}
            className={`${inputClass(dirty, Boolean(jsonError))} resize-y font-mono text-[12px] leading-relaxed`}
          />
        ) : item.type === 'richtext' ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            className={`${inputClass(dirty, false)} resize-y`}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && dirty) { e.preventDefault(); save(); } }}
            className={inputClass(dirty, false)}
          />
        )}
        {jsonError && dirty && <p className="mt-1 text-[11px] text-red-600">{jsonError}</p>}
      </div>
      <div className="mt-7 flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          {dirty && !saving && (
            <button
              onClick={() => setValue(saved)}
              className="rounded-lg px-2 py-1.5 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            >
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
        </div>
        {!isDefault && !saving && (
          <button
            onClick={reset}
            className="text-[11px] text-gray-400 underline-offset-2 transition hover:text-gray-700 hover:underline"
            title={`Default: ${defaultText.slice(0, 120)}`}
          >
            Reset to default
          </button>
        )}
      </div>
    </div>
  );
}

/** Builds the admin rows: every schema field, with stored values layered on. */
function buildItems(remote = []) {
  const remoteMap = Object.fromEntries(remote.map((r) => [r.key, r]));
  const items = CONTENT_SCHEMA.map((d) => {
    const r = remoteMap[d.key];
    const base = {
      key: d.key,
      section: d.section,
      sectionTitle: SECTION_TITLES[d.section] ?? d.section,
      label: d.label,
      type: d.type,
      hint: d.hint,
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
    items.push({
      key: r.key,
      section: r.section ?? r.key.split('.')[0],
      sectionTitle: SECTION_TITLES[r.section] ?? r.section ?? 'other',
      label: r.label ?? r.key,
      type: r.type ?? 'text',
      hint: 'Legacy field — no longer used by the current site. Reset to remove it.',
      defaultValue: '',
      stored: true,
      value: String(r.value ?? ''),
    });
  });
  return items;
}

export default function AdminContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

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
  const grouped = useMemo(() => groupBySection(filtered), [filtered]);
  const customised = items.filter((i) => i.stored).length;

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
        subtitle={`Every heading, paragraph, button and list on the public site. ${customised} customised. Saved changes go live on the next page load — no rebuild.`}
      />

      {!loading && items.length > 0 && (
        <div className="mb-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by section, label, key or current text…"
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
            title={`No fields match “${query}”`}
            hint="Search covers the section, the label, the dot-notation key, and the text currently stored."
            action={<Button variant="ghost" onClick={() => setQuery('')}>Clear search</Button>}
          />
        </Panel>
      ) : (
        <div className="space-y-6">
          {grouped.map(([section, sectionItems]) => (
            <Panel key={section}>
              <div className="flex items-baseline justify-between border-b border-gray-200 bg-gray-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-gray-900">{SECTION_TITLES[section] ?? section}</h2>
                <span className="text-xs text-gray-400">
                  {sectionItems.length} {sectionItems.length === 1 ? 'field' : 'fields'}
                </span>
              </div>
              <div className="px-5">
                {sectionItems.map((item) => (
                  <ContentRow key={item.key} item={item} onSave={handleSave} onReset={handleReset} />
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
