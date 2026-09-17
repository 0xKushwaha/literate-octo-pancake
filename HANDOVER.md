# zehnspaces website: handover and setup guide

This guide is for the owner of the practice and for any developer she works with. It covers:

1. What the website is made of
2. Taking over the existing site (recommended)
3. Setting everything up from scratch (only if needed)
4. Managing who can use the admin panel
5. Everyday use
6. Keeping it secure
7. Reference: settings, database files, fixes for common problems

No coding is needed for sections 2, 4, 5 and 6. Section 3 needs someone comfortable with a terminal.

---

## 1. What the website is made of

| Piece | What it does | Where it lives |
|---|---|---|
| **Code** | The website itself | GitHub (a private repository) |
| **Hosting** | Puts the website on the internet, rebuilds it on every code change | Vercel |
| **Database** | Articles, videos, site text, community signups, booking requests, admin logins, uploaded pictures | Supabase |
| **Domain** | `zehnspaces.com` | Your domain registrar, pointed at Vercel |
| **Community** | The Discord server that "Join our community" opens | Discord |
| **Email alerts** (optional) | An email to the practice for each new signup or booking | Resend |

Rule of thumb: **the practice should own every one of these accounts**, not the developer. A developer can be invited as a member and removed later.

---

## 2. Taking over the existing site (recommended)

This keeps everything already entered (articles, videos, site text, signups) and involves no downtime.

### 2.1 Create your accounts

Sign up with the practice's email address (ideally a shared one such as `admin@…`, not a personal one):

- GitHub: https://github.com
- Vercel: https://vercel.com (choose the **Pro** plan: the free Hobby plan is for personal, non-commercial sites only)
- Supabase: https://supabase.com (create an **organization** for the practice; the Pro plan adds daily backups and stops the project pausing)

Turn on two-factor login on all three.

### 2.2 The developer transfers each piece

**GitHub (the code)**
- Repository → Settings → General → Danger Zone → **Transfer ownership** → the practice's GitHub account.
- The practice accepts the email invitation.

**Supabase (the database)**
- The developer invites the practice's account to their Supabase organization as a member, or the practice invites the developer to hers. The person transferring must be an **owner** of the current organization and a **member** of the new one.
- Project → Project Settings → General → **Transfer project** → the practice's organization.
- This only works if the project has no GitHub integration or log drains connected. It cannot move the project to another region.
- The web address and keys stay the same, so the website keeps working.

**Vercel (the hosting)**
- The same owner/member rule applies.
- Project → Settings → General → scroll down to **Transfer Project** → the practice's team.
- Deployments, settings, environment variables and the domain move with it. There is no downtime.
- If Vercel asks you to reconnect the Git repository after the GitHub transfer, go to Project → Settings → Git and connect the repository under the practice's GitHub account.

**Domain**
- If the domain was bought in the developer's name, move it to the practice's registrar account. Your registrar's help pages explain how to "push" or "transfer" a domain.

### 2.3 Lock the door behind the developer

Do this after everything has moved:

1. **New database secret key.** Supabase → Project Settings → API Keys → create a new **secret** key. Copy it.
2. **Put it in Vercel.** Vercel → Project → Settings → Environment Variables → edit `SUPABASE_SERVICE_ROLE_KEY` → paste the new key → Save.
3. **Redeploy.** Vercel → Deployments → the newest one → ⋯ → **Redeploy**.
4. **Delete the old key.** Supabase → API Keys → delete the old secret key. If the project still shows the older "legacy" keys, deactivate the service_role one.
5. **Remove the developer.** In GitHub, Vercel and Supabase, remove the developer as a member (or lower them to read-only if they still help you).
6. **Take over admin access.** Follow section 4 to add yourself as an admin, then remove the developer's admin login.
7. **Check the login settings.** Supabase → Authentication:
   - Sign In / Providers: "Allow new users to sign up" must be **off**.
   - URL Configuration: the Site URL is `https://www.zehnspaces.com`, and `https://www.zehnspaces.com/admin/reset-password` is listed under Redirect URLs.
8. **Run the security check.** Run `database/admin/check-security.sql` (see section 6).

The public "publishable" key does not need changing: it is meant to be public, and the database rules are what protect the data.

---

## 3. Setting everything up from scratch

Use this only if the existing Supabase project cannot be transferred. A new database starts **empty**: articles, videos and site text have to be re-entered, and the old community signups exported first (Admin → Community → Export CSV).

### 3.1 Database (Supabase)

1. Supabase → **New project**. Pick a strong database password and save it in a password manager. For a practice in India, choose the **Mumbai** region.
2. Open **SQL Editor** → New query. Paste the whole of `database/migrations/ALL.sql` and click **Run**.
   - It creates everything and ends with a small table that must say **0 rows**.
   - It is safe to run again if anything was interrupted.
3. **Authentication → Sign In / Providers**:
   - turn **off** "Allow new users to sign up";
   - keep Email turned on;
   - turn on leaked-password protection if your plan offers it.
