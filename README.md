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
npm run dev          # http://localhost:5173
npm run build        # production build into dist/ (also emits dist/_headers)
npm run preview      # serve the production build — CSP only applies here
npm run lint
npm run gen:headers  # regenerate vercel.json + deploy/nginx.conf
```

The CSP is injected at **build** time only; the dev server needs an inline
module preamble for Fast Refresh that `script-src 'self'` would forbid. Test
security behaviour against `npm run preview`, not `npm run dev`.

## Stack

| | |
|---|---|
| Build | Vite 8 + React 19 |
| Styling | Tailwind CSS v4 (`@theme` tokens in `src/index.css`) |
| 3D | three.js + @react-three/fiber, drei |
| Primitives | shadcn/ui (Radix) for dialog, accordion, select, toggle-group, form controls |
| Motion | `motion` (Framer Motion), Lenis for smooth scroll |

No image assets: every visual — icons, portraits, the hero — is generated in SVG,
CSS or GLSL, so there is nothing to optimise and nothing to 404.

## The hero scene

`src/three/` holds a custom-shader scene rather than a loaded model.

- **`Orb.jsx`** — an icosahedron displaced in the vertex shader by layered simplex
  noise (large lobes + a travelling ridge + fine grain). Normals are **recomputed**
  per-vertex by sampling two tangent neighbours and taking their cross product, so
  the lighting follows the deformed surface instead of the original sphere. It is lit
  like a studio product shot — key, fill, restrained iridescent rim, grounded
  underside — and breathes on a 5.5-second cycle, the pace of a guided exhale.
- **`PointShell.jsx`** — a Fibonacci-sphere point cloud running the *same* noise
  field, so it reads as a live scan of the surface rather than unrelated decoration.
  It peels away from the orb as you scroll.
- **`Particles.jsx`** — sparse ink dust on a flattened shell, with differential
  rotation (inner particles orbit faster) and curl-ish drift.
- **`Rings.jsx`** — thin orbital arcs with a comet head chasing around each one.
- **`glsl.js`** — shared simplex noise / fbm / rotation chunks.

### Performance and accessibility

`useQualityTier()` (`src/lib/hooks.js`) picks a tier from pointer type, core count
and `deviceMemory`, which sets mesh subdivision, particle counts, DPR cap and
whether post-processing runs at all:

| tier | orb detail | shell pts | dust |
|---|---|---|---|
| high | 56 | 6 000 | 1 600 |
| medium | 42 | 4 000 | 1 100 |
| low | 28 | 2 000 | 600 |
| static | — | — | — |

`prefers-reduced-motion: reduce` resolves to `static`, which **does not mount WebGL
at all** — `StaticBackdrop.jsx` renders a CSS aurora instead, and Lenis is skipped so
native scrolling is left alone. The whole 3D bundle is behind `React.lazy`, keeping
the initial JS payload at ~134 kB gzipped against ~239 kB for the scene chunk.

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
├── three/       hero scene + shaders
├── sections/    Hero, Trust, Approach, Services, Therapists,
│                Testimonials, Pricing, Faq, CtaBand
├── components/  Nav, Footer, Cursor, Preloader, ScrollProgress,
│   │            MobileBookBar, StaticBackdrop, Avatar, Icon,
│   │            primitives.jsx (Button, Reveal, SplitWords, TiltCard, …)
│   └── ui/      shadcn components (owned source, edited in place)
├── booking/     BookingDialog, slot generation, draft.js (what may be
│                persisted), validate.js (normalisation), calendar.js (.ics)
├── lib/         hooks, Lenis setup, cn()
└── data/        all copy and content in one file

security.config.js   the CSP and headers, single source
seo.config.js        structured data + social meta, generated from site.js
scripts/             gen-headers.js
deploy/              generated nginx snippet
```

All copy, services, therapists, pricing and FAQs live in `src/data/site.js` — edit
that one file to re-skin the practice.
