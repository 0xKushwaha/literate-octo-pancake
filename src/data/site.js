export const brand = {
  name: 'zehnspaces',
  tagline: 'Therapy that meets you where you are.',
  // Real contact details are entered in Admin → Site content → Everywhere.
  // These defaults are only what shows before that is done.
  phone: '',
  email: 'hello@zehnspaces.com',
  address: '',
  crisis: 'Tele-MANAS 14416 (free, 24/7). In an emergency, call 112.',
};

export const stats = [
  { value: 14200, suffix: '+', label: 'Sessions held' },
  { value: 4.9, decimals: 1, suffix: '/5', label: 'Average client rating' },
  { value: 36, suffix: 'h', label: 'Median wait for a first session' },
  { value: 92, suffix: '%', label: 'Still in care after session four' },
];

export const services = [
  {
    id: 'individual',
    name: 'Individual therapy',
    blurb:
      'Weekly one-to-one work on anxiety, depression, burnout, identity and the things that are hard to say out loud.',
    modalities: ['CBT', 'ACT', 'Psychodynamic'],
    duration: '50 min',
    price: 165,
    icon: 'person',
  },
  {
    id: 'couples',
    name: 'Couples & relationships',
    blurb:
      'Structured sessions for communication, repair after rupture, intimacy and deciding what comes next — together.',
    modalities: ['Gottman', 'EFT'],
    duration: '80 min',
    price: 240,
    icon: 'hearts',
  },
  {
    id: 'trauma',
    name: 'Trauma & EMDR',
    blurb:
      'Paced, consent-led processing for single-incident and complex trauma. You set the speed; we hold the frame.',
    modalities: ['EMDR', 'IFS', 'Somatic'],
    duration: '60 min',
    price: 195,
    icon: 'wave',
  },
  {
    id: 'anxiety',
    name: 'Anxiety & panic',
    blurb:
      'Skills-first care for panic, health anxiety, OCD and the loops that keep you up at 3am. Homework optional, honestly.',
    modalities: ['CBT', 'ERP'],
    duration: '50 min',
    price: 165,
    icon: 'pulse',
  },
  {
    id: 'teen',
    name: 'Teens & young adults',
    blurb:
      'Ages 14–24. School pressure, social media, first heartbreaks, figuring out who you are without an audience.',
    modalities: ['DBT-informed', 'Family systems'],
    duration: '50 min',
    price: 150,
    icon: 'sprout',
  },
  {
    id: 'psychiatry',
    name: 'Psychiatry & medication',
    blurb:
      'Board-certified psychiatric care, coordinated with your therapist so nobody is guessing what the other one did.',
    modalities: ['Med management', 'Second opinions'],
    duration: '30 min',
    price: 220,
    icon: 'shield',
  },
];

export const therapists = [
  {
    id: 'ada-okonkwo',
    name: 'Dr. Ada Okonkwo',
    credentials: 'PsyD, Clinical Psychologist',
    pronouns: 'she/her',
    years: 12,
    focus: ['Trauma', 'EMDR', 'Grief'],
    languages: ['English', 'Igbo'],
    formats: ['Video', 'In person'],
    services: ['trauma', 'individual'],
    bio: 'Ada works slowly and deliberately with trauma. Her first question is never “what happened” — it is “what would make this room feel safe enough.”',
    hue: [357, 45],
    nextAvailable: 2,
  },
  {
    id: 'marcus-lindqvist',
    name: 'Marcus Lindqvist',
    credentials: 'LMFT, Couples Therapist',
    pronouns: 'he/him',
    years: 9,
    focus: ['Couples', 'Intimacy', 'Repair'],
    languages: ['English', 'Swedish'],
    formats: ['Video', 'In person'],
    services: ['couples', 'individual'],
    bio: 'Marcus is unusually good at hearing the argument underneath the argument. Expect structure, warmth, and the occasional very direct question.',
    hue: [32, 357],
    nextAvailable: 1,
  },
  {
    id: 'priya-raman',
    name: 'Priya Raman',
    credentials: 'LCSW, Anxiety Specialist',
    pronouns: 'she/her',
    years: 7,
    focus: ['Anxiety', 'OCD', 'Burnout'],
    languages: ['English', 'Tamil', 'Hindi'],
    formats: ['Video', 'Phone'],
    services: ['anxiety', 'individual'],
    bio: 'Priya builds practical, un-precious plans for people whose brains will not stop. She has a low tolerance for therapy that never leaves the room.',
    hue: [356, 40],
    nextAvailable: 1,
  },
  {
    id: 'noor-haddad',
    name: 'Noor Haddad',
    credentials: 'LPC, Adolescent Therapist',
    pronouns: 'they/them',
    years: 6,
    focus: ['Teens', 'Identity', 'Family'],
    languages: ['English', 'Arabic'],
    formats: ['Video', 'In person'],
    services: ['teen', 'individual'],
    bio: 'Noor has spent six years being the adult teenagers actually talk to. Parents get looped in on purpose, never by surprise.',
    hue: [45, 356],
    nextAvailable: 3,
  },
  {
    id: 'james-oyelaran',
    name: 'Dr. James Oyelaran',
    credentials: 'MD, Psychiatrist',
    pronouns: 'he/him',
    years: 15,
    focus: ['Medication', 'ADHD', 'Mood'],
    languages: ['English', 'Yoruba'],
    formats: ['Video'],
    services: ['psychiatry'],
    bio: 'James treats medication as one tool among several and will tell you plainly when he thinks you do not need it.',
    hue: [357, 32],
    nextAvailable: 4,
  },
  {
    id: 'sofia-marchetti',
    name: 'Sofia Marchetti',
    credentials: 'PhD, Clinical Psychologist',
    pronouns: 'she/her',
    years: 11,
    focus: ['Depression', 'Life transitions', 'Meaning'],
    languages: ['English', 'Italian'],
    formats: ['Video', 'In person', 'Phone'],
    services: ['individual'],
    bio: 'Sofia works with people in the middle of a change they did not choose. Her sessions tend to be quiet, and then suddenly not.',
    hue: [40, 357],
    nextAvailable: 2,
  },
];

