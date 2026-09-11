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
