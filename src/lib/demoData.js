/**
 * In-memory demo data store — used when Supabase credentials are not configured.
 * Provides realistic sample data and working CRUD operations so the admin panel
 * is fully functional for client demos without any backend.
 */

let _articles = [
  {
    id: 'demo-a1', title: 'What Actually Happens in Your First Therapy Session', slug: 'first-therapy-session',
    excerpt: 'The anticipation is almost always worse than the thing itself. Here\'s a realistic walkthrough of what to expect.',
    category: 'Getting Started', is_published: true, published_at: '2026-08-28T12:00:00Z', updated_at: '2026-08-28T12:00:00Z',
    author_id: 'demo-admin',
    content: `<p>If you've been putting off booking a therapy session, you're not alone. The unknown is often the biggest barrier.</p><h2>Before the session</h2><p>Most practices will send you a brief intake form. At Lumen, it takes about two minutes.</p><h2>The first 10 minutes</h2><p>Your therapist will introduce themselves, explain confidentiality, and ask an open-ended question — usually "What made you reach out now?"</p><h2>What you don't have to do</h2><ul><li>Cry (though it's fine if you do)</li><li>Have a "breakthrough"</li><li>Share anything you're not ready to share</li></ul>`,
  },
  {
    id: 'demo-a2', title: 'Anxiety vs. Worry: When Normal Stress Becomes a Clinical Concern', slug: 'anxiety-vs-worry',
    excerpt: 'Everyone worries. But when worry starts running your calendar, that\'s different.',
    category: 'Anxiety', is_published: true, published_at: '2026-08-15T12:00:00Z', updated_at: '2026-08-15T12:00:00Z',
    author_id: 'demo-admin',
    content: `<p>Worry is a thinking problem. Anxiety is a <em>body</em> problem.</p><h2>Normal worry</h2><p>Worry is specific, time-limited, and proportional.</p><h2>Clinical anxiety</h2><p>Anxiety generalises. Your body stays activated even when there's no clear threat.</p><h2>When to seek help</h2><p>If worry is changing your behaviour — avoiding situations, cancelling plans — that's worth talking to someone about.</p>`,
  },
  {
    id: 'demo-a3', title: 'The Science Behind Breathing Exercises', slug: 'science-of-breathing',
    excerpt: 'Controlled breathing directly engages your vagus nerve and shifts your nervous system in under 90 seconds.',
    category: 'Techniques', is_published: true, published_at: '2026-08-02T12:00:00Z', updated_at: '2026-08-02T12:00:00Z',
    author_id: 'demo-admin',
    content: `<p>When someone tells you to "just breathe" during a panic attack, the science is surprisingly robust.</p><h2>The vagus nerve</h2><p>When you exhale slowly, you stimulate the vagus nerve — slowing your heart rate and signalling safety.</p><h2>The 90-second rule</h2><p>The chemical lifespan of an emotion is roughly 90 seconds. Controlled breathing helps you ride it out.</p>`,
  },
  {
    id: 'demo-a4', title: '5 Signs You Might Be Experiencing Burnout', slug: 'burnout-vs-stress',
    excerpt: 'Burnout isn\'t just being tired. It\'s where effort stops producing results.',
    category: 'Mindfulness', is_published: true, published_at: '2026-07-20T12:00:00Z', updated_at: '2026-07-20T12:00:00Z',
    author_id: 'demo-admin',
    content: `<p>Stress is over-engagement. Burnout is disengagement.</p><h2>1. Exhaustion that sleep doesn't fix</h2><p>You've had a full weekend. Monday morning feels as heavy as Friday evening.</p><h2>2. Cynicism about work you used to care about</h2><p>Your mind is protecting itself from further disappointment.</p>`,
  },
  {
    id: 'demo-a5', title: 'How EMDR Actually Works: A Therapist Explains', slug: 'how-emdr-works',
    excerpt: 'EMDR sounds implausible. It isn\'t. Here\'s the neuroscience behind it.',
    category: 'Trauma', is_published: true, published_at: '2026-07-08T12:00:00Z', updated_at: '2026-07-08T12:00:00Z',
    author_id: 'demo-admin',
    content: `<p>EMDR is endorsed by the WHO, the VA, and the APA.</p><h2>The stuck memory model</h2><p>Traumatic memories get "stuck" in a raw, unprocessed form.</p><h2>What bilateral stimulation does</h2><p>It mimics REM sleep, restarting a process that got interrupted.</p>`,
  },
  {
    id: 'demo-a6', title: 'Couples Therapy Isn\'t Just for Couples in Crisis', slug: 'couples-therapy-prevention',
    excerpt: 'The best time to start couples therapy is when things are mostly fine.',
    category: 'Relationships', is_published: false, published_at: null, updated_at: '2026-06-25T12:00:00Z',
    author_id: 'demo-admin',
    content: `<p>The average couple waits <strong>six years</strong> after problems begin before seeking help.</p><h2>The maintenance model</h2><p>Think of it like a car service — don't wait until the engine seizes.</p>`,
  },
];

