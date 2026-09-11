# Lumen — therapy practice website

A single-page marketing site and appointment-booking flow for a (fictional) modern
therapy practice. Light, futuristic, heavy on motion — with a real multi-step booking
flow rather than a decorative form.

> Lumen is a design demonstration. It is not a real practice, nothing on the site is
> medical advice, and the booking flow does not schedule anything — form state never
> leaves the browser.
>
> The security work here is real, but it is all client-side. A production
> deployment needs the server half: authentication, server-side validation,
> rate limiting, an audit log, and a BAA with every processor that touches PHI.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173 (no serverless runtime — see below)
npm run build        # production build into dist/ (also emits dist/_headers)
npm run preview      # serve the production build — CSP only applies here
npm run test         # vitest, watch mode
npm run verify       # lint + tests + build, what CI should run
npm run gen:headers  # regenerate vercel.json + deploy/nginx.conf
```

`npm run dev` serves the front end only. The booking form posts to
`/api/booking`, a serverless function, so to exercise it locally use
`npx vercel dev` instead — or leave the Supabase variables as placeholders and
work in demo mode, where the form short-circuits without a server.

The CSP is injected at **build** time only; the dev server needs an inline
module preamble for Fast Refresh that `script-src 'self'` would forbid. Test
security behaviour against `npm run preview`, not `npm run dev`.

## Deploying to Vercel

The build refuses to run without a backend, so steps 1-3 are not optional.

### 1. Run the migrations, in this order

`database/migrations/` is now self-contained. Paste each file into the Supabase
SQL editor and run it:

| File | What it creates |
|---|---|
| `001_initial_schema.sql` | `profiles`, `articles`, `faq_items` |
| `003_functions.sql` | `is_admin()`, `update_updated_at_column()`, new-user trigger, `promote_to_admin()` |
| `002_rls_policies.sql` | RLS on the base tables (needs `is_admin()`, hence after 003) |
| `004_lumen_cms.sql` | `site_content`, breathing, YouTube, `booking_submissions` |
| `005_hardening.sql` | Constraints, audit columns, prerequisite check |
| `006_booking_api.sql` | Closes the anonymous write path, adds `rate_limits` + `consume_rate_limit()` |

> **If you already have a live Supabase project from the sibling `physco` repo**,
> 001-003 were reconstructed from what the application code references, not
> copied from your database. Diff them against your live schema before running —
> the `IF NOT EXISTS` guards make them safe to re-run, but they will not
> reconcile a column that already exists with a different type.

### 2. Create your admin account

Sign up through Supabase Auth (Dashboard → Authentication → Users → Add user),
then in the SQL editor:

```sql
SELECT promote_to_admin('you@example.com');
```

The login screen signs out any account whose `profiles.role` is not `ADMIN` or
`SUPER_ADMIN`. A user cannot promote themselves — a trigger in `002` blocks
role changes from anyone who is not already an admin.

### 3. Set the environment variables in Vercel

Settings → Environment Variables. Three required, one recommended:

| Variable | Value | Vercel type | In the browser? |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Project URL | **Config** | Yes |
| `VITE_SUPABASE_ANON_KEY` | anon / publishable key | **Config** | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key | **Secret** | No |
| `BOOKING_IP_SALT` | `openssl rand -hex 32` | **Secret** | No |

The `VITE_` prefix decides everything here. Vite inlines any variable carrying
it into the bundle every visitor downloads, which is why Vercel refuses to
store one as type Secret: a value the browser receives is not a secret. The
service_role key must never carry that prefix, and `vite build` fails if it
sees one that looks like a service key.

A Vercel variable saved as Secret cannot later be switched to Config, because
Secrets are write-only. Delete it and re-create it as Config instead.

There is deliberately **no separate `SUPABASE_URL`**. Every project environment
variable reaches the serverless function as `process.env` regardless of prefix,
so `/api/booking` reads `VITE_SUPABASE_URL` directly rather than making you keep
the same URL under two names that can drift apart. A `SUPABASE_URL` is still
honoured if you have one set.

`BOOKING_IP_SALT` is optional. Without it the IP hash falls back to salting with
the service-role key, which is still not reversible, but rotating that key
resets every rate-limit bucket.

### 4. Deploy and verify

Vercel auto-detects Vite (`npm run build` → `dist/`) and picks up `api/` as
serverless functions. `vercel.json` is generated — run `npm run gen:headers`
after any change to `security.config.js`, never edit it by hand.

After the first deploy, check four things:

1. **No CSP violations** in the browser console. The JSON-LD block is pinned by
   hash, so a hand-edited CSP silently blocks your structured data.
2. **Hard-refresh `/blog` and `/admin/login`** — both must render, not 404.
   That is the SPA rewrite working.
3. **Submit the booking form.** A `201` with a `LM-XXXXXXXX` reference means the
   function, the service key and the rate limiter are all wired up. A `503`
   means `SUPABASE_SERVICE_ROLE_KEY` is missing or the migrations have not run.
4. **Edit a field in Site Content**, reload, and confirm it survived — then look
   for it on the public page.

Run `npm run verify` (lint, tests, build) before pushing.

## Architecture notes

### The booking form does not talk to Supabase

`booking_submissions` holds free-text mental-health disclosures from an
unauthenticated form. It used to accept anonymous `INSERT`s directly, which
meant every field bound, every bot check and every rate limit lived in
JavaScript the submitter could edit.

Submissions now go to `POST /api/booking`, which holds the service-role key and
re-runs validation, the honeypot and timing checks, and a Postgres-backed rate
limit (3 per 15 minutes per IP hash) before inserting. Migration `006` drops the
public policy, so this is the only write path. The raw IP is never stored — only
a salted SHA-256, which is enough to bucket a rate limit and useless as an
identifier.

### Demo mode is dev-only

With placeholder credentials the app serves fixture data and accepts a
hard-coded admin login. That branch is gated on `import.meta.env.DEV` and the
build fails before it could ever ship.

### Known gaps before this handles real patients

- **No BAA.** Supabase offers one on paid plans; it is not automatic, and the
  schema already stores what a BAA exists for.
- **The booking flow does not book anything.** It records an enquiry. No
  scheduling, no confirmation email, no calendar hold.
- **Rate limiting is per-IP.** Fine against drive-by spam, not against a
  distributed attempt. Turnstile or hCaptcha in front of the function is the
  next step if that becomes real.
- **Article HTML is sanitised client-side** (`src/lib/sanitizeHtml.js`). That
  plus the CSP is defence in depth, not a reason to trust an author.
- **No error reporting.** Deliberate — see `src/components/ErrorBoundary.jsx`.

## Testing

```bash
npm run test        # watch mode
npm run test:run    # once, for CI
```

`tests/` covers the logic that can lose data rather than the UI around it:

- `contentMerge.test.js` — the CMS merge rule that used to drop any key a
  component had not hard-coded.
- `editorSync.test.js` — the editor sync that decides whether loading an article
  overwrites what is on screen. Getting this wrong either blanks the article or
  resets the caret on every keystroke; both have happened.
- `validate.test.js` — input normalisation and the bot heuristics, shared by the
  browser and `/api/booking`.
- `sanitizeHtml.test.js` — XSS payloads against the article sanitiser (jsdom).

## Stack

| | |
|---|---|
| Build | Vite 8 + React 19 |
| Styling | Tailwind CSS v4 (`@theme` tokens in `src/index.css`) |
| Primitives | shadcn/ui (Radix) for dialog, accordion, select, toggle-group, form controls |
| Motion | CSS transitions driven by one IntersectionObserver (`Reveal` / `Stagger` in `src/components/primitives.jsx`); `motion` is only loaded with the booking dialog |

No image assets: every visual, from icons to portraits, is generated in SVG or CSS,
so there is nothing to optimise and nothing to 404.

## Page structure and the nav

`src/pages/HomePage.jsx` lists the sections in page order, and `ALL_LINKS` in
`src/components/Nav.jsx` lists the nav links in the same order. Keep the two in
sync. The order is: hero, "we heard you", services, how it works + why Lumen,
therapists, breathe, resources (featured videos + latest articles), testimonials,
pricing, FAQ, call to action.

"Resources" only renders when there is at least one featured video or one
published article; it tells the nav (`src/lib/sections.js`) so the link appears
and disappears with it.

### Performance

An earlier version shipped a WebGL hero (three.js), Lenis scroll hijacking, a
preloader, a custom cursor and an animated film-grain overlay. Together that was
roughly 700 kB of JavaScript plus a render loop on every frame, and it is what
made the site feel heavy to scroll. All of it is gone. What remains:

- No JavaScript animation library on the homepage. Reveals are CSS.
- Native `scroll-behavior: smooth` with `scroll-margin-top` on sections.
- One request for the whole `site_content` table, shared by every section
  (`src/lib/queries/siteContent.js`), instead of one per section.
- The booking form and the Cmd-K palette load on first use, not on page load.
- `prefers-reduced-motion: reduce` disables the reveals, the counters and the
  rotating hero word.

Also handled: focus trap and focus restore in the booking dialog, a skip link,
`aria-expanded`/`aria-controls` on the FAQ accordion, `aria-pressed` on every
toggle chip, and visible focus rings throughout.

## Security and privacy

This is a therapy practice, so the threat model is not "someone defaces the
marketing site" — it is "someone learns that a named person is looking for
help with trauma". Three things followed from that.

**Nothing sensitive is persisted.** The intake collects navigational state
(step, format, chosen slot) and health/identity data (presenting concerns,
name, email, phone, free-text notes) in the same object. Only the first kind is
ever written down — see `src/booking/draft.js`, which allow-lists six fields and
drops everything else. What does persist goes to `sessionStorage` (dies with the
tab) with a 2-hour TTL, and the loader re-filters on read so a tampered value
cannot inject extra keys. Writing "Trauma / PTSD" plus a name and phone number
to `localStorage` — durable, readable by any script on the origin, on a device
that is very often shared — is not a trade worth making to save re-picking a
chip. Verified: after a full booking run, storage holds only
`{who, format, cadence, therapist, date, time}`.

**No third-party requests, at all.** Fonts are bundled rather than pulled from
Google Fonts, which would otherwise hand a third party the visitor's IP and
referrer on every page load. There is no analytics, no tag manager, and no
error-reporting SDK — stack traces can carry form values, so `ErrorBoundary`
logs to the console and nowhere else. A page load contacts exactly one origin:
its own.

**A real CSP, generated from one source.** `security.config.js` is the only
place the policy is written; `vite.config.js` injects the meta tag and emits
`dist/_headers`, and `npm run gen:headers` writes `vercel.json` and
`deploy/nginx.conf` from the same object. A policy that drifts between the meta
tag and the real headers is worse than none, because it looks enforced.

- `script-src 'self' 'sha256-…'` — the only inline script is the JSON-LD block,
  pinned by a hash derived from the exact injected string, so the two cannot
  drift. No `unsafe-inline`, no `unsafe-eval`.
- `style-src-elem` allows inline, `style-src-attr` is `'none'`. Split rather
  than blanket-relaxed: `react-remove-scroll-bar` (transitive via Radix Dialog)
  injects a scroll-lock `<style>` whose `padding-right` is computed from the
  visitor's scrollbar width, so there is no stable hash to pin and no server to
  mint a nonce. Style *attributes* stay forbidden — React, Radix and motion all
  go through the CSSOM, which CSP does not govern.
- `frame-ancestors 'none'`, `base-uri 'none'`, `object-src 'none'`, plus HSTS,
  `nosniff`, a restrictive `Permissions-Policy` and COOP/CORP.

Also: honeypot field plus a minimum fill time in `src/booking/validate.js`
(cheap, and unlike a CAPTCHA it does not profile the user), length caps on every
field, control-character stripping, and conservative email/phone validation.
None of it is a security boundary — it all runs client-side — and the module
says so; a real deployment must repeat every check server-side.

## SEO and metadata

`seo.config.js` generates a schema.org `@graph` from `src/data/site.js`, so the
structured data cannot drift from the copy on the page: `MedicalBusiness` +
`Psychologist` with address and opening hours, a `Physician`/`Person` node per
clinician, and a `FAQPage` built from the same array the accordion renders.
Open Graph and Twitter cards are injected at build time, `public/og.png` is a
1200×630 card rendered from the real brand assets, and there is a canonical
link, `robots.txt`, `sitemap.xml` and a web manifest.

## Calendar export

Confirming a booking offers an `.ics` download, built in the browser
(`src/booking/calendar.js`) so nothing about the appointment reaches a calendar
provider unless the person imports it themselves. Proper RFC 5545: CRLF endings,
75-octet line folding, escaped separators, `TZID` rather than naive UTC, and a
one-hour `VALARM`.

## Command palette

Cmd/Ctrl-K opens a searchable palette (shadcn `command`, on cmdk) covering
booking, every service and clinician, section jumps, and — deliberately near the
top — the practice line and the 988 crisis line.

## shadcn/ui

Set up for an existing project rather than via `init` (which scaffolds), with
`components.json` at `tsx: false` so the registry emits `.jsx`. Components live in
`src/components/ui/`; the hand-written design primitives were moved to
`src/components/primitives.jsx` to avoid shadowing that directory.

**Adopted where Radix genuinely beats hand-rolled behaviour:**

| | replaces | what it buys |
|---|---|---|
| `dialog` | booking modal | focus trap, focus restore, scroll lock, Escape, `aria-hidden` on `#root` |
| `accordion` | FAQ | roving focus, Up/Down/Home/End, `aria-expanded`/`aria-controls` |
| `toggle-group` | every chip / card / slot picker | one tab stop per group, arrow-key movement, roving tabindex |
| `select` | insurance field | a styleable listbox; the native `<select>` could not be themed |
| `checkbox` `input` `textarea` `label` | consent + contact fields | consistent focus rings, label association |