export const concerns = [
  'Anxiety',
  'Depression',
  'Stress & burnout',
  'Relationships',
  'Trauma / PTSD',
  'Grief & loss',
  'Self-esteem',
  'Sleep',
  'ADHD',
  'Life transitions',
  'Anger',
  'Not sure yet',
];

export const process = [
  {
    step: '01',
    title: 'Tell us what is going on',
    body: 'A two-minute intake. No forms about your childhood, no phone tag. Just enough to route you well.',
    detail: 'Avg. 1m 50s',
  },
  {
    step: '02',
    title: 'Get matched in a day',
    body: 'A real clinician reads your intake and hand-picks up to three therapists. You choose — or ask for different options.',
    detail: 'Within 24 hours',
  },
  {
    step: '03',
    title: 'Meet, free of charge',
    body: 'A 15-minute intro call to see if the fit is right. If it is not, you switch with one click and no awkward conversation.',
    detail: '15 min, free',
  },
  {
    step: '04',
    title: 'Start, and keep going',
    body: 'Weekly or fortnightly sessions, secure messaging between them, and a plan you can actually see progress against.',
    detail: 'Cancel anytime',
  },
];

export const testimonials = [
  {
    quote:
      'I had bounced off three therapists before this. The matching actually worked — I was with the right person on the first try.',
    name: 'R.K.',
    meta: 'Client, 14 months',
  },
  {
    quote:
      'Booking took ninety seconds at 1am, which is exactly when I finally admitted I needed to.',
    name: 'Dani M.',
    meta: 'Client, 7 months',
  },
  {
    quote:
      'We came in ready to end things and left with a plan. Six months on we are still here, and it is better.',
    name: 'T. & J.',
    meta: 'Couples clients',
  },
  {
    quote:
      'My psychiatrist and my therapist talk to each other. After eight years of care, that was new.',
    name: 'Alina P.',
    meta: 'Client, 2 years',
  },
  {
    quote:
      'No waiting list, no voicemail purgatory. Someone answered and I had a session that week.',
    name: 'Marcus D.',
    meta: 'Client, 5 months',
  },
  {
    quote:
      'My son actually looks forward to Thursdays now. I do not fully understand it and I am not going to question it.',
    name: 'Parent of a 16-year-old',
    meta: 'Teen programme',
  },
];

export const faqs = [
  {
    q: 'How do I get started?',
    a: 'Leave your email in the box near the top of the home page to join our community, or write to us. We will help you work out the right next step.',
  },
  {
    q: 'What if my therapist is not the right fit?',
    a: 'Tell us and we will help you switch. No explanation needed.',
  },
  {
    q: 'Is this confidential?',
    a: 'Yes. What you share stays between you and your care team, and we never sell data. The exceptions are the ones every clinician has by law: a serious risk to you or someone else, or harm to a child.',
  },
  {
    q: 'What if I am in crisis right now?',
    a: 'Please do not wait for an appointment. Call Tele-MANAS on 14416 (free, 24 hours a day) or, if someone is in immediate danger, call 112.',
  },
];

export const plans = [
  {
    id: 'session',
    name: 'Pay per session',
    price: 165,
    cadence: 'per 50-min session',
    blurb: 'No commitment. Book when you need to.',
    features: ['Any available therapist', 'Free 15-min intro call', 'Secure messaging', 'Cancel up to 24h before'],
    cta: 'Book a session',
  },
  {
    id: 'weekly',
    name: 'Weekly care',
    price: 139,
    cadence: 'per session, billed monthly',
    blurb: 'The rhythm most therapy actually works at.',
    features: [
      'Four sessions a month',
      'Priority same-week rebooking',
      'Unlimited secure messaging',
      'Shared progress plan',
      'Pause for up to 8 weeks',
    ],
    cta: 'Start weekly care',
    featured: true,
  },
  {
    id: 'integrated',
    name: 'Therapy + psychiatry',
    price: 219,
    cadence: 'per session, billed monthly',
    blurb: 'One care team, one plan, no repeating yourself.',
    features: [
      'Everything in Weekly care',
      'Psychiatric review & prescribing',
      'Coordinated care notes',
      'Quarterly medication review',
    ],
    cta: 'Talk to us first',
  },
];

// Trust badges in the footer. Empty until the practice enters real ones in the
// admin: a badge the practice cannot back up is worse than no badge.
export const credentials = [];