let _exercises = [
  { id: 'demo-e1', name: 'Box Breathing', slug: 'box-breathing', technique: 'box', description: 'Reset the nervous system quickly. Used by Navy SEALs.', inhale_sec: 4, hold_in_sec: 4, exhale_sec: 4, hold_out_sec: 4, cycles: 4, benefits: ['Reduces stress', 'Improves focus', 'Calms anxiety'], suitable_for: ['anxiety', 'focus'], difficulty: 'beginner', is_active: true, sort_order: 0 },
  { id: 'demo-e2', name: '4-7-8 Technique', slug: '4-7-8-technique', technique: '4-7-8', description: 'Extended exhale activates the parasympathetic nervous system.', inhale_sec: 4, hold_in_sec: 7, exhale_sec: 8, hold_out_sec: 0, cycles: 4, benefits: ['Promotes sleep', 'Reduces anxiety', 'Lowers heart rate'], suitable_for: ['sleep', 'anxiety'], difficulty: 'intermediate', is_active: true, sort_order: 1 },
  { id: 'demo-e3', name: 'Triangle Breathing', slug: 'triangle-breathing', technique: 'triangle', description: 'Gentle three-phase pattern ideal for beginners.', inhale_sec: 4, hold_in_sec: 4, exhale_sec: 4, hold_out_sec: 0, cycles: 6, benefits: ['Gentle on beginners', 'Reduces tension', 'Grounding'], suitable_for: ['beginners', 'anxiety'], difficulty: 'beginner', is_active: true, sort_order: 2 },
];

let _videos = [
  { id: 'demo-v1', title: 'Understanding Anxiety: What Your Brain Is Actually Doing', youtube_id: 'BVJkf8IuRXk', category: 'Anxiety', duration_sec: 612, curator_note: 'A clear, science-backed overview of the anxiety response.', tags: ['anxiety', 'neuroscience'], is_featured: true, is_active: true, sort_order: 0 },
  { id: 'demo-v2', title: 'How to Cope With Depression', youtube_id: 'TVgQ_tgWMyY', category: 'Depression', duration_sec: 480, curator_note: 'Practical daily strategies that complement therapy.', tags: ['depression', 'coping'], is_featured: true, is_active: true, sort_order: 1 },
  { id: 'demo-v3', title: 'The Power of Vulnerability', youtube_id: 'iCvmsMzlF7o', category: 'Relationships', duration_sec: 1221, curator_note: 'Brené Brown on why vulnerability is the birthplace of connection.', tags: ['relationships', 'vulnerability'], is_featured: true, is_active: true, sort_order: 2 },
  { id: 'demo-v4', title: 'Guided Sleep Meditation', youtube_id: 'rvaqPPjGHcY', category: 'Sleep', duration_sec: 1800, curator_note: 'A gentle guided meditation for restless nights.', tags: ['sleep', 'meditation'], is_featured: true, is_active: true, sort_order: 3 },
  { id: 'demo-v5', title: 'How Trauma Gets Stored in the Body', youtube_id: '53bKaEv9WxE', category: 'Trauma', duration_sec: 725, curator_note: 'Bessel van der Kolk on the body-mind connection.', tags: ['trauma', 'somatic'], is_featured: true, is_active: true, sort_order: 4 },
  { id: 'demo-v6', title: 'Setting Boundaries Without Guilt', youtube_id: '5U3VKE-2nkQ', category: 'Self-care', duration_sec: 540, curator_note: 'Practical scripts for saying no.', tags: ['boundaries', 'self-care'], is_featured: true, is_active: true, sort_order: 5 },
];

