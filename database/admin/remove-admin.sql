-- ============================================================================
-- remove-admin.sql — take away someone's admin access
-- Run in Supabase → SQL Editor.
--
-- Access stops on their very next click: every admin action is checked
-- against the database, so an open admin tab stops working at once.
--
-- To remove the person completely (they can no longer sign in at all), also
-- delete them in Authentication → Users → their row → Delete user.
-- ============================================================================

DO $$
DECLARE
    target_email TEXT := 'former.person@example.com';   -- <<< CHANGE THIS
    target_id    UUID;
    remaining    INTEGER;
BEGIN
    SELECT id INTO target_id FROM auth.users WHERE lower(email) = lower(trim(target_email));
    IF target_id IS NULL THEN
        RAISE EXCEPTION 'No login exists for "%". Check the spelling.', target_email;
    END IF;

    SELECT count(*) INTO remaining
      FROM public.profiles
     WHERE role IN ('ADMIN', 'SUPER_ADMIN') AND id <> target_id;
    IF remaining = 0 THEN
        RAISE EXCEPTION 'That is the last admin. Add another admin first (add-admin.sql), or nobody will be able to manage the site.';
    END IF;

    UPDATE public.profiles SET role = 'USER' WHERE id = target_id;

    RAISE NOTICE '% no longer has admin access.', target_email;
END $$;

-- Everyone who still has admin access:
SELECT p.email, p.role, u.last_sign_in_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
 WHERE p.role IN ('ADMIN', 'SUPER_ADMIN')
 ORDER BY p.email;
