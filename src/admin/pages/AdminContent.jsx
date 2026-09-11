import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllContent, upsertContent } from '../../lib/queries/siteContent';
import { useSearch } from '../hooks';
import { Button, EmptyState, PageHeader, Panel, SearchInput, TableSkeleton } from '../components/ui';

// Default content seed — mirrors site.js values.
// These are shown in the admin as pre-filled starting points.
// The key format must match what useSiteContent(section) expects:
//   key = "section.shortKey" → useSiteContent reads the shortKey part.
const DEFAULTS = [
  // Hero
  { key: 'hero.tagline', section: 'hero', label: 'Hero tagline', type: 'text', value: 'Therapy that meets you where you are.' },
  { key: 'hero.subheadline', section: 'hero', label: 'Hero subheadline', type: 'text', value: 'Licensed clinicians, matched to you by a human in under a day. Video, phone or in person — and a first session this week, not next quarter.' },
  // Brand
  { key: 'brand.phone', section: 'brand', label: 'Phone number', type: 'text', value: '+1 (415) 555-0142' },
  { key: 'brand.email', section: 'brand', label: 'Contact email', type: 'text', value: 'hello@lumentherapy.com' },
  { key: 'brand.address', section: 'brand', label: 'Address', type: 'text', value: '2140 Filbert Street, San Francisco, CA 94123' },
  { key: 'brand.tagline', section: 'brand', label: 'Brand tagline', type: 'text', value: 'Therapy that meets you where you are.' },
  // Services (editable blurbs)
  { key: 'services.individual_blurb', section: 'services', label: 'Individual therapy blurb', type: 'text', value: 'Weekly one-to-one work on anxiety, depression, burnout, identity and the things that are hard to say out loud.' },
  { key: 'services.couples_blurb', section: 'services', label: 'Couples therapy blurb', type: 'text', value: 'Structured sessions for communication, repair after rupture, intimacy and deciding what comes next — together.' },
  { key: 'services.trauma_blurb', section: 'services', label: 'Trauma & EMDR blurb', type: 'text', value: 'Paced, consent-led processing for single-incident and complex trauma. You set the speed; we hold the frame.' },
  { key: 'services.anxiety_blurb', section: 'services', label: 'Anxiety & panic blurb', type: 'text', value: 'Skills-first care for panic, health anxiety, OCD and the loops that keep you up at 3am. Homework optional, honestly.' },
  { key: 'services.teen_blurb', section: 'services', label: 'Teens & young adults blurb', type: 'text', value: 'Ages 14–24. School pressure, social media, first heartbreaks, figuring out who you are without an audience.' },
  { key: 'services.psychiatry_blurb', section: 'services', label: 'Psychiatry blurb', type: 'text', value: 'Board-certified psychiatric care, coordinated with your therapist so nobody is guessing what the other one did.' },
  // Pricing (editable blurbs)
  { key: 'pricing.session_blurb', section: 'pricing', label: 'Pay per session blurb', type: 'text', value: 'No commitment. Book when you need to.' },
  { key: 'pricing.weekly_blurb', section: 'pricing', label: 'Weekly care blurb', type: 'text', value: 'The rhythm most therapy actually works at.' },
  { key: 'pricing.integrated_blurb', section: 'pricing', label: 'Therapy + psychiatry blurb', type: 'text', value: 'One care team, one plan, no repeating yourself.' },
  // Approach
  { key: 'approach.headline', section: 'approach', label: 'Approach section headline', type: 'text', value: 'Getting started shouldn\'t feel like homework.' },
  // Footer
  { key: 'footer.disclaimer', section: 'footer', label: 'Footer disclaimer', type: 'text', value: 'This site is a design demonstration. Lumen is a fictional practice — nothing here is medical advice.' },
];

const SEARCH_FIELDS = ['label', 'key', 'value', 'section'];

function groupBySection(items) {
  return items.reduce((acc, item) => {
    const s = item.section ?? 'other';
    if (!acc[s]) acc[s] = [];
    acc[s].push(item);
    return acc;
  }, {});
}