let _faqs = [
  { id: 'demo-f1', question: 'Do you take insurance?', answer: 'We are in-network with Aetna, Cigna, United and Blue Shield of California. For everyone else we file out-of-network claims on your behalf.', category: 'Pricing', sort_order: 0, is_published: true },
  { id: 'demo-f2', question: 'How quickly can I be seen?', answer: 'Median time from intake to first session is 36 hours. Same-week availability is the norm.', category: 'Process', sort_order: 1, is_published: true },
  { id: 'demo-f3', question: 'What if my therapist is not the right fit?', answer: 'Switch from your dashboard, no explanation required and no charge.', category: 'Process', sort_order: 2, is_published: true },
  { id: 'demo-f4', question: 'Is this confidential?', answer: 'Yes. Sessions are HIPAA-compliant and end-to-end encrypted.', category: 'Privacy', sort_order: 3, is_published: true },
  { id: 'demo-f5', question: 'Do you offer in-person sessions?', answer: 'At our San Francisco practice on Filbert Street, yes — and most therapists offer a mix.', category: 'Process', sort_order: 4, is_published: true },
  { id: 'demo-f6', question: 'What does it cost without insurance?', answer: 'Individual sessions are $165 for 50 minutes, couples $240 for 80, psychiatry $220 for the initial consult.', category: 'Pricing', sort_order: 5, is_published: true },
];

let _bookings = [
  { id: 'demo-b1', reference: 'LM-8F3A2D01', name: 'Sarah Chen', email: 'sarah.c@example.com', phone: '+1 415-555-0199', concerns: ['Anxiety', 'Sleep'], who: 'individual', format: 'video', cadence: 'weekly', preferred_therapist: 'priya-raman', preferred_date: '2026-09-15', preferred_time: '10:00 AM', insurer: 'Blue Shield', notes: 'Prefer morning sessions. Have tried meditation apps but need more structured help.', status: 'pending', submitted_at: '2026-09-08T14:23:00Z', contacted_at: null },
  { id: 'demo-b2', reference: 'LM-2B7C4E90', name: 'Michael Rivera', email: 'mrivera@example.com', phone: '+1 510-555-0142', concerns: ['Depression', 'Life transitions'], who: 'individual', format: 'in-person', cadence: 'weekly', preferred_therapist: null, preferred_date: '2026-09-12', preferred_time: '2:00 PM', insurer: 'Aetna', notes: null, status: 'contacted', submitted_at: '2026-09-06T09:15:00Z', contacted_at: '2026-09-06T16:30:00Z' },
  { id: 'demo-b3', reference: 'LM-9D1E5F33', name: 'Emily & James Park', email: 'emilypark@example.com', phone: null, concerns: ['Relationships'], who: 'couples', format: 'video', cadence: 'fortnightly', preferred_therapist: 'marcus-lindqvist', preferred_date: null, preferred_time: 'Evenings', insurer: null, notes: 'We\'ve been together 8 years. Not in crisis, just want to communicate better.', status: 'booked', submitted_at: '2026-09-01T20:45:00Z', contacted_at: '2026-09-02T10:00:00Z' },
  { id: 'demo-b4', reference: 'LM-4A6B8C22', name: 'Jordan Taylor', email: 'j.taylor@example.com', phone: '+1 650-555-0187', concerns: ['Trauma / PTSD', 'Anxiety'], who: 'individual', format: 'in-person', cadence: 'weekly', preferred_therapist: 'ada-okonkwo', preferred_date: '2026-09-18', preferred_time: '11:00 AM', insurer: 'Cigna', notes: null, status: 'pending', submitted_at: '2026-09-09T07:30:00Z', contacted_at: null },
];