4. **Authentication → URL Configuration**:
   - set the Site URL to `https://www.zehnspaces.com`;
   - under Redirect URLs, add `https://www.zehnspaces.com/admin/reset-password`. Password-reset and invitation emails need this.
5. Create the first admin: follow section 4.1.
6. **Project Settings → API Keys**. Write down three values for the next step:
   - the Project URL (also shown under **Connect**),
   - the **publishable** key (`sb_publishable_…`),
   - a **secret** key (`sb_secret_…`).

### 3.2 Hosting (Vercel)

1. Put the code in the practice's GitHub account (a private repository).
2. Vercel → **Add New → Project** → import that repository. Vercel detects Vite by itself; leave the build settings as they are.
3. Before the first deploy, open **Environment Variables** and add the variables in the table below.
4. Click **Deploy**. A production build refuses to finish if the two public values are missing, which is deliberate.
5. **Settings → Functions → Function Region**: choose the region closest to the Supabase project (Mumbai, `bom1`, for a Mumbai database).
6. **Settings → Domains**:
   - add `www.zehnspaces.com` and `zehnspaces.com`;
   - set the bare domain to redirect to `www`;
   - follow the DNS instructions Vercel shows at your registrar.

| Name | Value | Required? |
|---|---|---|
| `VITE_SUPABASE_URL` | Project URL, e.g. `https://abcd1234.supabase.co` | Yes |
| `VITE_SUPABASE_ANON_KEY` | the **publishable** key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | the **secret** key. Mark it **Sensitive**. Never give it a `VITE_` prefix. | Yes |
| `BOOKING_IP_SALT` | any long random text, e.g. from `openssl rand -hex 32` | Recommended |
| `RESEND_API_KEY` | from resend.com | Only for email alerts |
| `NOTIFY_EMAIL_TO` | where alerts go, e.g. `hello@zehnspaces.com` | Only for email alerts |
| `NOTIFY_EMAIL_FROM` | e.g. `zehnspaces <alerts@zehnspaces.com>` (the domain must be verified in Resend) | Only for email alerts |
| `PUBLIC_SITE_URL` | `https://www.zehnspaces.com` | Optional (this is the default) |
| `ALLOWED_ORIGINS` | extra sites allowed to send the forms, comma separated | Not needed normally |

Anything starting with `VITE_` is built into the public website and is visible to every visitor. That is fine for the URL and the publishable key, and never fine for anything else.

### 3.3 Check it works

Open the live site and check each item:

- [ ] The home page loads, and `/privacy`, `/terms` and `/blog` all open.
- [ ] A made-up address such as `/abc` shows the "page not found" screen.
- [ ] Enter a test email in "Join our community", then find it under Admin → Community and delete it.
- [ ] Sign in at `/admin/login`, change a piece of text in Site content, reload the public page and see the change.
- [ ] Upload a cover picture to a draft article.
- [ ] Run `database/admin/check-security.sql`. Sections 3, 4 and 5 must be empty.

### 3.4 Fill in the content

Admin → Site content:

