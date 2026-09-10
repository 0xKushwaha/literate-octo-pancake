import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { getAllContent, upsertContent, deleteContent } from '../../lib/queries/siteContent';
import { isDemo } from '../../lib/supabase';

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

function groupBySection(items) {
  return items.reduce((acc, item) => {
    const s = item.section ?? 'other';
    if (!acc[s]) acc[s] = [];
    acc[s].push(item);
    return acc;
  }, {});
}

function ContentRow({ item, onSave }) {
  const [value, setValue] = useState(item.value ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = value !== (item.value ?? '');

  const save = async () => {
    setSaving(true);
    try {
      await upsertContent({ key: item.key, value, section: item.section, label: item.label, type: item.type });
      toast.success('Saved');
      onSave(item.key, value);
    } catch {
      toast.error('Save failed');
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
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        )}
      </div>
      <button
        onClick={save}
        disabled={!dirty || saving}
        className="mt-7 shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700 disabled:opacity-30"
      >
        {saving ? '…' : 'Save'}
      </button>
    </div>
  );
}

export default function AdminContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllContent()
      .then((remote) => {
        // Merge defaults with whatever is already in Supabase
        const remoteMap = Object.fromEntries(remote.map((r) => [r.key, r]));
        const merged = DEFAULTS.map((d) => remoteMap[d.key] ? { ...d, value: remoteMap[d.key].value } : d);
        // Also include any extra keys from Supabase not in DEFAULTS
        remote.forEach((r) => {
          if (!DEFAULTS.find((d) => d.key === r.key)) merged.push(r);
        });
        setItems(merged);
      })
      .catch(() => {
        // Offline/no Supabase yet — show defaults
        setItems(DEFAULTS);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = (key, newValue) => {
    setItems((prev) => prev.map((i) => i.key === key ? { ...i, value: newValue } : i));
  };

  const grouped = groupBySection(items);

  return (
    <div className="p-8">
      <Toaster />
      {isDemo && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800"><strong>Demo mode</strong> — Changes persist in-memory during this session only.</p>
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Site content</h1>
        <p className="mt-1 text-sm text-gray-500">Edit text that appears on the public site. Changes go live immediately — no rebuild needed.</p>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([section, sectionItems]) => (
            <div key={section} className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-5 py-3">
                <h2 className="text-sm font-semibold text-gray-900 capitalize">{section}</h2>
              </div>
              <div className="px-5">
                {sectionItems.map((item) => (
                  <ContentRow key={item.key} item={item} onSave={handleSave} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
