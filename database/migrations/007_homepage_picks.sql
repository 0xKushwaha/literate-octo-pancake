-- ============================================================================
-- 007 — "Show on homepage" picks
-- ============================================================================
-- The homepage shows a few articles, a few videos and a few breathing
-- exercises. Videos already had is_featured; articles and exercises did not,
-- so the homepage could only ever take the newest or the first few. This adds
-- the same flag to both, which is what the "Show on homepage" tick in the
-- admin writes.
--
-- Safe to run more than once, and safe to run again if you ran an earlier copy
-- of this file: every statement is IF NOT EXISTS.
--
-- The site works before it is run. Each homepage query falls back (newest
-- articles, first active exercises) and each admin form saves without the tick
-- and says so, rather than failing or losing the choice silently.
-- ============================================================================

ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN articles.is_featured IS
    'Ticked in Admin → Blog → editor. Offers the article to the homepage cards; the blog itself lists everything published.';

CREATE INDEX IF NOT EXISTS idx_articles_homepage
    ON articles(published_at DESC)
    WHERE is_featured = TRUE AND is_published = TRUE;

ALTER TABLE breathing_exercises
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN breathing_exercises.is_featured IS
    'Ticked in Admin → Breathing. Offers the exercise to the homepage band; /breathe lists every active one.';

CREATE INDEX IF NOT EXISTS idx_breathing_homepage
    ON breathing_exercises(sort_order)
    WHERE is_featured = TRUE AND is_active = TRUE;