Button, Card, Badge and the layout pieces stay hand-written — shadcn versions would
be restyled to look identical, so they would be churn with no gain.

**Three things needed deciding, and are commented where they live:**

- *Token bridge* (`src/index.css`) — shadcn is written against `--background`,
  `--border`, `--ring` etc. Every one of those points back at the Lumen tokens via
  `@theme inline`, so adding a component never introduces a second palette.
- *`spacing={2}` on every ToggleGroup* — the default `spacing={0}` styles items as
  one joined segmented control (`data-[spacing=0]:rounded-none`), which a plain
  `rounded-full` cannot out-specify. These are separate pills, so they opt into
  spaced items rather than fighting the selector.
- *`z-[90]` on SelectContent* — shadcn portals popovers at `z-50`; this app layers
  the booking dialog at `z-[86]`, so a Select inside it rendered *behind* the panel.

Radix restores focus to whatever opened a dialog, but this one is opened from a
dozen places through app state rather than a `DialogTrigger`, so there is nothing
for it to return to. `App.jsx` captures `document.activeElement` during the
originating event and `onCloseAutoFocus` puts it back.

## Theming

Surfaces and text are **semantic** tokens in `src/index.css` — `--color-bg`,
`--color-surface`, `--color-line`, `--color-ink…4` — rather than being named by
lightness, so the palette can be re-polarised in one place. Depth on light comes
from the `--shadow-card / -lift / -float` ramp rather than translucent fills.