let _siteContent = [
  // Hero
  { key: 'hero.tagline', section: 'hero', label: 'Hero tagline', type: 'text', value: 'Therapy that meets you where you are.', updated_at: '2026-09-01T00:00:00Z' },
  { key: 'hero.subheadline', section: 'hero', label: 'Hero subheadline', type: 'text', value: 'Licensed clinicians, matched to you by a human in under a day. Video, phone or in person — and a first session this week, not next quarter.', updated_at: '2026-09-01T00:00:00Z' },
  // Brand
  { key: 'brand.phone', section: 'brand', label: 'Phone number', type: 'text', value: '+1 (415) 555-0142', updated_at: '2026-09-01T00:00:00Z' },
  { key: 'brand.email', section: 'brand', label: 'Contact email', type: 'text', value: 'hello@lumentherapy.com', updated_at: '2026-09-01T00:00:00Z' },
  { key: 'brand.address', section: 'brand', label: 'Address', type: 'text', value: '2140 Filbert Street, San Francisco, CA 94123', updated_at: '2026-09-01T00:00:00Z' },
  { key: 'brand.tagline', section: 'brand', label: 'Brand tagline', type: 'text', value: 'Therapy that meets you where you are.', updated_at: '2026-09-01T00:00:00Z' },
  // Services
  { key: 'services.individual_blurb', section: 'services', label: 'Individual therapy blurb', type: 'text', value: 'Weekly one-to-one work on anxiety, depression, burnout, identity and the things that are hard to say out loud.', updated_at: '2026-09-01T00:00:00Z' },
  { key: 'services.couples_blurb', section: 'services', label: 'Couples therapy blurb', type: 'text', value: 'Structured sessions for communication, repair after rupture, intimacy and deciding what comes next — together.', updated_at: '2026-09-01T00:00:00Z' },
  { key: 'services.trauma_blurb', section: 'services', label: 'Trauma & EMDR blurb', type: 'text', value: 'Paced, consent-led processing for single-incident and complex trauma. You set the speed; we hold the frame.', updated_at: '2026-09-01T00:00:00Z' },
  { key: 'services.anxiety_blurb', section: 'services', label: 'Anxiety & panic blurb', type: 'text', value: 'Skills-first care for panic, health anxiety, OCD and the loops that keep you up at 3am. Homework optional, honestly.', updated_at: '2026-09-01T00:00:00Z' },
  { key: 'services.teen_blurb', section: 'services', label: 'Teens & young adults blurb', type: 'text', value: 'Ages 14–24. School pressure, social media, first heartbreaks, figuring out who you are without an audience.', updated_at: '2026-09-01T00:00:00Z' },
  { key: 'services.psychiatry_blurb', section: 'services', label: 'Psychiatry blurb', type: 'text', value: 'Board-certified psychiatric care, coordinated with your therapist so nobody is guessing what the other one did.', updated_at: '2026-09-01T00:00:00Z' },
  // Pricing
  { key: 'pricing.session_blurb', section: 'pricing', label: 'Pay per session blurb', type: 'text', value: 'No commitment. Book when you need to.', updated_at: '2026-09-01T00:00:00Z' },
  { key: 'pricing.weekly_blurb', section: 'pricing', label: 'Weekly care blurb', type: 'text', value: 'The rhythm most therapy actually works at.', updated_at: '2026-09-01T00:00:00Z' },
  { key: 'pricing.integrated_blurb', section: 'pricing', label: 'Therapy + psychiatry blurb', type: 'text', value: 'One care team, one plan, no repeating yourself.', updated_at: '2026-09-01T00:00:00Z' },
  // Approach
  { key: 'approach.headline', section: 'approach', label: 'Approach section headline', type: 'text', value: 'Getting started shouldn\'t feel like homework.', updated_at: '2026-09-01T00:00:00Z' },
  // Footer
  { key: 'footer.disclaimer', section: 'footer', label: 'Footer disclaimer', type: 'text', value: 'This site is a design demonstration. Lumen is a fictional practice — nothing here is medical advice.', updated_at: '2026-09-01T00:00:00Z' },
];

let _nextId = 100;
function genId() { return `demo-${++_nextId}`; }

// ── Articles ──
export const demoArticles = {
  listAll: () => [..._articles],
  listPublished: ({ page = 1, pageSize = 9, category = null } = {}) => {
    let filtered = _articles.filter((a) => a.is_published);
    if (category) filtered = filtered.filter((a) => a.category === category);
    filtered.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    const total = filtered.length;
    const articles = filtered.slice((page - 1) * pageSize, page * pageSize);
    return { articles, total };
  },
  getLatest: (limit = 3) => _articles.filter((a) => a.is_published).sort((a, b) => new Date(b.published_at) - new Date(a.published_at)).slice(0, limit),
  getHomepage: (limit = 3) => {
    const picked = _articles.filter((a) => a.is_published && a.is_featured);
    const rows = picked.length ? picked : _articles.filter((a) => a.is_published);
    return rows.sort((a, b) => new Date(b.published_at) - new Date(a.published_at)).slice(0, limit);
  },
  getBySlug: (slug) => _articles.find((a) => a.slug === slug && a.is_published) ?? null,
  getById: (id) => _articles.find((a) => a.id === id) ?? null,
  getRelated: (category, excludeSlug) => _articles.filter((a) => a.is_published && a.category === category && a.slug !== excludeSlug).slice(0, 3),
  upsert: (article) => {
    const idx = _articles.findIndex((a) => a.id === article.id);
    const item = { ...article, id: article.id || genId(), updated_at: new Date().toISOString() };
    if (idx >= 0) _articles[idx] = item; else _articles.unshift(item);
    return item;
  },
  delete: (id) => { _articles = _articles.filter((a) => a.id !== id); },
};

