-- ============================================================================
-- diagnose-admin.sql
-- Run in the Supabase SQL editor when /admin/login says
-- "Access denied: this account does not have admin access."
--
-- That message means sign-in SUCCEEDED (your password is right) and the role
-- lookup that follows it did not come back with ADMIN or SUPER_ADMIN.
-- There are four ways that happens. Each query below rules one of them out.
-- Read-only: nothing here changes anything.
-- ============================================================================

-- ── 1. Does the auth user exist, and is it confirmed? ───────────────────────
-- An unconfirmed user cannot sign in at all, so if you got the access-denied
-- message this should already be fine. Included so the picture is complete.
SELECT
    'auth.users' AS checking,
    id,
    email,
    (email_confirmed_at IS NOT NULL) AS confirmed,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- ── 2. Is there a matching profiles row, and what role does it carry? ───────
-- A missing row is the most common cause: add-admin.sql was never run, was
-- run with a different email, or errored and the message was missed.
-- Look for role = 'ADMIN'. 'USER' means the promote step did not happen.
SELECT
    'profiles' AS checking,
    u.email          AS auth_email,
    p.id IS NOT NULL AS profile_exists,
    p.email          AS profile_email,
    p.role,
    CASE
        WHEN p.id IS NULL THEN 'NO PROFILE ROW -> run database/admin/add-admin.sql'
        WHEN p.role IN ('ADMIN','SUPER_ADMIN') THEN 'OK'
        ELSE format('role is %L -> run database/admin/add-admin.sql', p.role)
    END AS verdict
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC
LIMIT 10;

-- ── 3. Is RLS letting the browser read that row back? ───────────────────────
-- The app reads its own role through PostgREST as the `authenticated` role.
-- If the SELECT policy is missing while RLS is on, the read returns zero rows,
-- the client sees an error, and the app reports exactly the same message even
-- though the role in the table is correct.
SELECT
    'rls' AS checking,
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    COALESCE(
        (SELECT string_agg(pol.polname, ', ') FROM pg_policy pol WHERE pol.polrelid = c.oid),
        '(none)'
    ) AS policies,
    CASE
        WHEN c.relrowsecurity
         AND NOT EXISTS (SELECT 1 FROM pg_policy pol WHERE pol.polrelid = c.oid)
        THEN 'RLS ON WITH NO POLICIES -> every read is denied. Re-run 002.'
        ELSE 'OK'
    END AS verdict
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'profiles';

-- ── 4. Do the grants underneath RLS allow it? ──────────────────────────────
-- RLS filters rows. Grants decide whether the role may attempt the SELECT at
-- all. `authenticated` needs SELECT on profiles or nothing else matters.
SELECT
    'grants' AS checking,
    grantee,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND grantee IN ('anon', 'authenticated')
GROUP BY grantee;

-- ── 5. Did 002 and 003 actually finish? ────────────────────────────────────
SELECT
    'objects' AS checking,
    to_regclass('public.profiles')   IS NOT NULL AS has_profiles_table,
    to_regproc('public.is_admin')    IS NOT NULL AS has_is_admin_fn,
    to_regproc('public.promote_to_admin') IS NOT NULL AS has_promote_fn,
    EXISTS (SELECT 1 FROM pg_policy pol
            JOIN pg_class c ON c.oid = pol.polrelid
            WHERE c.relname = 'profiles') AS has_profile_policies;
