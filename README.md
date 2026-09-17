# zehnspaces

The website of zehnspaces, a therapy practice in India: https://www.zehnspaces.com

**Setting it up, handing it over, or managing admin access? Read [HANDOVER.md](HANDOVER.md).**

## Stack

| | |
|---|---|
| Front end | Vite 8, React 19, Tailwind CSS 4, shadcn/ui (Radix) |
| Server | Vercel serverless functions in `api/` (`booking`, `community`, `csp-report`) |
| Data, logins, files | Supabase (Postgres with row-level security, Auth, Storage) |
| Tests | Vitest (`tests/`) |

## Commands

```bash
npm install
npm run dev          # http://localhost:5173 (front end only; `npx vercel dev` also runs api/)
npm run verify       # lint + tests + production build; run before every push
npm run gen:headers  # regenerate vercel.json and deploy/nginx.conf
```

With placeholder Supabase values in `.env`, `npm run dev` runs in demo mode: in-memory data and the throwaway login `admin@lumen.dev` / `admin123`. Demo mode and its data are compiled out of every production build.

## How it fits together

- **Content** is edited in the admin panel (`/admin`). Every editable field is declared once in `src/data/contentSchema.js`; stored rows in `site_content` override those defaults.
- **Forms never write to the database from the browser.** `api/community.js` and `api/booking.js` hold the secret key, check the origin, validate, rate-limit by salted IP hash and then insert. Shared code is in `api/_lib/`.
- **Row-level security is the boundary** for everything else. The publishable key is public by design; `database/migrations/010_security_lockdown.sql` makes the table and function grants match the policies. `database/admin/check-security.sql` verifies it.
- **Admins** are Supabase Auth users whose `profiles.role` is `ADMIN`. The role is granted and removed only from the SQL editor (`database/admin/`), never through the API.
- **Security headers** come from `security.config.js`. `vercel.json` is generated from it and from `APP_ROUTES` in `seo.config.js`. Only known routes are rewritten to the app; everything else is served `404.html` with a real 404 status.
- **Switches** under Site content → Show & hide turn whole sections on and off without deleting anything (`features.*`, read through `src/lib/features.js`).

## Database changes

Add a new numbered file to `database/migrations/`, make it safe to re-run, and append it to `ALL.sql`. New tables and functions start with no access for `anon`/`authenticated` (010 changes the defaults), so grant exactly what the app needs.

## Environment variables

See the table in HANDOVER.md, section 3.2, and `.env.example`.
