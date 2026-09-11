-- ============================================================================
-- ALL.sql  —  every migration, in dependency order, in one paste.
--
-- Generated from the individual files. Do not edit this one; edit the source
-- file and regenerate, or the two drift apart.
--
-- HOW TO RUN
--   Supabase Dashboard -> SQL Editor -> New query -> paste all of this -> Run.
--
-- Re-runnable. Every CREATE POLICY and CREATE TRIGGER is preceded by a
-- DROP ... IF EXISTS, every table and index is IF NOT EXISTS, and every
-- function is CREATE OR REPLACE.
--
-- Note the order: 003 runs BEFORE 002. The numbering is historical; the
-- dependency is real, because every policy in 002 calls is_admin() from 003.
-- ============================================================================


-- ############################################################################
-- #  001_initial_schema.sql
-- #  Base tables: profiles, articles, faq_items
-- ############################################################################

-- ============================================================================
-- 001_initial_schema.sql
-- Base tables for the Lumen platform. Run first.
--
-- Reconstructed from the columns, filters and ordering the application code
-- actually uses. If you already have a live Supabase project from the sibling
-- `physco` repo, diff this against it before running — the `IF NOT EXISTS`
-- guards make the file safe to re-run, but they will NOT reconcile a column
-- that exists with a different type.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PROFILES — one row per auth user, carrying the role the admin guard checks
-- ============================================================================
-- Supabase's auth.users is managed by the auth schema and cannot carry app
-- columns, so role lives here and is joined by id.

CREATE TABLE IF NOT EXISTS profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    full_name   TEXT,
    role        TEXT NOT NULL DEFAULT 'USER',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    CONSTRAINT valid_role CHECK (role IN ('USER', 'THERAPIST', 'ADMIN', 'SUPER_ADMIN'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role)
    WHERE role IN ('ADMIN', 'SUPER_ADMIN');

-- ============================================================================
-- ARTICLES — the blog
-- ============================================================================

CREATE TABLE IF NOT EXISTS articles (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title         TEXT NOT NULL,
    slug          TEXT NOT NULL UNIQUE,
    excerpt       TEXT,
    content       TEXT NOT NULL DEFAULT '',
    category      TEXT,
    author_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_published  BOOLEAN NOT NULL DEFAULT FALSE,
    published_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT title_length CHECK (char_length(title) BETWEEN 1 AND 200),
    -- A published article must have a publish date: the public listing orders
    -- by published_at, and a NULL there sorts unpredictably and can vanish.
    CONSTRAINT published_has_date CHECK (is_published = FALSE OR published_at IS NOT NULL)
);

-- Matches the public listing: WHERE is_published ORDER BY published_at DESC
CREATE INDEX IF NOT EXISTS idx_articles_published
    ON articles(published_at DESC) WHERE is_published = TRUE;

CREATE INDEX IF NOT EXISTS idx_articles_category
    ON articles(category, published_at DESC) WHERE is_published = TRUE;

-- Matches the admin listing: ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS idx_articles_updated ON articles(updated_at DESC);

-- ============================================================================
-- FAQ_ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS faq_items (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question      TEXT NOT NULL,
    answer        TEXT NOT NULL,
    category      TEXT,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    is_published  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    CONSTRAINT question_length CHECK (char_length(question) BETWEEN 1 AND 300),
    CONSTRAINT answer_length CHECK (char_length(answer) BETWEEN 1 AND 4000)
);

CREATE INDEX IF NOT EXISTS idx_faq_published
    ON faq_items(sort_order) WHERE is_published = TRUE;


-- ############################################################################
-- #  003_functions.sql
-- #  is_admin(), triggers, promote_to_admin(). Runs 2nd: 002 calls is_admin()
-- ############################################################################

-- ============================================================================
-- 003_functions.sql
-- Shared helpers. Run after 001, BEFORE 002 — the RLS policies in 002 call
-- is_admin(), and 004's triggers call update_updated_at_column().
-- ============================================================================

-- ============================================================================
-- update_updated_at_column — generic BEFORE UPDATE trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := (NOW() AT TIME ZONE 'utc');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_faq_items_updated_at ON faq_items;
CREATE TRIGGER update_faq_items_updated_at
    BEFORE UPDATE ON faq_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- is_admin — the single authority every RLS policy defers to
-- ============================================================================
--
-- SECURITY DEFINER is required: the policies on `profiles` themselves call
-- this function, so an invoker-rights version would recurse into the very
-- policy it is being asked to evaluate and error out.
--
-- search_path is pinned. Without it, a caller who can create objects in a
-- schema earlier on their own search_path could shadow `profiles` with their
-- own table and make this function return TRUE — the classic SECURITY DEFINER
-- privilege-escalation hole.
--
-- STABLE lets Postgres evaluate it once per statement rather than once per
-- row, which matters on the admin list queries.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM public.profiles
         WHERE id = auth.uid()
           AND role IN ('ADMIN', 'SUPER_ADMIN')
    );
