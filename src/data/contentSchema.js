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
 *              text; parsed on the way in. A list that declares `fields` or
 *              `itemType` gets a proper row editor in the admin instead of a
 *              raw JSON box — see src/admin/pages/AdminContent.jsx.
 *
 * Every section belongs to a page (SECTION_PAGE below) so the admin can be
 * organised the way the site is, rather than as one flat list of keys.
 */
import {
  brand, concerns, credentials, faqs, plans, process, services, stats, testimonials, therapists,
} from './site';

/** The option lists inside the booking form, editable like everything else. */
export const BOOKING_FORMATS = [
  { id: 'video', label: 'Video call', icon: 'video', note: 'Anywhere we are licensed' },
  { id: 'inperson', label: 'In person', icon: 'pin', note: 'Filbert Street, SF' },
  { id: 'phone', label: 'Phone', icon: 'phone', note: 'No camera, no app' },
];

export const BOOKING_WHO = [
  { id: 'individual', label: 'Just me' },
  { id: 'couples', label: 'Me and my partner' },
  { id: 'teen', label: 'My teenager' },
  { id: 'psychiatry', label: 'Medication review' },
];

export const BOOKING_CADENCE = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'biweekly', label: 'Every two weeks' },
  { id: 'once', label: 'Just one session for now' },
];

export const BOOKING_STEPS = [
  { id: 'about', label: 'About you', title: 'What brings you here?', lead: 'Pick anything that fits. This routes you to the right clinician — it is not a diagnosis, and you can change it later.' },
  { id: 'format', label: 'Format', title: 'How would you like to meet?', lead: 'You can switch format any week.' },
  { id: 'therapist', label: 'Therapist', title: 'Choose who you would like to see', lead: 'These are matched to what you told us. Every one offers a free fifteen-minute intro call first.' },
  { id: 'time', label: 'Time', title: 'Pick a time', lead: 'These are live openings, not a request queue. All times Pacific.' },
  { id: 'details', label: 'Details', title: 'Where should we reach you?', lead: 'Used to confirm the appointment and nothing else. No newsletter, no partners.' },
  { id: 'review', label: 'Review', title: 'Does this look right?', lead: 'Nothing is charged today.' },
];

export const BLOG_CATEGORIES = ['All', 'Getting Started', 'Anxiety', 'Depression', 'Relationships', 'Mindfulness', 'Trauma', 'Techniques', 'Sleep', 'Psychiatry'];

export const INSURERS = [
  'Self-pay',
  'Aetna',
  'Cigna',
  'United Healthcare',
  'Blue Shield of California',
  'Other / not sure',
];

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

const f = (key, label, value, type = 'text', hint = null, extra = null) => ({
  key,
  section: key.split('.')[0],
  label,
  value,
  type,
  hint,
  ...(extra ?? {}),
});

/** Shorthand for a list of plain strings. */
const strings = (itemLabel) => ({ itemLabel, itemType: 'string' });

const LIST = 'json';