Two things do *not* follow from the tokens and have to be decided per polarity:
filled controls invert (a dark pill with a light label, not the reverse), and the
3D scene needs its own grade — additive blending and bloom add light, which is a
no-op on a light ground, so the particles, shell and rings use normal blending with
saturated dark colours and there is no post-processing pass at all.

All rendered text was checked against WCAG AA with a contrast pass over the live
DOM; the muted ink steps are set from that, not by eye.

## Booking flow

`src/booking/` — six steps (concerns → format → therapist → time → details →
review), then a confirmation with a reference code.

- Per-step validation; errors surface in the dialog footer next to the action.
- Draft state is mirrored to `localStorage` so a reload does not lose progress, and
  is cleared on confirmation. A stale saved date is dropped rather than restored.
- `slots.js` generates deterministic availability from an FNV-1a hash of
  `therapist + day`, so the same day always shows the same openings without a
  backend. Dates are keyed from **local** calendar parts — `toISOString()` would
  shift the key a day backwards for anyone east of UTC.
- Service and therapist cards deep-link into the flow with the relevant step
  pre-filled.

## Layout

```
src/
├── sections/    Hero, HeardYou, Services, Approach (+ why), Therapists,
│                Breathing, Resources (videos + articles), Testimonials,
│                Pricing, Faq, CtaBand
├── components/  Nav, Footer, MobileBookBar, CommandPalette, Avatar, Icon,
│   │            primitives.jsx (Button, Reveal, Stagger, SectionHeading, …)
│   └── ui/      shadcn components (owned source, edited in place)
├── booking/     BookingDialog, slot generation, draft.js (what may be
│                persisted), validate.js (normalisation), calendar.js (.ics)
├── lib/         hooks, queries, cn()
└── data/        site.js (defaults), contentSchema.js (every CMS field)

security.config.js   the CSP and headers, single source
seo.config.js        structured data + social meta, generated from site.js
scripts/             gen-headers.js
deploy/              generated nginx snippet
```

All copy, services, therapists, pricing and FAQs live in `src/data/site.js` — edit
that one file to re-skin the practice.