- **Everywhere → Brand & contact:** name, phone, email.
- **Everywhere → Footer:** the legal links.
- **Home page → Community:** the Discord invite link.
- **Legal pages:** have a lawyer review the privacy policy and terms (they are starting drafts written for India's DPDP Act).
- **Show & hide:** leave "Numbers, insurers and reviews" off until every number and quote is real.

---

## 4. Managing admin access

Admin access has two parts:

1. **A login** (email and password), managed in Supabase → Authentication → Users.
2. **Permission to use the admin panel**, given and taken away with the SQL files in `database/admin/`.

A login on its own gives no access: anyone signing in without permission is turned away at once.

Public sign-up is switched off, so **only someone with access to the Supabase dashboard can create logins**. Keep that dashboard access limited to the practice owner.

### 4.1 Add an admin

1. Create their login: Supabase → **Authentication → Users → Add user → Send invitation**, and enter their email.
   - They get an email with a link to choose their own password. You never see or send a password.
   - If invitation emails don't arrive, use **Create new user** instead: enter a strong temporary password, tick **Auto Confirm User**, and send them the password by phone rather than email.
2. Give them permission: Supabase → **SQL Editor**:
   - paste `database/admin/add-admin.sql`;
   - change the email on the line marked `<<< CHANGE THIS`;
   - click **Run**. The result lists everyone who now has access.
3. They sign in at `https://www.zehnspaces.com/admin/login`.
   - If they were given a temporary password, they change it straight away under **Your account** in the admin menu.

### 4.2 Remove an admin

1. SQL Editor:
   - paste `database/admin/remove-admin.sql`;
   - change the email;
   - click **Run**.
   - Their access stops on their next click, even if the admin panel is still open on their screen.
   - The file refuses to remove the last remaining admin, so you can never lock yourself out.
2. If they should not be able to sign in at all any more, also delete the login: Authentication → Users → their row → **Delete user**.

### 4.3 See who has access

Run `database/admin/check-security.sql`. The first table lists every admin and when they last signed in.

### 4.4 Passwords

- **Change your own password:** Admin panel → **Your account**.
- **Forgot your password:** on the sign-in page, type your email and click **Forgot password?**. The email links to a page where you choose a new one.
- **Reset someone else's password:** Supabase → Authentication → Users → their row → **Send password recovery**.

The emails come from Supabase. Its built-in email sender only allows a few emails an hour; for dependable delivery, connect your own email service under Authentication → Emails → SMTP settings.

### 4.5 "Access denied" when signing in

The password was right, but the permission is missing. Run `database/admin/diagnose-admin.sql`: it says exactly what is wrong. The usual fix is to run `add-admin.sql` for that email.

### 4.6 Good habits

- One login per person. Never share a login.
- Remove people on their last day.
- Admins are signed out automatically after 30 minutes without activity.

---

## 5. Everyday use (Admin panel, `/admin`)

| Section | What it is for |
|---|---|
| Dashboard | Counts at a glance |
| Blog | Write, publish and unpublish articles; upload cover pictures; tick "Show on homepage" |
| YouTube | Add videos by their 11-character YouTube ID (the part after `v=` in the link); choose which appear on the homepage |
| Breathing | The guided breathing exercises |
| FAQs | Questions and answers |
| Community | Everyone who joined via the website; search, remove, export to CSV |
| Bookings | Session requests (only used while booking is switched on) |
| Site Content | Every piece of text on the site, grouped by page, plus **Show & hide** switches for whole sections |
| Your account | Change your password |

Changes to text and content appear on the site straight away; no redeploy needed.

---

## 6. Keeping it secure

**Already built in:**
- the database refuses anything a visitor is not allowed to do;
- forms are rate-limited and protected against bots;
- secret keys never reach the browser;
- strict browser security headers;
- the admin panel is hidden from search engines and signs out when idle.

**Once a month:** run `database/admin/check-security.sql` in the SQL Editor.
- Table 1 (admins) and table 2 (logins) should only list people you know.
- Tables 3, 4 and 5 must be **empty**.
- If 3, 4 or 5 is not empty, run `database/migrations/010_security_lockdown.sql` and check again.

**Always:**
- Two-factor login on GitHub, Vercel, Supabase, Discord and the domain registrar.
- Never paste the secret key into a chat, an email or the website. If it leaks, follow steps 1 to 4 of section 2.3.
- Keep "Allow new users to sign up" switched off in Supabase.
- If a developer changes the database later, their change should come as a new numbered file in `database/migrations/` and be added to `ALL.sql`.

---

## 7. Reference

### Database files

| File | When to run it |
|---|---|
| `database/migrations/ALL.sql` | Once, on a new, empty Supabase project. Contains 001 to 010 in the right order. |
| `database/migrations/0NN_*.sql` | The same steps as separate files, for a developer who needs just one. Note that 003 runs **before** 002. |
| `database/migrations/010_security_lockdown.sql` | If `check-security.sql` ever shows something in tables 3, 4 or 5. Safe to repeat. |
| `database/admin/add-admin.sql` | Give someone admin access (section 4.1) |
| `database/admin/remove-admin.sql` | Take admin access away (section 4.2) |
| `database/admin/check-security.sql` | Monthly check; read-only |
| `database/admin/diagnose-admin.sql` | When a sign-in says "Access denied"; read-only |

### Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| "Join our community" shows an error | `SUPABASE_SERVICE_ROLE_KEY` missing or wrong in Vercel | Set it (section 3.2), then redeploy |
| Community form says "Origin not allowed" | The site is served from an extra domain | Add that domain to `ALLOWED_ORIGINS`, then redeploy |
| Admin login says "Access denied" | The login has no admin permission | Section 4.5 |
| Picture upload fails | The storage bucket is missing | Run `ALL.sql` again (it is safe to repeat) |
| The admin panel says "Admin unavailable" | The two `VITE_` variables are missing | Set them, then redeploy |
| A password link says it expired | Links work once and expire | Ask for a new one (section 4.4) |
| Password or invitation emails never arrive | Supabase's built-in sender is rate-limited | Wait an hour, or set up SMTP (section 4.4) |
| Text changes don't show | Browser cache | Reload the page; check the change was saved in the admin |
| The whole site is down, or the database says "paused" | Free Supabase projects pause when inactive | Supabase → Restore project; move to the Pro plan |

### For developers

```bash
npm install
npm run dev          # local site; with placeholder keys it runs in demo mode (admin@lumen.dev / admin123)
npm run verify       # lint + tests + production build; run before every push
npm run gen:headers  # after editing security.config.js or the route list in seo.config.js
```

- Pushing to `main` deploys to production automatically.
- `vercel.json` and `deploy/nginx.conf` are generated files; do not edit them by hand.
- A new page needs its path added to `APP_ROUTES` in `seo.config.js` (then `npm run gen:headers`), or it will return 404.
- Editable text lives in `src/data/contentSchema.js`: add a field there and it appears in Site content.