function ContentRow({ item, onSave }) {
  const saved = item.value ?? '';
  const [value, setValue] = useState(saved);
  const [seen, setSeen] = useState(saved);
  const [saving, setSaving] = useState(false);
  const dirty = value !== saved;

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
    setSaving(true);
    try {
      await upsertContent({ key: item.key, value, section: item.section, label: item.label, type: item.type });
      toast.success(`Saved "${item.label ?? item.key}"`);
      onSave(item.key, value);
    } catch (err) {
      // Surface the real reason — an RLS denial and a dropped connection are
      // very different problems and "Save failed" hides both.
      toast.error(err?.message || 'Save failed');
      console.error('[lumen] content save failed', item.key, err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-600 mb-1">{item.label}</p>
        <p className="font-mono text-[10px] text-gray-400 mb-1.5">{item.key}</p>
        {item.type === 'richtext' ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            className={`w-full resize-y rounded-lg border px-3 py-1.5 text-sm outline-none transition focus:ring-1 ${
              dirty
                ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500'
                : 'border-gray-300 focus:border-teal-500 focus:ring-teal-500'
            }`}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && dirty) { e.preventDefault(); save(); } }}
            className={`w-full rounded-lg border px-3 py-1.5 text-sm outline-none transition focus:ring-1 ${
              dirty
                ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500'
                : 'border-gray-300 focus:border-teal-500 focus:ring-teal-500'
            }`}
          />
        )}
      </div>
      <div className="mt-7 flex shrink-0 items-center gap-2">
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
          disabled={!dirty || saving}
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700 disabled:opacity-30"
        >
          {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
        </button>
      </div>
    </div>
  );
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
        // Merge defaults with whatever is already stored
        const remoteMap = Object.fromEntries(remote.map((r) => [r.key, r]));
        const merged = DEFAULTS.map((d) => {
          const r = remoteMap[d.key];
          if (!r) return d;
          // Stored value wins; the labels/sections stay from DEFAULTS when the
          // stored row left them null, so the admin UI never loses its grouping.
          return {
            ...d,
            ...r,
            value: r.value ?? '',
            label: r.label ?? d.label,
            section: r.section ?? d.section,
            type: r.type ?? d.type,
          };
        });
        // Also include any extra keys from the database not in DEFAULTS
        remote.forEach((r) => {
          if (!DEFAULTS.some((d) => d.key === r.key)) merged.push(r);
        });
        setItems(merged);
      })
      .catch((err) => {
        if (!active) return;
        // Show the defaults so the page is still usable, but say plainly that
        // what is on screen is not what is stored.
        console.error('[lumen] could not load site content', err);
        setLoadError(err?.message || 'Could not reach the content database.');
        setItems(DEFAULTS);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleSave = useCallback((key, newValue) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, value: newValue } : i)));
  }, []);

  const { query, setQuery, filtered } = useSearch(items, SEARCH_FIELDS);
  const grouped = useMemo(() => groupBySection(filtered), [filtered]);

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
        subtitle="Text shown on the public site. Saved changes go live on the next page load — no rebuild."
      />

      {!loading && items.length > 0 && (
        <div className="mb-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by label, key or current text…"
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
            hint="Search covers the label, the dot-notation key, and the text currently stored."
            action={<Button variant="ghost" onClick={() => setQuery('')}>Clear search</Button>}
          />
        </Panel>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([section, sectionItems]) => (
            <Panel key={section}>
              <div className="flex items-baseline justify-between border-b border-gray-200 bg-gray-50 px-5 py-3">
                <h2 className="text-sm font-semibold capitalize text-gray-900">{section}</h2>
                <span className="text-xs text-gray-400">
                  {sectionItems.length} {sectionItems.length === 1 ? 'field' : 'fields'}
                </span>
              </div>
              <div className="px-5">
                {sectionItems.map((item) => (
                  <ContentRow key={item.key} item={item} onSave={handleSave} />
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
