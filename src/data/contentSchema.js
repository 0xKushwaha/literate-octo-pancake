/**
 * The single source of truth for what the admin "Site content" page can edit.
 *
 * Every entry is one CMS field: `key` is "<section>.<name>", `type` is how the
 * admin edits it, `value` is the built-in default the public site falls back
 * to when nothing is stored. Components read the same defaults through
 * `useSiteContent(section)`, so adding a field here is the whole job — it shows
 * up in the admin and takes effect on the site with no other change.
 *
 * Types:
 *   text     — single line
 *   richtext — multi-line plain text
 *   json     — a structured list (services, therapists, …). Stored as JSON
 *              text; parsed on the way in and validated in the admin editor.
 */
import {
  brand, credentials, faqs, plans, process, services, stats, testimonials, therapists,
} from './site';

export const APPROACH_PILLARS = [
  {
    icon: 'shuffle',
    title: 'Matched by a person',
    body: 'A clinician reads every intake. No questionnaire scoring, no algorithm deciding who understands you.',
  },
  {
    icon: 'lock',
    title: 'Private by construction',
    body: 'End-to-end encrypted sessions, notes visible only to your care team, and no advertising business to sell data to.',
  },
  {
    icon: 'message',
    title: 'Care between sessions',
    body: 'Secure messaging, a plan you can actually see, and a therapist who remembers what you said last week.',
  },
];

const f = (key, label, value, type = 'text', hint = null) => ({
  key,
  section: key.split('.')[0],
  label,
  value,
  type,
  hint,
});

const LIST = 'json';

