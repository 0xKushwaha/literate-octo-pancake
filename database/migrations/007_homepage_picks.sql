-- ============================================================================
-- 007 — "Show on homepage" for articles
-- ============================================================================
-- Videos already have is_featured and exercises have sort_order, so the admin
-- can decide what reaches the homepage cards for those two. Articles had no
-- such flag: the homepage could only ever show the newest posts. This adds the
-- same tick to articles.
--
-- Safe to run more than once. The site works before it is run — the homepage
-- falls back to the newest published articles when this column is missing, and
-- the blog editor saves without the tick and says so.
-- ============================================================================

ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN articles.is_featured IS
    'Ticked in Admin → Blog → editor. Offers the article to the homepage cards; the blog itself lists everything published.';

-- Matches the homepage query: featured + published, newest first.
CREATE INDEX IF NOT EXISTS idx_articles_homepage
    ON articles(published_at DESC)
    WHERE is_featured = TRUE AND is_published = TRUE;