export const CONTENT_SCHEMA = [
  // ── Brand ─────────────────────────────────────────────────────────────────
  f('brand.name', 'Practice name', brand.name),
  f('brand.tagline', 'Brand tagline', brand.tagline),
  f('brand.phone', 'Phone number', brand.phone),
  f('brand.email', 'Contact email', brand.email),
  f('brand.address', 'Address', brand.address),
  f('brand.crisis_line', 'Crisis banner text', 'Call or text 988 — Suicide & Crisis Lifeline, 24/7. If someone is in danger right now, call 911.', 'richtext'),
  f('brand.credentials', 'Credential badges (hero)', credentials, LIST, 'Short trust badges shown under the hero buttons.', strings('Badge')),
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
  f('hero.rotating_words', 'Rotating words', HERO_WORDS, LIST, 'The headline cycles through these. The line is sized to the longest one.', strings('Word or phrase')),
  f('hero.subheadline', 'Subheadline', 'Licensed clinicians, matched to you by a human in under a day. Video, phone or in person, and a first session this week, not next quarter.', 'richtext'),
  f('hero.primary_cta', 'Primary button', 'Book your first session'),
  f('hero.secondary_cta', 'Secondary button', 'See how it works'),
  f('hero.location_note', 'Location note', 'San Francisco · Telehealth in 14 states'),
  f('hero.image_url', 'Hero photo (URL)', IMAGES.hero, 'text', 'Paste any https image URL. Landscape works best.'),
  f('hero.image_alt', 'Hero photo description (for screen readers)', 'Two people talking on a couch in a bright room'),
  f('hero.match_badge', 'Badge on the card over the photo', 'Matched in 1 day'),

  // ── Trust / stats ─────────────────────────────────────────────────────────
  f('trust.stats', 'The four numbers', stats, LIST, 'The strip under the hero — 14,200+ Sessions held, 4.9/5 Average client rating, 36h Median wait, 92% Still in care. Each one counts up as it scrolls into view.', {
    itemLabel: 'Number',
    summaryKey: 'label',
    fields: [
      { key: 'label', label: 'Caption underneath', type: 'text' },
      { key: 'value', label: 'The number itself', type: 'number', hint: 'Digits only — 14200, not "14,200". The comma is added for you.' },
      { key: 'suffix', label: 'Suffix', type: 'text', hint: 'e.g. +, %, h, /5' },
      { key: 'decimals', label: 'Decimal places', type: 'number', hint: '0 for 36, 1 for 4.9' },
    ],
  }),

  // ── We heard you ──────────────────────────────────────────────────────────
  f('heard.eyebrow', 'Eyebrow', 'We heard you'),
  f('heard.headline', 'Headline', 'The reasons people put this off.'),
  f('heard.footnote', 'Line under the quotes (homepage only)', 'We built the practice around exactly these. Here is how.'),
  f('heard.items', 'Quotes', HEARD_ITEMS, LIST, 'The homepage shows the first three; the How it works page shows all of them.', {
    itemLabel: 'Quote',
    summaryKey: 'quote',
    fields: [
      { key: 'quote', label: 'What they said', type: 'richtext' },
      { key: 'name', label: 'Attribution', type: 'text', hint: 'e.g. "R., 31"' },
    ],
  }),

  // ── Approach ──────────────────────────────────────────────────────────────
  f('approach.eyebrow', 'Eyebrow', 'How it works'),
  f('approach.headline', 'Headline', 'Four steps. No waiting rooms.'),
  f('approach.lead', 'Lead paragraph', 'Most people give up on finding a therapist somewhere between the third voicemail and the second waitlist. We removed that part.', 'richtext'),
  f('approach.image_url', 'How it works page photo (URL)', IMAGES.approach),
  f('approach.home_cta', 'Homepage "learn more" link', 'How matching works'),
  f('approach.header_cta', 'Button in the page header', 'Start the intake'),
  f('approach.steps', 'Steps', process, LIST, 'Four cards in a row. Add or remove and the row re-flows.', {
    itemLabel: 'Step',
    summaryKey: 'title',
    fields: [
      { key: 'step', label: 'Number', type: 'text', hint: 'e.g. 01' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'body', label: 'Body', type: 'richtext' },
      { key: 'detail', label: 'Small chip at the bottom', type: 'text', hint: 'e.g. "Avg. 1m 50s". Leave blank for none.' },
    ],
  }),

  // ── Why Lumen ─────────────────────────────────────────────────────────────
  f('why.eyebrow', 'Eyebrow', 'Why Lumen'),
  f('why.headline', 'Headline', 'What makes it hold together.'),
  f('why.items', 'Cards', WHY_ITEMS, LIST, null, {
    itemLabel: 'Card',
    summaryKey: 'title',
    fields: [
      { key: 'icon', label: 'Icon', type: 'icon' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'body', label: 'Body', type: 'richtext' },
    ],
  }),

  // ── Breathing ─────────────────────────────────────────────────────────────
  f('breathing.eyebrow', 'Eyebrow', 'Breathe'),
  f('breathing.headline', 'Headline', 'A moment, right now.'),
  f('breathing.lead', 'Lead paragraph', 'Guided breathing exercises from our clinical team. Each session takes under five minutes.', 'richtext'),
  f('breathing.image_url', 'Breathe page photo (URL)', IMAGES.breathing),
  f('breathing.inhale_label', 'Prompt: breathe in', 'Breathe in'),
  f('breathing.hold_label', 'Prompt: hold', 'Hold'),
  f('breathing.exhale_label', 'Prompt: breathe out', 'Breathe out'),
  f('breathing.cycle_label', 'Cycle counter', 'Cycle {n} of {total}', 'text', 'Use {n} and {total} where the numbers should go.'),
  f('breathing.end_label', 'Button during a session', 'End session'),
  f('breathing.done_title', 'Title when a session finishes', 'Session complete'),
  f('breathing.done_body', 'Body when a session finishes', 'Take a moment to notice how you feel.', 'richtext'),

  // ── Services ──────────────────────────────────────────────────────────────
  f('services.eyebrow', 'Eyebrow', 'What we treat'),
  f('services.headline', 'Headline', 'Care built around the thing you actually came for.'),
  f('services.image_url', 'Services page photo (URL)', IMAGES.services),
  f('services.home_cta', 'Homepage "see all" link', 'See every service'),
  f('services.header_cta', 'Button in the page header', 'Book a session'),
  f('services.price_prefix', 'Word before the price on a card', 'from'),
  f('services.aside', 'Side note', 'Every clinician here specialises. You will not be handed to whoever happened to have a Tuesday free.', 'richtext'),
  f('services.items', 'Service cards', services, LIST, 'These also fill the Care menu in the navigation and the booking form.', {
    itemLabel: 'Service',
    summaryKey: 'name',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'blurb', label: 'Description', type: 'richtext' },
      { key: 'icon', label: 'Icon', type: 'icon' },
      { key: 'modalities', label: 'Approach tags', type: 'tags', hint: 'Comma separated, e.g. CBT, ACT' },
      { key: 'duration', label: 'Session length', type: 'text', hint: 'e.g. 50 min' },
      { key: 'price', label: 'Price from', type: 'number' },
      { key: 'id', label: 'Internal id', type: 'text', hint: 'Lowercase, no spaces. Used in links and the booking form — changing it breaks saved links.', advanced: true },
    ],
  }),

  // ── Therapists ────────────────────────────────────────────────────────────
  f('therapists.eyebrow', 'Eyebrow', 'The practice'),
  f('therapists.headline', 'Headline', 'People, not profiles.'),
  f('therapists.lead', 'Lead paragraph', 'Read them properly before you choose. Every therapist here offers a free fifteen-minute intro call, because fit is not something you can tell from a headshot.', 'richtext'),
  f('therapists.image_url', 'Therapists page photo (URL)', IMAGES.therapists),
  f('therapists.home_cta', 'Homepage "meet everyone" link', 'Meet the whole team'),
  f('therapists.items', 'Therapist cards', therapists, LIST, null, {
    itemLabel: 'Therapist',
    summaryKey: 'name',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'credentials', label: 'Credentials', type: 'text', hint: 'e.g. PsyD, Clinical Psychologist' },
      { key: 'pronouns', label: 'Pronouns', type: 'text' },
      { key: 'years', label: 'Years of experience', type: 'number' },
      { key: 'bio', label: 'Bio', type: 'richtext' },
      { key: 'focus', label: 'Focus tags', type: 'tags' },
      { key: 'languages', label: 'Languages', type: 'tags' },
      { key: 'formats', label: 'Formats', type: 'tags', hint: 'e.g. Video, Phone, In person' },
      { key: 'services', label: 'Services they cover', type: 'tags', hint: 'The internal ids from Services — this drives the filter chips' },
      { key: 'nextAvailable', label: 'Next available in (days)', type: 'number' },
      { key: 'id', label: 'Internal id', type: 'text', advanced: true },
      { key: 'hue', label: 'Portrait colours', type: 'tags', hint: 'Two numbers 0-360', advanced: true },
    ],
  }),
  f('therapists.empty_note', 'Empty filter note', 'Nobody listed for that yet — but we almost certainly have someone.'),
  f('therapists.empty_cta', 'Link at the end of the empty note', 'Ask for a match'),
  f('therapists.header_cta', 'Button in the page header', 'Ask for a match'),
  f('therapists.book_label', 'Button on each card', 'Book'),
  f('therapists.filter_all', 'First filter chip', 'Everyone'),
  f('therapists.available_tomorrow', 'Availability, next day', 'Available tomorrow'),
  f('therapists.available_days', 'Availability, later', 'Available in {days} days', 'text', 'Use {days} where the number should go.'),

  // ── Explore (homepage cards linking to blog / videos / breathe) ───────────
  f('explore.eyebrow', 'Eyebrow', 'Between sessions'),
  f('explore.headline', 'Headline', 'Something to take with you.'),
  f('explore.lead', 'Lead paragraph', 'The blog, the video library and a one-minute breathing exercise. Free, no account, no appointment.', 'richtext'),
  f('explore.blog_kicker', 'Card 1: small label', 'Blog'),
  f('explore.blog_title', 'Card 1: heading', 'Read something useful'),
  f('explore.blog_body', 'Card 1: body', 'Articles written and reviewed by our clinicians, on the things people actually bring to a first session.', 'richtext'),
  f('explore.blog_preview', 'Card 1: line showing the newest article', 'Latest: {title}', 'text', 'Use {title} where the article title should go. Hidden when nothing is published.'),
  f('explore.blog_cta', 'Card 1: link label', 'Read the blog'),
  f('explore.video_kicker', 'Card 2: small label', 'Video'),
  f('explore.video_title', 'Card 2: heading', 'Watch a short one'),
  f('explore.video_body', 'Card 2: body', 'Five-minute explainers on anxiety, sleep and getting started, picked by the clinical team.', 'richtext'),
  f('explore.video_preview', 'Card 2: line showing the featured video', 'Featured: {title}', 'text', 'Use {title} where the video title should go. Hidden when there are no videos.'),
  f('explore.video_cta', 'Card 2: link label', 'Watch the videos'),
  f('explore.breathe_kicker', 'Card 3: small label', 'Breathe'),
  f('explore.breathe_title', 'Card 3: heading', 'Take one minute now'),
  f('explore.breathe_body', 'Card 3: body', 'A guided breathing exercise you can do at your desk, before a call, or at three in the morning.', 'richtext'),
  f('explore.breathe_preview', 'Card 3: line showing the first exercise', 'Try {name} · {n} cycles', 'text', 'Use {name} for the exercise and {n} for the number of cycles.'),
  f('explore.breathe_cta', 'Card 3: link label', 'Start breathing'),

  // ── Video resources ───────────────────────────────────────────────────────
  f('resources.eyebrow', 'Eyebrow', 'Resources'),
  f('resources.headline', 'Headline', 'Worth your time between sessions.'),
  f('resources.lead', 'Lead paragraph', 'Videos and articles reviewed by our clinical team, on anxiety, sleep, relationships and more.', 'richtext'),
  f('resources.image_url', 'Resources page photo (URL)', IMAGES.resources),
  f('resources.videos_title', 'Videos sub-heading', 'Watch'),
  f('resources.videos_empty', 'Shown when there are no active videos', 'No videos yet. Add one from the admin and it appears here.'),
  f('resources.articles_empty', 'Shown when no articles are published', 'No articles yet.'),
  f('resources.read_cta', 'Link on an article card', 'Read article'),
  f('resources.open_page', 'Link inside the article pop-up', 'Open as a page'),
  f('resources.default_category', 'Category shown when an article has none', 'Mental health'),
  f('resources.articles_title', 'Articles sub-heading', 'Read'),

  // ── Testimonials ──────────────────────────────────────────────────────────
  f('testimonials.eyebrow', 'Eyebrow', 'In their words'),
  f('testimonials.headline', 'Headline', 'The part that is hard to put in a brochure.'),
  f('testimonials.items', 'Quotes', testimonials, LIST, null, {
    itemLabel: 'Testimonial',
    summaryKey: 'quote',
    fields: [
      { key: 'quote', label: 'Quote', type: 'richtext' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'meta', label: 'Under the name', type: 'text', hint: 'e.g. "Client, 14 months"' },
    ],
  }),

  // ── Blog ──────────────────────────────────────────────────────────────────
  f('blog.eyebrow', 'Eyebrow (blog page)', 'Medical blog'),
  f('blog.headline', 'Headline (blog page)', 'Insights from our clinical team.'),
  f('blog.lead', 'Lead paragraph (blog page)', 'Evidence-based articles written and reviewed by licensed clinicians.', 'richtext'),
  f('blog.view_all', 'View-all link label', 'Read all articles'),
  f('blog.read_more', 'Link on a card', 'Read more'),
  f('blog.empty', 'Shown when nothing is published', 'No articles yet. Check back soon.'),
  f('blog.prev', 'Pagination: previous', 'Previous'),
  f('blog.next', 'Pagination: next', 'Next'),
  f('blog.back_link', 'Link back to the list', 'All articles'),
  f('blog.read_time_suffix', 'After the reading time', 'min read'),
  f('blog.related_title', 'Heading above related articles', 'Related articles'),
  f('blog.post_cta_title', 'Call to action under an article', 'Ready to talk to someone?'),
  f('blog.post_cta_body', 'Body of that call to action', 'Our therapists are accepting new clients.', 'richtext'),
  f('blog.post_cta_button', 'Button of that call to action', 'Book a session'),
  f('blog.categories', 'Category filter chips', BLOG_CATEGORIES, LIST, 'The first chip shows everything.', strings('Category')),

  // ── Pricing ───────────────────────────────────────────────────────────────
  f('pricing.eyebrow', 'Eyebrow', 'Cost'),
  f('pricing.headline', 'Headline', 'Priced plainly, before you book.'),
  f('pricing.lead', 'Lead paragraph', 'You see your exact out-of-pocket cost on the booking screen — insurance applied, nothing surfacing on a statement three weeks later.', 'richtext'),
  f('pricing.image_url', 'Pricing page photo (URL)', IMAGES.pricing),
  f('pricing.plans', 'Plans', plans, LIST, null, {
    itemLabel: 'Plan',
    summaryKey: 'name',
    fields: [
      { key: 'name', label: 'Plan name', type: 'text' },
      { key: 'blurb', label: 'One-line description', type: 'text' },
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'cadence', label: 'Under the price', type: 'text', hint: 'e.g. "per 50-min session"' },
      { key: 'features', label: 'What is included', type: 'tags', hint: 'One per line or comma separated' },
      { key: 'cta', label: 'Button label', type: 'text' },
      { key: 'featured', label: 'Highlight this plan', type: 'boolean' },
      { key: 'id', label: 'Internal id', type: 'text', advanced: true },
    ],
  }),
  f('pricing.featured_badge', 'Badge on the highlighted plan', 'Most chosen'),
  f('pricing.footnote', 'Footnote', 'In-network with Aetna, Cigna, United and Blue Shield of California. Out-of-network claims filed for you. Sliding-scale places are always held open — ask during intake, and no, you will not be asked to prove it.', 'richtext'),

  // ── FAQ ───────────────────────────────────────────────────────────────────
  f('faq.eyebrow', 'Eyebrow', 'Questions'),
  f('faq.headline', 'Headline', 'The things people ask before they book.'),
  f('faq.aside', 'Side card text', 'Still unsure? Talk to a real person — no intake form, no obligation.', 'richtext'),
  f('faq.fallback_items', 'Fallback questions', faqs, LIST, 'Only shown while nothing is published under FAQs in the sidebar — use that page instead for day-to-day edits.', {
    itemLabel: 'Question',
    summaryKey: 'q',
    fields: [
      { key: 'q', label: 'Question', type: 'text' },
      { key: 'a', label: 'Answer', type: 'richtext' },
    ],
  }),

  // ── CTA band ──────────────────────────────────────────────────────────────
  f('cta.headline', 'Headline (plain part)', 'The hardest part is'),
  f('cta.headline_accent', 'Headline (highlighted part)', 'starting.'),
  f('cta.body', 'Body', 'Two minutes now, a matched therapist by tomorrow, a first session this week. You can change your mind at any point in that sequence.', 'richtext'),
  f('cta.primary', 'Primary button', 'Book your first session'),
  f('cta.secondary', 'Secondary button', 'Or just call us'),
  f('cta.image_url', 'Call-to-action photo (URL)', IMAGES.services, 'text', 'Leave blank for a plain card.'),
  f('cta.reassurances', 'Reassurance chips', ['Free 15-min intro call', 'Cancel any time', 'No card to browse'], LIST, null, strings('Chip')),

  // ── Footer ────────────────────────────────────────────────────────────────
  f('footer.blurb', 'Footer blurb', 'A modern practice for people who have been meaning to do this for a while.', 'richtext'),
  f('footer.disclaimer', 'Footer disclaimer', `This site is a design demonstration. ${brand.name} is a fictional practice — nothing here is medical advice.`, 'richtext'),
  f('footer.copyright_suffix', 'Copyright suffix', 'Therapy, PC. All rights reserved.'),
  f('footer.book_label', 'Button in the footer', 'Book a session'),
  f('footer.col1_title', 'First column heading', 'Practice'),
  f('footer.col2_title', 'Second column heading', 'Resources'),
  f('footer.col3_title', 'Third column heading', 'Legal'),
  f('footer.privacy_url', 'Privacy policy link', '#'),
  f('footer.terms_url', 'Terms of service link', '#'),
  f('footer.accessibility_url', 'Accessibility link', '#'),

  // ── Booking ───────────────────────────────────────────────────────────────
  f('booking.mobile_bar_label', 'Mobile sticky bar label', 'Book a session'),
  f('booking.dialog_title', 'Dialog title', 'Book a session'),
  f('booking.step_note', 'Small note by the Continue button', 'Takes about two minutes.'),
  f('booking.continue', 'Continue button', 'Continue'),
  f('booking.back', 'Back button', 'Back'),
  f('booking.submit', 'Final submit button', 'Confirm booking'),
  f('booking.formats', 'How they can meet', BOOKING_FORMATS, LIST, 'The three options on the Format step.', {
    itemLabel: 'Format',
    summaryKey: 'label',
    fields: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'note', label: 'Note underneath', type: 'text' },
      { key: 'icon', label: 'Icon', type: 'icon' },
      { key: 'id', label: 'Internal id', type: 'text', advanced: true },
    ],
  }),
  f('booking.who', 'Who the session is for', BOOKING_WHO, LIST, null, {
    itemLabel: 'Option',
    summaryKey: 'label',
    fields: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'id', label: 'Internal id', type: 'text', advanced: true },
    ],
  }),
  f('booking.cadence', 'How often, to start', BOOKING_CADENCE, LIST, null, {
    itemLabel: 'Option',
    summaryKey: 'label',
    fields: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'note', label: 'Note underneath', type: 'text' },
      { key: 'id', label: 'Internal id', type: 'text', advanced: true },
    ],
  }),
  f('booking.concerns', 'What brings you here (chips)', concerns, LIST, 'The chips on the first step.', strings('Chip')),
  f('booking.insurers', 'Insurers in the dropdown', INSURERS, LIST, null, strings('Insurer')),
  f('booking.steps', 'The six steps', BOOKING_STEPS, LIST, 'The heading and the line under it on each step of the form.', {
    itemLabel: 'Step',
    summaryKey: 'title',
    fields: [
      { key: 'label', label: 'Name in the progress line', type: 'text' },
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'lead', label: 'Line under the heading', type: 'richtext' },
      { key: 'id', label: 'Internal id', type: 'text', advanced: true },
    ],
  }),
  f('booking.field_name', 'Field label: name', 'Full name'),
  f('booking.field_email', 'Field label: email', 'Email'),
  f('booking.field_phone', 'Field label: phone', 'Phone'),
  f('booking.field_insurer', 'Field label: insurance', 'Insurance'),
  f('booking.field_note', 'Field label: note', 'Anything you want your therapist to know first?'),
  f('booking.optional', 'Hint on optional fields', 'Optional'),
  f('booking.who_question', 'Question above the "who is this for" options', 'Who is this for?'),
  f('booking.cadence_question', 'Question above the cadence options', 'How often, to start?'),
  f('booking.match_me', 'Button: let us choose the therapist', 'Match me with someone'),
  f('booking.focus_label', 'Label above a therapist\'s focus tags', 'Focus areas'),
  f('booking.estimate_label', 'Label above the estimated cost', 'Estimated due at session'),
  f('booking.success_title', 'Confirmation heading', 'You are booked.'),
  f('booking.reference_label', 'Label above the booking reference', 'Reference'),
  f('booking.add_to_calendar', 'Button on the confirmation', 'Add to calendar'),
  f('booking.success_privacy', 'Small print on the confirmation', "Your information is stored securely and only accessible to our clinical team. We'll be in touch within one business day.", 'richtext'),

  // ── Buttons and labels used in more than one place ────────────────────────
  f('ui.skip_link', 'Skip-to-content link', 'Skip to content'),
  f('ui.close', 'Close button', 'Close'),
  f('ui.crisis_prefix', 'Crisis banner prefix', 'In immediate crisis?'),
  f('ui.error_title', 'Error screen title', 'Something went wrong'),
  f('ui.error_body', 'Error screen body', 'That is on us, not you. Reloading usually fixes it.', 'richtext'),
  f('ui.error_button', 'Error screen button', 'Reload the page'),
  f('ui.notfound_title', '404 title', 'Page not found'),
  f('ui.notfound_body', '404 body', "The page you're looking for doesn't exist or may have moved.", 'richtext'),
  f('ui.notfound_primary', '404 primary button', 'Back to home'),
  f('ui.notfound_secondary', '404 secondary button', 'Videos and articles'),
  f('ui.crash_title', 'Crash screen heading', 'This page failed to load.'),
  f('ui.crash_body', 'Crash screen body', 'That is on us, not you. Reloading usually fixes it — and you can always reach the practice directly.', 'richtext'),
  f('ui.call_prefix', 'Before a phone number on a button', 'Call'),
  f('ui.palette_title', 'Cmd-K palette title', 'Quick actions'),
  f('ui.palette_placeholder', 'Cmd-K palette search box', 'Search or jump to…'),
  f('ui.palette_empty', 'Cmd-K palette: nothing found', 'Nothing matches that.'),
  f('ui.palette_book', 'Cmd-K palette: book entry', 'Book a session'),
  f('ui.palette_call', 'Cmd-K palette: call entry', 'Call the practice'),
  f('ui.palette_crisis', 'Cmd-K palette: crisis entry', 'Crisis line — call or text 988'),
  f('ui.palette_group_book', 'Cmd-K palette: group heading', 'Book'),
  f('ui.palette_group_therapists', 'Cmd-K palette: group heading', 'Therapists'),
  f('ui.palette_group_pages', 'Cmd-K palette: group heading', 'Go to'),
  f('ui.palette_group_contact', 'Cmd-K palette: group heading', 'Contact'),
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
  'brand', 'nav', 'footer', 'booking', 'ui',
  'hero', 'trust', 'heard', 'testimonials', 'explore', 'cta',
  'services', 'approach', 'why', 'faq', 'therapists', 'pricing', 'resources', 'blog', 'breathing',
];