export const CONTENT_SCHEMA = [
  // ── Brand ─────────────────────────────────────────────────────────────────
  f('brand.name', 'Practice name', brand.name),
  f('brand.tagline', 'Brand tagline', brand.tagline),
  f('brand.phone', 'Phone number', brand.phone),
  f('brand.email', 'Contact email', brand.email),
  f('brand.address', 'Address', brand.address),
  f('brand.crisis_line', 'Crisis banner text', 'Call or text 988 — Suicide & Crisis Lifeline, 24/7. If someone is in danger right now, call 911.', 'richtext'),
  f('brand.credentials', 'Credential badges (ticker + hero)', credentials, LIST, 'A list of short strings, e.g. ["HIPAA compliant", "APA member practice"]'),

  // ── Navigation ────────────────────────────────────────────────────────────
  f('nav.book_label', 'Book button label', 'Book a session'),
  f('nav.breathing_label', 'Nav: Breathe', 'Breathe'),
  f('nav.services_label', 'Nav: Services', 'Services'),
  f('nav.therapists_label', 'Nav: Therapists', 'Therapists'),
  f('nav.resources_label', 'Nav: Videos', 'Videos'),
  f('nav.blog_label', 'Nav: Blog', 'Blog'),
  f('nav.pricing_label', 'Nav: Pricing', 'Pricing'),
  f('nav.faq_label', 'Nav: FAQ', 'FAQ'),

  // ── Hero ──────────────────────────────────────────────────────────────────
  f('hero.status_pill', 'Status pill', 'Accepting new clients'),
  f('hero.next_opening', 'Next opening note', 'Next opening — tomorrow, 09:30'),
  f('hero.headline', 'Headline (plain part)', 'Therapy that meets'),
  f('hero.headline_accent', 'Headline (highlighted part)', 'you where you are.'),
  f('hero.subheadline', 'Subheadline', 'Licensed clinicians, matched to you by a human in under a day. Video, phone or in person — and a first session this week, not next quarter.', 'richtext'),
  f('hero.primary_cta', 'Primary button', 'Book your first session'),
  f('hero.secondary_cta', 'Secondary button', 'See how it works'),
  f('hero.scroll_hint', 'Scroll hint', 'Scroll to explore'),
  f('hero.location_note', 'Location note (bottom right)', 'San Francisco · Telehealth in 14 states'),

  // ── Trust / stats ─────────────────────────────────────────────────────────
  f('trust.stats', 'Stats (four numbers)', stats, LIST, 'Each item: { "value": 14200, "suffix": "+", "decimals": 0, "label": "Sessions held" }'),

  // ── Approach ──────────────────────────────────────────────────────────────
  f('approach.eyebrow', 'Eyebrow', 'How it works'),
  f('approach.headline', 'Headline', 'Four steps. No waiting rooms.'),
  f('approach.lead', 'Lead paragraph', 'Most people give up on finding a therapist somewhere between the third voicemail and the second waitlist. We removed that part.', 'richtext'),
  f('approach.steps', 'Steps', process, LIST, 'Each item: { "step": "01", "title": "...", "body": "...", "detail": "Avg. 1m 50s" }'),
  f('approach.pillars_title', 'Side card title', 'What makes it hold together'),
  f('approach.pillars', 'Side card pillars', APPROACH_PILLARS, LIST, 'Each item: { "icon": "shuffle|lock|message|shield|spark", "title": "...", "body": "..." }'),

  // ── Breathing ─────────────────────────────────────────────────────────────
  f('breathing.eyebrow', 'Eyebrow', 'Breathe'),
  f('breathing.headline', 'Headline', 'A moment, right now.'),
  f('breathing.lead', 'Lead paragraph', 'Guided breathing exercises from our clinical team. Each session takes under five minutes.', 'richtext'),

  // ── Services ──────────────────────────────────────────────────────────────
  f('services.eyebrow', 'Eyebrow', 'What we treat'),
  f('services.headline', 'Headline', 'Care built around the thing you actually came for.'),
  f('services.aside', 'Side note', 'Every clinician here specialises. You will not be handed to whoever happened to have a Tuesday free.', 'richtext'),
  f('services.items', 'Service cards', services, LIST,
    'Each item: { "id": "individual", "name": "...", "blurb": "...", "modalities": ["CBT"], "duration": "50 min", "price": 165, "accent": "rose|blush|peach|amber", "icon": "person|hearts|wave|pulse|sprout|shield" }'),

  // ── Therapists ────────────────────────────────────────────────────────────
  f('therapists.eyebrow', 'Eyebrow', 'The practice'),
  f('therapists.headline', 'Headline', 'People, not profiles.'),
  f('therapists.lead', 'Lead paragraph', 'Read them properly before you choose. Every therapist here offers a free fifteen-minute intro call, because fit is not something you can tell from a headshot.', 'richtext'),
  f('therapists.items', 'Therapist cards', therapists, LIST,
    'Each item: { "id": "slug", "name": "...", "credentials": "...", "pronouns": "she/her", "years": 12, "focus": ["Trauma"], "languages": ["English"], "formats": ["Video"], "services": ["trauma", "individual"], "bio": "...", "hue": [357, 45], "nextAvailable": 2 }'),
  f('therapists.empty_note', 'Empty filter note', 'Nobody listed for that yet — but we almost certainly have someone.'),

  // ── Video resources ───────────────────────────────────────────────────────
  f('resources.eyebrow', 'Eyebrow', 'Watch'),
  f('resources.headline', 'Headline', 'Resources worth your time.'),
  f('resources.lead', 'Lead paragraph', 'Curated videos reviewed by our clinical team — on anxiety, sleep, relationships, and more.', 'richtext'),

  // ── Testimonials ──────────────────────────────────────────────────────────
  f('testimonials.eyebrow', 'Eyebrow', 'In their words'),
  f('testimonials.headline', 'Headline', 'The part that is hard to put in a brochure.'),
  f('testimonials.items', 'Quotes', testimonials, LIST, 'Each item: { "quote": "...", "name": "R.K.", "meta": "Client, 14 months" }'),

  // ── Blog ──────────────────────────────────────────────────────────────────
  f('blog.eyebrow', 'Eyebrow', 'Medical blog'),
  f('blog.headline', 'Headline', 'Insights from our clinical team.'),
  f('blog.lead', 'Lead paragraph', 'Evidence-based articles written and reviewed by licensed clinicians.', 'richtext'),
  f('blog.view_all', 'View-all link label', 'Read all articles'),

  // ── Pricing ───────────────────────────────────────────────────────────────
  f('pricing.eyebrow', 'Eyebrow', 'Cost'),
  f('pricing.headline', 'Headline', 'Priced plainly, before you book.'),
  f('pricing.lead', 'Lead paragraph', 'You see your exact out-of-pocket cost on the booking screen — insurance applied, nothing surfacing on a statement three weeks later.', 'richtext'),
  f('pricing.plans', 'Plans', plans, LIST,
    'Each item: { "id": "weekly", "name": "...", "price": 139, "cadence": "...", "blurb": "...", "features": ["..."], "cta": "...", "featured": true }'),
  f('pricing.footnote', 'Footnote', 'In-network with Aetna, Cigna, United and Blue Shield of California. Out-of-network claims filed for you. Sliding-scale places are always held open — ask during intake, and no, you will not be asked to prove it.', 'richtext'),

  // ── FAQ ───────────────────────────────────────────────────────────────────
  f('faq.eyebrow', 'Eyebrow', 'Questions'),
  f('faq.headline', 'Headline', 'The things people ask before they book.'),
  f('faq.aside', 'Side card text', 'Still unsure? Talk to a real person — no intake form, no obligation.', 'richtext'),
  f('faq.fallback_items', 'Fallback questions (used when no FAQs are published)', faqs, LIST, 'Each item: { "q": "...", "a": "..." }. Prefer the FAQs page in the sidebar — this list only shows when none are published there.'),

  // ── CTA band ──────────────────────────────────────────────────────────────
  f('cta.headline', 'Headline (plain part)', 'The hardest part is'),
  f('cta.headline_accent', 'Headline (highlighted part)', 'starting.'),
  f('cta.body', 'Body', 'Two minutes now, a matched therapist by tomorrow, a first session this week. You can change your mind at any point in that sequence.', 'richtext'),
  f('cta.primary', 'Primary button', 'Book your first session'),
  f('cta.secondary', 'Secondary button', 'Or just call us'),
  f('cta.reassurances', 'Reassurance chips', ['Free 15-min intro call', 'Cancel any time', 'No card to browse'], LIST, 'A list of short strings'),

  // ── Footer ────────────────────────────────────────────────────────────────
  f('footer.blurb', 'Footer blurb', 'A modern practice for people who have been meaning to do this for a while.', 'richtext'),
  f('footer.disclaimer', 'Footer disclaimer', `This site is a design demonstration. ${brand.name} is a fictional practice — nothing here is medical advice.`, 'richtext'),
  f('footer.copyright_suffix', 'Copyright suffix', 'Therapy, PC. All rights reserved.'),
  f('footer.privacy_url', 'Privacy policy link', '#'),
  f('footer.terms_url', 'Terms of service link', '#'),
  f('footer.accessibility_url', 'Accessibility link', '#'),

  // ── Booking ───────────────────────────────────────────────────────────────
  f('booking.mobile_bar_label', 'Mobile sticky bar label', 'Book a session'),
];

