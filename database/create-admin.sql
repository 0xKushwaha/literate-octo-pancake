-- ============================================================================
-- create-admin.sql
-- Grants admin access to an existing Supabase Auth user. Safe to re-run.
--
-- BEFORE running this, create the user:
--   Supabase Dashboard -> Authentication -> Users -> Add user -> Create new user
--   - enter the email and the password you want to sign in with
--   - TICK "Auto Confirm User"   (without it, sign-in fails waiting for an
--     email confirmation that a fresh project will not send)
--
-- Then change the email on the line below and run the whole file.
-- ============================================================================

DO $$
DECLARE
    target_email TEXT := 'you@example.com';   -- <<< CHANGE THIS
    target_id    UUID;
    missing      TEXT := '';
BEGIN
    -- ── Check the migrations actually ran ───────────────────────────────────
    IF to_regclass('public.profiles') IS NULL THEN missing := missing || ' 001 (profiles)'; END IF;
    IF to_regproc('public.is_admin')  IS NULL THEN missing := missing || ' 003 (is_admin)'; END IF;

    IF missing <> '' THEN
        RAISE EXCEPTION
            E'Migrations not run yet. Missing:%\n'
            'Run these in the SQL editor first, in this order:\n'
            '  001_initial_schema.sql\n'
            '  003_functions.sql      <- yes, 003 before 002\n'
            '  002_rls_policies.sql\n'
            '  004_lumen_cms.sql\n'
            '  005_hardening.sql\n'
            '  006_booking_api.sql', missing;
    END IF;

    -- ── Find the auth user ──────────────────────────────────────────────────
    SELECT id INTO target_id FROM auth.users WHERE email = lower(trim(target_email));

    IF target_id IS NULL THEN
        RAISE EXCEPTION
            E'No Supabase Auth user with email "%".\n'
            'Create it first: Authentication -> Users -> Add user, '
            'and tick "Auto Confirm User".', target_email;
    END IF;

    -- ── Promote ─────────────────────────────────────────────────────────────
    INSERT INTO public.profiles (id, email, role)
    VALUES (target_id, lower(trim(target_email)), 'ADMIN')
    ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

    RAISE NOTICE '% is now an ADMIN. Sign in at /admin/login.', target_email;
END $$;

-- Confirm it stuck:
SELECT email, role FROM public.profiles WHERE role IN ('ADMIN', 'SUPER_ADMIN');