/**
 * Which page of the site each section belongs to. The admin groups by this, so
 * finding a piece of text means thinking "which page is it on" rather than
 * guessing a key name.
 */
export const SECTION_PAGE = {
  brand: 'everywhere',
  nav: 'everywhere',
  footer: 'everywhere',
  booking: 'everywhere',
  ui: 'everywhere',
  hero: 'home',
  trust: 'home',
  heard: 'home',
  testimonials: 'home',
  explore: 'home',
  cta: 'home',
  services: 'services',
  approach: 'how',
  why: 'how',
  faq: 'how',
  therapists: 'therapists',
  pricing: 'pricing',
  resources: 'resources',
  blog: 'resources',
  breathing: 'breathe',
};

export const PAGE_ORDER = ['everywhere', 'home', 'services', 'how', 'therapists', 'pricing', 'resources', 'breathe'];

export const PAGE_TITLES = {
  everywhere: 'Everywhere',
  home: 'Home page',
  services: 'Services page',
  how: 'How it works page',
  therapists: 'Therapists page',
  pricing: 'Pricing page',
  resources: 'Resources & blog',
  breathe: 'Breathe page',
};

export const PAGE_PATHS = {
  everywhere: null,
  home: '/',
  services: '/services',
  how: '/how-it-works',
  therapists: '/therapists',
  pricing: '/pricing',
  resources: '/resources',
  breathe: '/breathe',
};

export const PAGE_BLURBS = {
  everywhere: 'The header, the footer, the booking form and anything shared by every page.',
  home: 'The short landing page: hero, the numbers, "we heard you", testimonials, the explore cards and the closing call to action.',
  services: 'The page behind the Care menu.',
  how: 'Steps, "Why Lumen" and the questions people ask before booking.',
  therapists: 'The team, their filters and their cards.',
  pricing: 'Plans and the small print.',
  resources: 'Videos, articles and the blog.',
  breathe: 'The guided breathing exercises.',
};

export const SECTION_TITLES = {
  ui: 'Shared buttons & error screens',
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
  explore: 'Explore cards (blog, video, breathe)',
  blog: 'Blog',
  pricing: 'Pricing',
  faq: 'FAQ',
  cta: 'Call to action',
  footer: 'Footer',
  booking: 'Booking',
};
