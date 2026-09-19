-- ============================================================================
-- 011 — Infographics
-- ============================================================================
-- A third kind of resource alongside videos and articles: one picture and the
-- words that go with it. Same shape as youtube_resources on purpose (title,
-- description, category, sort_order, is_active), because the admin screen, the
-- card grid and the ordering all behave the same way and there was no reason
-- to invent a second vocabulary.
--
-- The image lives in the same public `media` bucket that migration 008 created
-- for article covers, so this migration adds no storage of its own. If 008 has
-- not been run, uploading will fail with "bucket not found" and the admin says
-- so; pasting is not offered, for the same reason it was removed from articles.
--
-- Safe to run more than once. The site works before it is run: every query
-- catches "relation does not exist" and returns nothing, so the Resources page
-- simply shows no infographics section rather than failing to render.
-- ============================================================================

CREATE TABLE IF NOT EXISTS infographics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,
    description     TEXT,
    image_url       TEXT NOT NULL,
    image_alt       TEXT,
    category        TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

COMMENT ON TABLE infographics IS
    'Picture-plus-text resources shown on /resources. Managed in Admin -> Infographics.';
COMMENT ON COLUMN infographics.image_alt IS
    'Read aloud by screen readers. An infographic carries its meaning in the picture, so this matters more here than on a decorative image.';

CREATE INDEX IF NOT EXISTS idx_infographics_active ON infographics(sort_order)
    WHERE is_active = TRUE;

ALTER TABLE infographics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS infographics_select_public ON infographics;
CREATE POLICY infographics_select_public ON infographics
    FOR SELECT USING (is_active = TRUE OR is_admin());

DROP POLICY IF EXISTS infographics_admin ON infographics;
CREATE POLICY infographics_admin ON infographics
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS update_infographics_updated_at ON infographics;
CREATE TRIGGER update_infographics_updated_at
    BEFORE UPDATE ON infographics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grants to match the policies. Migration 010 closed the default privileges
-- for new tables, so a table created after it gets nothing unless it is named
-- here. Without these two lines the policies above are never even consulted.
GRANT SELECT ON public.infographics TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.infographics TO authenticated;
