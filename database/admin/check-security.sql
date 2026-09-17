-- ============================================================================
-- check-security.sql — a read-only health check. Changes nothing.
-- Run in Supabase → SQL Editor any time, and at least once a month.
-- ============================================================================

-- 1. Who can use the admin panel. Every row should be someone you know.
SELECT 'admins' AS check, p.email, p.role, u.created_at, u.last_sign_in_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
 WHERE p.role IN ('ADMIN', 'SUPER_ADMIN')
 ORDER BY u.last_sign_in_at DESC NULLS LAST;

-- 2. Every login that exists. With sign-ups switched off, this list should
--    only ever grow when you add someone yourself.
SELECT 'all logins' AS check, email, created_at, last_sign_in_at
  FROM auth.users
 ORDER BY created_at DESC;

-- 3. Database functions a website visitor could call. Should be EMPTY.
--    If anything appears, run database/migrations/010_security_lockdown.sql.
SELECT 'callable by visitors' AS check, p.oid::regprocedure AS function
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.prokind = 'f'
   AND p.proname <> 'is_admin'
   AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
   AND (has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE'));

-- 4. Tables without row-level security. Should be EMPTY.
SELECT 'no row security' AS check, c.relname AS table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

-- 5. Tables a signed-out visitor can write to. Should be EMPTY.
SELECT 'visitor can write' AS check, table_name, privilege_type
  FROM information_schema.role_table_grants
 WHERE table_schema = 'public'
   AND grantee IN ('anon', 'PUBLIC')
   AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
