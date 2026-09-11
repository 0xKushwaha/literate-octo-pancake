-- ============================================================================
-- fix-and-promote.sql
-- Run this once, in the Supabase SQL editor. Safe to re-run.
--
-- Two things, in order:
--   1. Repairs guard_profile_role(). The original version rejected any role
--      change from a caller that is not already an admin — including the SQL
--      editor, where auth.uid() is NULL. Since the first admin can only be
--      made from there, it blocked the only route to having an admin at all.
--   2. Promotes your account.
-- ============================================================================

-- ── 1. The fix ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION guard_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Only applies to requests carrying a user JWT. The SQL editor and the
    -- service-role key have no auth.uid() and are trusted by definition.
    -- A signed-out caller cannot reach this: anon has no grants on profiles,
    -- and profiles_update_own compares id = auth.uid(), which matches no row.
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

-- ── 2. The promotion ────────────────────────────────────────────────────────
-- Change the email if yours is different. Joining through auth.users rather
-- than matching on profiles.email means it works even if that column is blank.
UPDATE public.profiles p
   SET role = 'ADMIN'
  FROM auth.users u
 WHERE u.id = p.id
   AND lower(u.email) = lower('admin@gmail.com');

-- ── 3. Confirm ──────────────────────────────────────────────────────────────
SELECT u.email, p.role,
       CASE WHEN p.role IN ('ADMIN','SUPER_ADMIN')
            THEN 'OK — sign in at /admin/login'
            ELSE 'still not admin — check the email above matches exactly'
       END AS verdict
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id;
