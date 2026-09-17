-- ============================================================================
-- 010_security_lockdown.sql
-- Run in Supabase → SQL Editor. Safe to run more than once.
--
-- Found in the 2026-09-17 security review, against the live project:
--
--   1. promote_to_admin() could be called by ANYONE through the public API
--      (POST /rest/v1/rpc/promote_to_admin with the anon key). Migration 003
--      revoked it from PUBLIC, but Supabase grants EXECUTE on every new
--      function in `public` to anon and authenticated directly, and a REVOKE
--      FROM PUBLIC does not touch those grants. With open sign-ups this was a
--      full takeover: sign up, promote yourself, read every booking.
--
--   2. The same default grant applies to every other helper function, and to
--      every function anyone adds in future.
--
--   3. Tables carried Supabase's default "ALL privileges" for anon and
--      authenticated. Row-level security stopped every write, but it was the
--      only thing stopping them. Grants now say the same thing as the
--      policies, so one mistaken policy is no longer enough.
--
--   4. A signed-in non-admin could UPDATE their own profile row through the
--      API. Nothing in the app needs that, and profiles is where the role
--      lives.
--
--   5. Trigger functions had no pinned search_path (Supabase's linter flags
--      this as function_search_path_mutable).
--
--   6. Anyone could list every file in the media bucket. Public files still
--      load by URL; only listing is now admin-only.
-- ============================================================================

BEGIN;

-- ── 1 + 2. Functions: nobody outside the server may call helpers ────────────

-- Every existing function in public: take EXECUTE away from the API roles.
DO $$
DECLARE
    fn record;
BEGIN
    FOR fn IN
        SELECT p.oid::regprocedure AS sig
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.prokind = 'f'
           -- Leave extension functions alone (uuid_generate_v4 runs as a
           -- column default under the caller's role).
           AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    END LOOP;
END $$;

-- is_admin() is the one function RLS policies call as the visitor's own role,
-- so both API roles need it back. It only ever answers about the caller.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Future functions start closed. Whoever runs this (normally `postgres`) is the
-- role whose defaults change, which is the role the SQL editor creates with.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- ── 5. Pin search_path on the trigger helpers ───────────────────────────────
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
DO $$
BEGIN
    IF to_regprocedure('public.site_content_sync_section()') IS NOT NULL THEN
        ALTER FUNCTION public.site_content_sync_section() SET search_path = public, pg_temp;
    END IF;
    IF to_regprocedure('public.booking_status_audit()') IS NOT NULL THEN
        ALTER FUNCTION public.booking_status_audit() SET search_path = public, pg_temp;
    END IF;
END $$;

-- ── 3. Table grants that match the policies ─────────────────────────────────

-- Start from nothing for the two API roles on every app table …
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'profiles', 'articles', 'faq_items', 'site_content', 'breathing_exercises',
        'youtube_resources', 'booking_submissions', 'rate_limits', 'community_signups'
    ]
    LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
            -- RLS on, always. Harmless where it already was.
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        END IF;
    END LOOP;
END $$;

-- … then give back exactly what the site and the admin panel use.

-- Public content: visitors read (RLS still hides drafts and inactive rows).
GRANT SELECT ON public.articles, public.faq_items, public.site_content,
                public.breathing_exercises, public.youtube_resources
    TO anon, authenticated;

-- Admin panel writes (RLS: is_admin() only).
GRANT INSERT, UPDATE, DELETE ON public.articles, public.faq_items, public.site_content,
                                public.breathing_exercises, public.youtube_resources
    TO authenticated;

-- Profiles: a signed-in user may read their own row (the admin guard does
-- exactly this). Nobody changes a profile through the API; roles are changed
-- in the SQL editor.
GRANT SELECT ON public.profiles TO authenticated;

-- Bookings: admins read and move the status along. Inserts come only from
-- /api/booking with the service-role key.
DO $$
BEGIN
    IF to_regclass('public.booking_submissions') IS NOT NULL THEN
        GRANT SELECT, UPDATE ON public.booking_submissions TO authenticated;
    END IF;
    IF to_regclass('public.community_signups') IS NOT NULL THEN
        GRANT SELECT, DELETE ON public.community_signups TO authenticated;
    END IF;
END $$;

-- rate_limits: service role only. Nothing granted.

-- Sequences (none are used today, uuid keys everywhere) stay closed too.
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Future tables start closed as well; grant explicitly when adding one.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;

-- ── Policies: explicit WITH CHECK everywhere an admin writes ────────────────
-- A FOR ALL / FOR UPDATE policy with no WITH CHECK reuses USING, which is the
-- same thing today. Spelling it out means nobody "simplifies" it later.

DROP POLICY IF EXISTS breathing_admin ON public.breathing_exercises;
CREATE POLICY breathing_admin ON public.breathing_exercises
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS youtube_admin ON public.youtube_resources;
CREATE POLICY youtube_admin ON public.youtube_resources
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS site_content_update_admin ON public.site_content;
CREATE POLICY site_content_update_admin ON public.site_content
    FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ── 4. Profiles: no self-service updates ────────────────────────────────────
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
-- profiles_admin_all stays for reads by admins; UPDATE is no longer granted to
-- the API role at all, so it cannot be used to change a role either.

-- ── 6. Media bucket: files load by URL, listing is admin-only ───────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'media') THEN
        DROP POLICY IF EXISTS "media is publicly readable" ON storage.objects;
        DROP POLICY IF EXISTS "admins can list media" ON storage.objects;
        CREATE POLICY "admins can list media"
            ON storage.objects FOR SELECT
            TO authenticated
            USING (bucket_id = 'media' AND public.is_admin());

        -- Pictures only, 10 MB. SVG stays out: it can carry script.
        UPDATE storage.buckets
           SET public = TRUE,
               file_size_limit = 10485760,
               allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
         WHERE id = 'media';
    END IF;
END $$;

COMMIT;

-- ── Check: this should return no rows ───────────────────────────────────────
-- Any function listed here can still be called by a visitor through the API.
SELECT p.oid::regprocedure AS callable_by_visitors
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.prokind = 'f'
   AND p.proname <> 'is_admin'
   AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
   AND (has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE'));