$$;

REVOKE ALL ON FUNCTION is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, anon;

-- ============================================================================
-- handle_new_user — keep profiles in step with auth.users
-- ============================================================================
-- Without this, a user who signs up has no profiles row, is_admin() returns
-- FALSE for them forever, and the admin guard bounces them with no way to
-- diagnose it. New users always get the lowest role; promotion is manual.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
        'USER'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Backfill anyone who signed up before this trigger existed.
INSERT INTO public.profiles (id, email, role)
SELECT u.id, u.email, 'USER'
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
 WHERE p.id IS NULL;

-- ============================================================================
-- promote_to_admin — so you never have to hand-edit the profiles table
-- ============================================================================
-- Run once from the SQL editor after creating your account:
--     SELECT promote_to_admin('you@example.com');

CREATE OR REPLACE FUNCTION promote_to_admin(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target UUID;
BEGIN
    SELECT id INTO target FROM auth.users WHERE email = lower(trim(user_email));
    IF target IS NULL THEN
        RETURN format('No auth user with email %s. Sign them up first.', user_email);
    END IF;

    INSERT INTO public.profiles (id, email, role)
    VALUES (target, lower(trim(user_email)), 'ADMIN')
    ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

    RETURN format('%s is now an ADMIN.', user_email);
END;
$$;

-- Deliberately NOT granted to anon or authenticated: this is a SQL-editor
-- tool for the project owner, not an API endpoint.
REVOKE ALL ON FUNCTION promote_to_admin(TEXT) FROM PUBLIC;


-- ############################################################################
-- #  002_rls_policies.sql
-- #  Row-level security on the base tables
-- ############################################################################

-- ============================================================================
-- 002_rls_policies.sql
-- Row-level security for the base tables.
--
-- RUN ORDER: 001 → 003 → 002 → 004 → 005.
-- Every policy here calls is_admin(), which 003 defines. The numbering is
-- historical; the dependency is not.
--
-- The anon key is public — it ships inside the JavaScript bundle every visitor
-- downloads. These policies, not the key, are the security boundary.
-- ============================================================================

ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES
-- ============================================================================

DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
    FOR SELECT USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
    FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_admin_all ON profiles;
CREATE POLICY profiles_admin_all ON profiles
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- A user may edit their own profile, but not their own role — otherwise any
-- signed-up visitor could PATCH themselves to ADMIN through PostgREST and walk
-- into the admin panel. RLS cannot express "this column but not that one", so
-- the rule is enforced as a trigger.
CREATE OR REPLACE FUNCTION guard_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- auth.uid() IS NOT NULL is what makes this a rule about END USERS.
    --
    -- Without that clause the trigger also blocks the SQL editor and the
    -- service-role key, where auth.uid() is NULL — and since promoting the
    -- first admin has to happen from one of those, it blocked the only path
    -- to ever having an admin at all. Every request carrying a user JWT is
    -- still checked, which is the case this exists for.
    --
    -- A signed-out caller cannot reach this anyway: anon holds no grants on
    -- profiles, and profiles_update_own compares id = auth.uid(), which is
    -- NULL and therefore matches no row.
    IF NEW.role IS DISTINCT FROM OLD.role
       AND auth.uid() IS NOT NULL
       AND NOT is_admin()
    THEN
        RAISE EXCEPTION 'Only an administrator can change a profile role.'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_role_trigger ON profiles;
CREATE TRIGGER guard_profile_role_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION guard_profile_role();

-- ============================================================================
-- ARTICLES
-- ============================================================================
-- Drafts must not be readable by anonymous visitors. `is_published = TRUE`
-- inside the policy is what enforces that, not the `.eq('is_published', true)`
-- in the client query — a client filter is a request, not a restriction.

DROP POLICY IF EXISTS articles_select_published ON articles;
CREATE POLICY articles_select_published ON articles
    FOR SELECT USING (is_published = TRUE OR is_admin());

DROP POLICY IF EXISTS articles_admin_write ON articles;
CREATE POLICY articles_admin_write ON articles
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- FAQ_ITEMS
-- ============================================================================

DROP POLICY IF EXISTS faq_select_published ON faq_items;
CREATE POLICY faq_select_published ON faq_items
    FOR SELECT USING (is_published = TRUE OR is_admin());

DROP POLICY IF EXISTS faq_admin_write ON faq_items;
CREATE POLICY faq_admin_write ON faq_items
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- Least privilege at the grant level, underneath RLS
-- ============================================================================
-- RLS filters rows; grants decide whether the role may attempt the verb at all.
-- Anonymous visitors read, and nothing else. Every write in the admin panel
-- runs as `authenticated` and is then filtered by is_admin() above.

REVOKE ALL ON profiles, articles, faq_items FROM anon;
GRANT SELECT ON articles, faq_items TO anon;

GRANT SELECT ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON articles, faq_items TO authenticated;
GRANT UPDATE ON profiles TO authenticated;


-- ############################################################################
-- #  004_lumen_cms.sql
-- #  site_content, breathing_exercises, youtube_resources, booking_submissions
-- ############################################################################

-- ============================================================================
-- 004_lumen_cms.sql
-- Lumen CMS Extension — new tables for physco_2 features
-- Run this against the same Supabase project as physco.
-- Prerequisites: 001_initial_schema.sql, 002_rls_policies.sql, 003_functions.sql
-- ============================================================================

-- ============================================================================
-- 1. SITE_CONTENT — headless CMS key-value store
-- ============================================================================

CREATE TABLE IF NOT EXISTS site_content (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key         TEXT NOT NULL UNIQUE,
    -- dot-notation key, e.g. "hero.tagline", "services.individual.blurb"
    value       TEXT NOT NULL DEFAULT '',
    type        TEXT NOT NULL DEFAULT 'text',
    -- 'text' | 'richtext' | 'image_url'
    section     TEXT,
    -- e.g. 'hero', 'services', 'brand' — for grouping in admin UI
    label       TEXT,
    -- human-readable label shown in the admin editor
    updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_site_content_section ON site_content(section);

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read content
DROP POLICY IF EXISTS site_content_select_public ON site_content;
CREATE POLICY site_content_select_public ON site_content
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS site_content_insert_admin ON site_content;
CREATE POLICY site_content_insert_admin ON site_content
    FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS site_content_update_admin ON site_content;
CREATE POLICY site_content_update_admin ON site_content
    FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS site_content_delete_admin ON site_content;
CREATE POLICY site_content_delete_admin ON site_content
    FOR DELETE USING (is_admin());

-- ============================================================================
-- 2. BREATHING_EXERCISES
-- ============================================================================

CREATE TABLE IF NOT EXISTS breathing_exercises (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    description     TEXT,
    technique       TEXT NOT NULL,
    -- e.g. 'box', '4-7-8', 'triangle'
    inhale_sec      INTEGER NOT NULL CHECK (inhale_sec > 0),
    hold_in_sec     INTEGER NOT NULL DEFAULT 0 CHECK (hold_in_sec >= 0),
    exhale_sec      INTEGER NOT NULL CHECK (exhale_sec > 0),
    hold_out_sec    INTEGER NOT NULL DEFAULT 0 CHECK (hold_out_sec >= 0),
    cycles          INTEGER NOT NULL DEFAULT 4 CHECK (cycles > 0),
    benefits        TEXT[] NOT NULL DEFAULT '{}',
    suitable_for    TEXT[] NOT NULL DEFAULT '{}',
    -- e.g. 'anxiety', 'sleep', 'focus'
    difficulty      TEXT NOT NULL DEFAULT 'beginner',
    -- 'beginner' | 'intermediate' | 'advanced'
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    CONSTRAINT valid_difficulty CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'))
);

CREATE INDEX IF NOT EXISTS idx_breathing_active ON breathing_exercises(sort_order)
    WHERE is_active = TRUE;

ALTER TABLE breathing_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS breathing_select_public ON breathing_exercises;
CREATE POLICY breathing_select_public ON breathing_exercises
    FOR SELECT USING (is_active = TRUE OR is_admin());

DROP POLICY IF EXISTS breathing_admin ON breathing_exercises;
CREATE POLICY breathing_admin ON breathing_exercises
    FOR ALL USING (is_admin());

DROP TRIGGER IF EXISTS update_breathing_exercises_updated_at ON breathing_exercises;
CREATE TRIGGER update_breathing_exercises_updated_at
    BEFORE UPDATE ON breathing_exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. YOUTUBE_RESOURCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS youtube_resources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,
    description     TEXT,
    youtube_id      TEXT NOT NULL,
    -- 11-character YouTube video ID only (not the full URL)
    thumbnail_url   TEXT,
    category        TEXT,
    -- e.g. 'anxiety', 'mindfulness', 'sleep', 'relationships'
    tags            TEXT[] NOT NULL DEFAULT '{}',
    duration_sec    INTEGER,
    curator_note    TEXT,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    added_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    CONSTRAINT valid_youtube_id CHECK (youtube_id ~ '^[A-Za-z0-9_-]{11}$')
);

CREATE INDEX IF NOT EXISTS idx_youtube_active ON youtube_resources(sort_order)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_youtube_featured ON youtube_resources(sort_order)
    WHERE is_featured = TRUE AND is_active = TRUE;

ALTER TABLE youtube_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS youtube_select_public ON youtube_resources;
CREATE POLICY youtube_select_public ON youtube_resources
    FOR SELECT USING (is_active = TRUE OR is_admin());

DROP POLICY IF EXISTS youtube_admin ON youtube_resources;
CREATE POLICY youtube_admin ON youtube_resources
    FOR ALL USING (is_admin());

DROP TRIGGER IF EXISTS update_youtube_resources_updated_at ON youtube_resources;
CREATE TRIGGER update_youtube_resources_updated_at
    BEFORE UPDATE ON youtube_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. BOOKING_SUBMISSIONS — replaces localStorage-only booking form
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_submissions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference           TEXT NOT NULL UNIQUE,
    -- LM-XXXXXXXX reference generated client-side
    concerns            TEXT[] NOT NULL DEFAULT '{}',
    who                 TEXT,
    format              TEXT,
    cadence             TEXT,
    preferred_therapist TEXT,
    preferred_date      DATE,
    preferred_time      TEXT,
    name                TEXT NOT NULL,
    email               TEXT NOT NULL,
    phone               TEXT,
    insurer             TEXT,
    notes               TEXT,
    -- may contain sensitive mental health disclosures
    status              TEXT NOT NULL DEFAULT 'pending',
    ip_hash             TEXT,
    -- SHA-256 hash of client IP, never the raw IP
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    contacted_at        TIMESTAMPTZ,
    CONSTRAINT valid_booking_status CHECK (
        status IN ('pending', 'contacted', 'booked', 'declined')
    ),
    CONSTRAINT valid_email CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

CREATE INDEX IF NOT EXISTS idx_booking_status ON booking_submissions(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_email ON booking_submissions(email);

ALTER TABLE booking_submissions ENABLE ROW LEVEL SECURITY;

-- Anonymous users can INSERT (the booking form has no auth)
DROP POLICY IF EXISTS booking_insert_public ON booking_submissions;
CREATE POLICY booking_insert_public ON booking_submissions
    FOR INSERT WITH CHECK (TRUE);

-- Only admins can read or update submissions
DROP POLICY IF EXISTS booking_select_admin ON booking_submissions;
CREATE POLICY booking_select_admin ON booking_submissions
    FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS booking_update_admin ON booking_submissions;
CREATE POLICY booking_update_admin ON booking_submissions
    FOR UPDATE USING (is_admin());

-- ============================================================================
-- 5. SEED DATA — 3 breathing exercises
-- ============================================================================

INSERT INTO breathing_exercises
    (name, slug, description, technique, inhale_sec, hold_in_sec, exhale_sec, hold_out_sec, cycles, benefits, suitable_for, difficulty, sort_order)
VALUES
    (
        'Box Breathing',
        'box-breathing',
        'Equal-count breathing used by Navy SEALs and first responders to reset the nervous system quickly.',
        'box',
        4, 4, 4, 4, 4,
        ARRAY['Reduces stress', 'Improves focus', 'Calms anxiety'],
        ARRAY['anxiety', 'focus', 'stress'],
        'beginner',
        1
    ),
    (
        '4-7-8 Technique',
        '4-7-8',
        'Developed by Dr. Andrew Weil. The extended exhale activates the parasympathetic nervous system for deep calm.',
        '4-7-8',
        4, 7, 8, 0, 4,
        ARRAY['Promotes sleep', 'Reduces anxiety', 'Lowers heart rate'],
        ARRAY['sleep', 'anxiety', 'relaxation'],
        'beginner',
        2
    ),
    (
        'Triangle Breathing',
        'triangle-breathing',
        'A gentle three-phase pattern ideal for beginners and those with anxiety around breath-holding.',
        'triangle',
        4, 4, 4, 0, 6,
        ARRAY['Gentle on beginners', 'Reduces tension', 'Grounding'],
        ARRAY['anxiety', 'grounding', 'beginners'],
        'beginner',
        3
    )
ON CONFLICT (slug) DO NOTHING;


-- ############################################################################
-- #  005_hardening.sql
-- #  Field constraints, audit columns, prerequisite check
-- ############################################################################

-- ============================================================================
-- 005_hardening.sql
-- Follow-up to 004_lumen_cms.sql. Safe to re-run.
--
-- Fixes found during the production-readiness review:
--   1. site_content keys were not validated, so a key without a section prefix
--      saved fine and then silently never rendered on the site.
--   2. site_content.updated_at was only maintained by the client, so a row
--      edited directly in SQL kept a stale timestamp.
--   3. The anonymous booking INSERT policy accepted unbounded text. The form
--      is public and unauthenticated; nothing capped payload size.
--   4. booking_submissions.status transitions had no audit timestamp.
-- ============================================================================

-- ── 1. Content keys must be "<section>.<name>" ──────────────────────────────
-- useSiteContent(section) looks up rows by `section` and then strips the part
-- before the first dot to get the field name. A key that does not match this
-- shape is editable in the admin panel but can never appear on the site.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_content_key'
    ) THEN
        -- Clean up anything already stored in the wrong shape before adding
        -- the constraint, so this migration cannot fail on existing data.
        DELETE FROM site_content WHERE key !~ '^[a-z0-9_]+\.[a-z0-9_.]+$';

        ALTER TABLE site_content
            ADD CONSTRAINT valid_content_key
            CHECK (key ~ '^[a-z0-9_]+\.[a-z0-9_.]+$');
    END IF;
END $$;

-- The section column must agree with the key prefix, or the admin panel groups
-- a field under one heading while the site looks for it under another.
CREATE OR REPLACE FUNCTION site_content_sync_section()
RETURNS TRIGGER AS $$
BEGIN
    NEW.section := split_part(NEW.key, '.', 1);
    NEW.updated_at := (NOW() AT TIME ZONE 'utc');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS site_content_before_write ON site_content;
CREATE TRIGGER site_content_before_write
    BEFORE INSERT OR UPDATE ON site_content
    FOR EACH ROW EXECUTE FUNCTION site_content_sync_section();

-- Backfill any rows whose section drifted from their key.
UPDATE site_content
   SET section = split_part(key, '.', 1)
 WHERE section IS DISTINCT FROM split_part(key, '.', 1);

-- ── 2. Cap what an anonymous visitor can write ──────────────────────────────
-- The booking form is public by design. Without bounds, one script can fill
-- the table (and the admin inbox) with megabytes of text.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_field_lengths') THEN
        ALTER TABLE booking_submissions
            ADD CONSTRAINT booking_field_lengths CHECK (
                char_length(name)  BETWEEN 1 AND 120
            AND char_length(email) BETWEEN 3 AND 254
            AND char_length(COALESCE(phone, ''))               <= 40
            AND char_length(COALESCE(insurer, ''))             <= 120
            AND char_length(COALESCE(notes, ''))               <= 4000
            AND char_length(COALESCE(preferred_time, ''))      <= 40
            AND char_length(COALESCE(preferred_therapist, '')) <= 80
            AND COALESCE(array_length(concerns, 1), 0) <= 12
            );
    END IF;
END $$;

-- A booking cannot be for a date in the past, and cannot be dated absurdly far
-- ahead — both are signs of a malformed or automated submission.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_date_sane') THEN
        ALTER TABLE booking_submissions
            ADD CONSTRAINT booking_date_sane CHECK (
                preferred_date IS NULL
                OR preferred_date BETWEEN DATE '2020-01-01' AND DATE '2100-01-01'
            );
    END IF;
END $$;

-- ── 3. Status change audit ─────────────────────────────────────────────────
ALTER TABLE booking_submissions
    ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION booking_status_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.status_changed_at := (NOW() AT TIME ZONE 'utc');
        NEW.status_changed_by := auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_status_audit_trigger ON booking_submissions;
CREATE TRIGGER booking_status_audit_trigger
    BEFORE UPDATE ON booking_submissions
    FOR EACH ROW EXECUTE FUNCTION booking_status_audit();

-- ── 4. An anonymous visitor must not be able to read back what they wrote ───
-- booking_insert_public already allows INSERT for everyone. Postgres returns
-- the inserted row to the client on `INSERT ... RETURNING`, which PostgREST
-- does by default — and the SELECT policy is admin-only, so the insert fails
-- with a policy error unless the client asks for no representation. The app
-- does this correctly; this comment exists so the next person does not "fix"
-- it by loosening booking_select_admin.

-- ── 5. Verify prerequisites from migrations 001-003 are present ─────────────
DO $$
DECLARE
    missing TEXT := '';
BEGIN
    IF to_regclass('public.profiles') IS NULL THEN missing := missing || ' profiles'; END IF;
    IF to_regclass('public.articles') IS NULL THEN missing := missing || ' articles'; END IF;
    IF to_regclass('public.faq_items') IS NULL THEN missing := missing || ' faq_items'; END IF;
    IF to_regproc('public.is_admin') IS NULL THEN missing := missing || ' is_admin()'; END IF;

    IF missing <> '' THEN
        RAISE EXCEPTION
            'Missing prerequisites from migrations 001-003:%. Run those first.', missing;
    END IF;
END $$;


-- ############################################################################
-- #  006_booking_api.sql
-- #  Closes the anonymous write path, adds rate limiting
-- ############################################################################

-- ============================================================================
-- 006_booking_api.sql
-- Moves booking writes behind /api/booking (a Vercel serverless function).
-- Safe to re-run.
--
-- Before this, any holder of the public anon key could INSERT into
-- booking_submissions directly. That is what a WITH CHECK (TRUE) policy means:
-- every bound, every bot check and every rate limit lived in JavaScript the
-- submitter could edit. After this, the only write path is the serverless
-- function, which holds the service-role key and runs the checks server-side.
-- ============================================================================

-- ── 1. Close the anonymous write path ───────────────────────────────────────
DROP POLICY IF EXISTS booking_insert_public ON booking_submissions;

-- The service-role key bypasses RLS by design, so /api/booking keeps working
-- with no policy of its own. Nothing else can write here now.
REVOKE ALL ON booking_submissions FROM anon;

-- Admins still read and triage through the browser client, under the policies
-- from 004. Re-asserted here so this file can be read on its own.
DROP POLICY IF EXISTS booking_select_admin ON booking_submissions;
CREATE POLICY booking_select_admin ON booking_submissions
    FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS booking_update_admin ON booking_submissions;
CREATE POLICY booking_update_admin ON booking_submissions
    FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

GRANT SELECT, UPDATE ON booking_submissions TO authenticated;

-- ── 2. Rate limiting ────────────────────────────────────────────────────────
-- A fixed window per key. Counting in Postgres rather than in the function's
-- memory is what makes it work at all: serverless instances are created and
-- destroyed per request, so anything held in process memory resets constantly
-- and enforces nothing.

CREATE TABLE IF NOT EXISTS rate_limits (
    key           TEXT PRIMARY KEY,
    hits          INTEGER NOT NULL DEFAULT 0,
    window_start  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies at all: only the service role (which bypasses RLS) may touch it.
REVOKE ALL ON rate_limits FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

/**
 * Counts one hit against p_key and reports whether it is allowed.
 *
 * The whole read-modify-write happens inside one INSERT ... ON CONFLICT, so two
 * requests arriving together cannot both read "2 hits" and both decide they are
 * under a limit of 3. Doing this as SELECT-then-UPDATE from the function would
 * be exactly that race.
 */
CREATE OR REPLACE FUNCTION consume_rate_limit(
    p_key TEXT,
    p_max INTEGER,
    p_window_seconds INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now     TIMESTAMPTZ := NOW();
    v_cutoff  TIMESTAMPTZ := NOW() - make_interval(secs => GREATEST(p_window_seconds, 1));
    v_hits    INTEGER;
    v_start   TIMESTAMPTZ;
BEGIN
    INSERT INTO rate_limits AS rl (key, hits, window_start, updated_at)
    VALUES (p_key, 1, v_now, v_now)
    ON CONFLICT (key) DO UPDATE
        SET hits = CASE WHEN rl.window_start < v_cutoff THEN 1 ELSE rl.hits + 1 END,
            window_start = CASE WHEN rl.window_start < v_cutoff THEN v_now ELSE rl.window_start END,
            updated_at = v_now
    RETURNING hits, window_start INTO v_hits, v_start;

    RETURN json_build_object(
        'allowed', v_hits <= p_max,
        'hits', v_hits,
        'retry_after',
            GREATEST(0, p_window_seconds - FLOOR(EXTRACT(EPOCH FROM (v_now - v_start)))::INTEGER)
    );
END;
$$;

REVOKE ALL ON FUNCTION consume_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;

/**
 * Housekeeping. Rows older than a day are dead weight — call this from a cron
 * job (Supabase Dashboard → Database → Cron) or ignore it; the table stays
 * small either way.
 */
CREATE OR REPLACE FUNCTION prune_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    removed INTEGER;
BEGIN
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 day';
    GET DIAGNOSTICS removed = ROW_COUNT;
    RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION prune_rate_limits() FROM PUBLIC, anon, authenticated;

-- ── 3. The reference is now issued by the server ────────────────────────────
-- It used to be generated in the browser, where a client could pick its own or
-- collide with an existing one. The UNIQUE constraint from 004 already caught
-- collisions; this just records where the value comes from now.
COMMENT ON COLUMN booking_submissions.reference IS
    'LM-XXXXXXXX. Issued by /api/booking from crypto.randomBytes — never client-supplied.';

COMMENT ON COLUMN booking_submissions.ip_hash IS
    'Salted SHA-256 of the submitting IP, written by /api/booking. Never the raw IP.';

