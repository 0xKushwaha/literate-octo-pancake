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

/**
 * Photos are free-to-use under the Unsplash License (no attribution required,
 * credit appreciated). Every one is an admin field, so they can be swapped for
 * the practice's own photography without a deploy.
 */
const U = (id, w = 1400) => `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;
export const IMAGES = {
  hero: U('photo-1714976694810-85add1a29c96'),            // two women talking on a couch — Vitaly Gariev
  services: U('photo-1604881991720-f91add269bed'),        // two people holding hands — Priscilla Du Preez
  approach: U('photo-1758521541409-256fa9e24fe4'),        // woman smiling at a laptop — Vitaly Gariev
  therapists: U('photo-1637245048732-adf1a547835e'),      // therapy room, two chairs — Leuchtturm Entertainment
  breathing: U('photo-1518708909080-704599b19972'),       // hand on chest, eyes closed — Darius Bashar
  resources: U('photo-1604881991664-593b31b88488'),       // woman with a mug — Priscilla Du Preez
  pricing: U('uploads/14122810486321888a497/1b0cc699'),   // stone labyrinth by the sea — Ashley Batz
};

export const HERO_WORDS = ['anxiety', 'burnout', 'relationships', 'grief', 'getting unstuck', 'the 3am spiral'];

export const HEARD_ITEMS = [
  { quote: 'I have been meaning to see someone for two years. Every time I look, the first appointment is six weeks away and I give up.', name: 'R., 31' },
  { quote: 'I do not want to explain my whole life to a receptionist just to find out whether they even treat what I have.', name: 'J., 27' },
  { quote: 'Last time it took four therapists before one felt right. I cannot afford to do that again.', name: 'M., 44' },
  { quote: 'I just need to know what it costs before I book. Not after the claim gets rejected.', name: 'A., 36' },
  { quote: 'Some weeks I cannot get to an office. That should not mean I lose my therapist.', name: 'S., 52' },
];

export const WHY_ITEMS = [
  {
    icon: 'shuffle',
    title: 'Matched by a person',
    body: 'A clinician reads every intake. No questionnaire scoring, no algorithm deciding who understands you.',
  },
  {
    icon: 'coins',
    title: 'Priced before you book',
    body: 'Your exact out-of-pocket cost, insurance applied, on the booking screen. Nothing surfaces on a statement later.',
  },
  {
    icon: 'globe',
    title: 'Video, phone or in person',
    body: 'Switch formats week to week without switching therapists. Telehealth across fourteen states.',
  },
  {
    icon: 'lock',
    title: 'Private by construction',
    body: 'Encrypted sessions, notes visible only to your care team, and no advertising business to sell data to.',
  },
  {
    icon: 'message',
    title: 'Care between sessions',
    body: 'Secure messaging, a plan you can actually see, and a therapist who remembers what you said last week.',
  },
];

/** Kept for older imports; the side-card pillars became the "Why Lumen" section. */
export const APPROACH_PILLARS = WHY_ITEMS.slice(0, 3);

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
  f('brand.credentials', 'Credential badges (hero)', credentials, LIST, 'A list of short strings, e.g. ["HIPAA compliant", "APA member practice"]'),
  f('brand.accent_color', 'Accent colour (hex)', '#FFB0B5', 'text', 'One colour for highlights, pills and hover states, e.g. #FFB0B5. Buttons stay black so the accent can be anything.'),
  f('brand.button_color', 'Button colour (hex)', '#000000', 'text', 'Primary button background. Keep it dark enough for white text.'),

  // ── Navigation ────────────────────────────────────────────────────────────
  f('nav.book_label', 'Book button label', 'Book a session'),
  f('nav.services_label', 'Menu: Care (dropdown of services)', 'Care'),
  f('nav.services_all_label', 'Care dropdown: "all services" link', 'All services'),
  f('nav.therapists_label', 'Menu: Therapists', 'Therapists'),
  f('nav.approach_label', 'Menu: How it works (dropdown)', 'How it works'),
  f('nav.why_label', 'How it works dropdown: Why Lumen', 'Why Lumen'),
  f('nav.faq_label', 'How it works dropdown: FAQ', 'Questions'),
  f('nav.resources_label', 'Menu: Resources (dropdown)', 'Resources'),
  f('nav.breathing_label', 'Resources dropdown: Breathe', 'Breathing exercises'),
  f('nav.videos_label', 'Resources dropdown: Videos', 'Videos'),
  f('nav.blog_label', 'Resources dropdown: Blog', 'Blog'),
  f('nav.pricing_label', 'Menu: Pricing', 'Pricing'),
  f('nav.badge_text', 'Small badge above a menu item', 'New'),
  f('nav.badge_item', 'Which menu item gets the badge', 'resources', 'text', 'One of: services, therapists, approach, resources, pricing. Leave blank for none.'),

  // ── Hero ──────────────────────────────────────────────────────────────────
  f('hero.status_pill', 'Status pill', 'Accepting new clients'),
  f('hero.headline', 'Headline (before the rotating word)', 'Therapy for'),
  f('hero.rotating_words', 'Rotating words', HERO_WORDS, LIST, 'A list of short phrases the headline cycles through, e.g. ["anxiety", "burnout"]'),
  f('hero.subheadline', 'Subheadline', 'Licensed clinicians, matched to you by a human in under a day. Video, phone or in person, and a first session this week, not next quarter.', 'richtext'),
  f('hero.primary_cta', 'Primary button', 'Book your first session'),
  f('hero.secondary_cta', 'Secondary button', 'See how it works'),
  f('hero.location_note', 'Location note', 'San Francisco · Telehealth in 14 states'),
  f('hero.image_url', 'Hero photo (URL)', IMAGES.hero, 'text', 'Paste any https image URL. Landscape works best.'),
  f('hero.image_alt', 'Hero photo description (for screen readers)', 'Two people talking on a couch in a bright room'),

  // ── Trust / stats ─────────────────────────────────────────────────────────
  f('trust.stats', 'Stats (four numbers)', stats, LIST, 'Each item: { "value": 14200, "suffix": "+", "decimals": 0, "label": "Sessions held" }'),

  // ── We heard you ──────────────────────────────────────────────────────────
  f('heard.eyebrow', 'Eyebrow', 'We heard you'),
  f('heard.headline', 'Headline', 'The reasons people put this off.'),
  f('heard.items', 'Quotes', HEARD_ITEMS, LIST, 'Each item: { "quote": "...", "name": "R., 31" }. The homepage shows the first three; the How it works page shows all.'),

  // ── Approach ──────────────────────────────────────────────────────────────
  f('approach.eyebrow', 'Eyebrow', 'How it works'),
  f('approach.headline', 'Headline', 'Four steps. No waiting rooms.'),
  f('approach.lead', 'Lead paragraph', 'Most people give up on finding a therapist somewhere between the third voicemail and the second waitlist. We removed that part.', 'richtext'),
  f('approach.image_url', 'How it works page photo (URL)', IMAGES.approach),
  f('approach.home_cta', 'Homepage "learn more" link', 'How matching works'),
  f('approach.steps', 'Steps', process, LIST, 'Each item: { "step": "01", "title": "...", "body": "...", "detail": "Avg. 1m 50s" }'),

  // ── Why Lumen ─────────────────────────────────────────────────────────────
  f('why.eyebrow', 'Eyebrow', 'Why Lumen'),
  f('why.headline', 'Headline', 'What makes it hold together.'),
  f('why.items', 'Cards', WHY_ITEMS, LIST, 'Each item: { "icon": "shuffle|coins|globe|lock|message|shield|spark|heart|refresh|users", "title": "...", "body": "..." }'),

  // ── Breathing ─────────────────────────────────────────────────────────────
  f('breathing.eyebrow', 'Eyebrow', 'Breathe'),
  f('breathing.headline', 'Headline', 'A moment, right now.'),
  f('breathing.lead', 'Lead paragraph', 'Guided breathing exercises from our clinical team. Each session takes under five minutes.', 'richtext'),
  f('breathing.image_url', 'Breathe page photo (URL)', IMAGES.breathing),

  // ── Services ──────────────────────────────────────────────────────────────
  f('services.eyebrow', 'Eyebrow', 'What we treat'),
  f('services.headline', 'Headline', 'Care built around the thing you actually came for.'),
  f('services.image_url', 'Services page photo (URL)', IMAGES.services),
  f('services.home_cta', 'Homepage "see all" link', 'See every service'),
  f('services.aside', 'Side note', 'Every clinician here specialises. You will not be handed to whoever happened to have a Tuesday free.', 'richtext'),
  f('services.items', 'Service cards', services, LIST,
    'Each item: { "id": "individual", "name": "...", "blurb": "...", "modalities": ["CBT"], "duration": "50 min", "price": 165, "accent": "rose|blush|peach|amber", "icon": "person|hearts|wave|pulse|sprout|shield" }'),

  // ── Therapists ────────────────────────────────────────────────────────────
  f('therapists.eyebrow', 'Eyebrow', 'The practice'),
  f('therapists.headline', 'Headline', 'People, not profiles.'),
  f('therapists.lead', 'Lead paragraph', 'Read them properly before you choose. Every therapist here offers a free fifteen-minute intro call, because fit is not something you can tell from a headshot.', 'richtext'),
  f('therapists.image_url', 'Therapists page photo (URL)', IMAGES.therapists),
  f('therapists.home_cta', 'Homepage "meet everyone" link', 'Meet the whole team'),
  f('therapists.items', 'Therapist cards', therapists, LIST,
    'Each item: { "id": "slug", "name": "...", "credentials": "...", "pronouns": "she/her", "years": 12, "focus": ["Trauma"], "languages": ["English"], "formats": ["Video"], "services": ["trauma", "individual"], "bio": "...", "hue": [357, 45], "nextAvailable": 2 }'),
  f('therapists.empty_note', 'Empty filter note', 'Nobody listed for that yet — but we almost certainly have someone.'),

  // ── Video resources ───────────────────────────────────────────────────────
  f('resources.eyebrow', 'Eyebrow', 'Resources'),
  f('resources.headline', 'Headline', 'Worth your time between sessions.'),
  f('resources.lead', 'Lead paragraph', 'Videos and articles reviewed by our clinical team, on anxiety, sleep, relationships and more.', 'richtext'),
  f('resources.image_url', 'Resources page photo (URL)', IMAGES.resources),
  f('resources.videos_title', 'Videos sub-heading', 'Watch'),
  f('resources.videos_empty', 'Shown when there are no active videos', 'No videos yet. Add one from the admin and it appears here.'),
  f('resources.articles_empty', 'Shown when no articles are published', 'No articles yet.'),
  f('resources.articles_title', 'Articles sub-heading', 'Read'),

  // ── Testimonials ──────────────────────────────────────────────────────────
  f('testimonials.eyebrow', 'Eyebrow', 'In their words'),
  f('testimonials.headline', 'Headline', 'The part that is hard to put in a brochure.'),
  f('testimonials.items', 'Quotes', testimonials, LIST, 'Each item: { "quote": "...", "name": "R.K.", "meta": "Client, 14 months" }'),

  // ── Blog ──────────────────────────────────────────────────────────────────
  f('blog.eyebrow', 'Eyebrow (blog page)', 'Medical blog'),
  f('blog.headline', 'Headline (blog page)', 'Insights from our clinical team.'),
  f('blog.lead', 'Lead paragraph (blog page)', 'Evidence-based articles written and reviewed by licensed clinicians.', 'richtext'),
  f('blog.view_all', 'View-all link label', 'Read all articles'),

  // ── Pricing ───────────────────────────────────────────────────────────────
  f('pricing.eyebrow', 'Eyebrow', 'Cost'),
  f('pricing.headline', 'Headline', 'Priced plainly, before you book.'),
  f('pricing.lead', 'Lead paragraph', 'You see your exact out-of-pocket cost on the booking screen — insurance applied, nothing surfacing on a statement three weeks later.', 'richtext'),
  f('pricing.image_url', 'Pricing page photo (URL)', IMAGES.pricing),
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
  f('cta.image_url', 'Call-to-action photo (URL)', IMAGES.services, 'text', 'Leave blank for a plain card.'),
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
  'brand', 'nav', 'hero', 'trust', 'heard', 'services', 'approach', 'why', 'therapists',
  'breathing', 'resources', 'blog', 'testimonials', 'pricing', 'faq', 'cta', 'footer', 'booking',
];

export const SECTION_TITLES = {
  brand: 'Brand & contact',
  nav: 'Navigation',
  hero: 'Hero',
  trust: 'Numbers (under the hero)',
  heard: 'We heard you',
  approach: 'How it works',
  why: 'Why Lumen',
  breathing: 'Breathing',
  services: 'Services',
  therapists: 'Therapists',
  resources: 'Resources (videos + articles)',
  testimonials: 'Testimonials',
  blog: 'Blog',
  pricing: 'Pricing',
  faq: 'FAQ',
  cta: 'Call to action',
  footer: 'Footer',
  booking: 'Booking',
};
