-- ============================================================================
-- add-admin.sql — give someone access to the admin panel (/admin)
-- Run in Supabase → SQL Editor. Safe to run more than once.
--
-- STEP 1, in the dashboard (not here):
--   Authentication → Users → Add user → Create new user
--     • their email and a strong temporary password
--     • tick "Auto Confirm User"
--   (This works even with public sign-ups switched off, which they should be.)
--
-- STEP 2: put their email on the line below and click Run.
--
-- STEP 3: send them the address (https://www.zehnspaces.com/admin/login) and
-- the temporary password by two different channels, and ask them to change
-- it (Authentication → Users → their row → Send password recovery).
-- ============================================================================

DO $$
DECLARE
    target_email TEXT := 'new.person@example.com';   -- <<< CHANGE THIS
    target_id    UUID;
BEGIN
    IF to_regproc('public.is_admin') IS NULL THEN
        RAISE EXCEPTION 'The database is not set up yet. Run database/migrations/ALL.sql first.';
    END IF;

    SELECT id INTO target_id FROM auth.users WHERE lower(email) = lower(trim(target_email));
    IF target_id IS NULL THEN
        RAISE EXCEPTION 'No login exists for "%". Do step 1 first (Authentication → Users → Add user).', target_email;
    END IF;

    INSERT INTO public.profiles (id, email, role)
    VALUES (target_id, lower(trim(target_email)), 'ADMIN')
    ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

    RAISE NOTICE '% can now sign in at /admin/login.', target_email;
END $$;

-- Everyone who has admin access now:
SELECT p.email, p.role, u.last_sign_in_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
 WHERE p.role IN ('ADMIN', 'SUPER_ADMIN')
 ORDER BY p.email;