// ── Exercises ──
export const demoExercises = {
  listAll: () => [..._exercises].sort((a, b) => a.sort_order - b.sort_order),
  listActive: () => _exercises.filter((e) => e.is_active).sort((a, b) => a.sort_order - b.sort_order),
  upsert: (ex) => {
    const idx = _exercises.findIndex((e) => e.id === ex.id);
    const item = { ...ex, id: ex.id || genId() };
    if (idx >= 0) _exercises[idx] = item; else _exercises.push(item);
    return item;
  },
  delete: (id) => { _exercises = _exercises.filter((e) => e.id !== id); },
};

// ── Videos ──
export const demoVideos = {
  listAll: () => [..._videos].sort((a, b) => a.sort_order - b.sort_order),
  listFeatured: (limit = 6) => _videos.filter((v) => v.is_active && v.is_featured).sort((a, b) => a.sort_order - b.sort_order).slice(0, limit),
  listActive: ({ category } = {}) => { let r = _videos.filter((v) => v.is_active); if (category) r = r.filter((v) => v.category === category); return r.sort((a, b) => a.sort_order - b.sort_order); },
  upsert: (v) => {
    const idx = _videos.findIndex((x) => x.id === v.id);
    const item = { ...v, id: v.id || genId() };
    if (idx >= 0) _videos[idx] = item; else _videos.push(item);
    return item;
  },
  delete: (id) => { _videos = _videos.filter((v) => v.id !== id); },
};

// ── FAQs ──
export const demoFaqs = {
  listAll: () => [..._faqs].sort((a, b) => a.sort_order - b.sort_order),
  listPublished: () => _faqs.filter((f) => f.is_published).sort((a, b) => a.sort_order - b.sort_order),
  upsert: (f) => {
    const idx = _faqs.findIndex((x) => x.id === f.id);
    const item = { ...f, id: f.id || genId() };
    if (idx >= 0) _faqs[idx] = item; else _faqs.push(item);
    return item;
  },
  delete: (id) => { _faqs = _faqs.filter((f) => f.id !== id); },
};

// ── Bookings ──
export const demoBookings = {
  list: ({ status } = {}) => {
    let r = [..._bookings];
    if (status) r = r.filter((b) => b.status === status);
    return r.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
  },
  getById: (id) => _bookings.find((b) => b.id === id) ?? null,
  submit: (form, reference) => {
    const item = { id: genId(), reference, ...form, status: 'pending', submitted_at: new Date().toISOString(), contacted_at: null };
    _bookings.unshift(item);
    return item;
  },
  updateStatus: (id, status) => {
    const b = _bookings.find((x) => x.id === id);
    if (b) { b.status = status; if (status === 'contacted') b.contacted_at = new Date().toISOString(); }
  },
};

// ── Site Content ──
export const demoSiteContent = {
  getAll: () => [..._siteContent],
  /** Raw rows for one section — the shape the Supabase query returns. */
  getAllInSection: (section) => _siteContent.filter((c) => c.section === section),
  getSection: (section) => {
    const items = _siteContent.filter((c) => c.section === section);
    return Object.fromEntries(items.map(({ key, value, type, label }) => [key.split('.').pop(), { value, type, label, key }]));
  },
  upsert: ({ key, value, section, label, type }) => {
    const idx = _siteContent.findIndex((c) => c.key === key);
    const item = { key, value, section, label, type, updated_at: new Date().toISOString() };
    if (idx >= 0) _siteContent[idx] = item; else _siteContent.push(item);
  },
  delete: (key) => { _siteContent = _siteContent.filter((c) => c.key !== key); },
};
