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