/** Defaults for one section as the shortKey → value map components consume. */
export function defaultsFor(section) {
  const out = {};
  for (const field of CONTENT_SCHEMA) {
    if (field.section !== section) continue;
    out[field.key.slice(section.length + 1)] = field.value;
  }
  return out;
}

/** Every field in the schema keyed by its full dotted key. */
export const SCHEMA_BY_KEY = Object.fromEntries(CONTENT_SCHEMA.map((x) => [x.key, x]));

/** Section display order in the admin, matching the page from top to bottom. */
export const SECTION_ORDER = [
  'brand', 'nav', 'hero', 'trust', 'approach', 'breathing', 'services', 'therapists',
  'resources', 'testimonials', 'blog', 'pricing', 'faq', 'cta', 'footer', 'booking',
];

export const SECTION_TITLES = {
  brand: 'Brand & contact',
  nav: 'Navigation',
  hero: 'Hero',
  trust: 'Trust bar',
  approach: 'How it works',
  breathing: 'Breathing',
  services: 'Services',
  therapists: 'Therapists',
  resources: 'Video resources',
  testimonials: 'Testimonials',
  blog: 'Blog',
  pricing: 'Pricing',
  faq: 'FAQ',
  cta: 'Call to action',
  footer: 'Footer',
  booking: 'Booking',
};
