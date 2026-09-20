-- ============================================================================
-- 013 — a focal point for every picture
-- ============================================================================
-- Article covers and infographics both crop to a fixed shape on the public
-- site (16:9 for a cover, 4:3 top-aligned for an infographic) no matter what
-- shape the uploaded file is. That crop was hard-coded — every article cover
-- centred, every infographic pinned to the top — which is right most of the
-- time and wrong exactly when the interesting part of the picture is not
-- there. This gives the admin a point to click instead.
--
-- Stored as a CSS object-position value ("50% 50%", "20% 80%", …) so it can be
-- written straight onto the <img> with no translation layer. The defaults
-- below reproduce today's hard-coded crop exactly, so a picture nobody has
-- touched since renders as one pixel it always has.
--
-- Safe to run more than once, and the site works before it is run: both
-- columns are optional the same way cover_image/cover_alt are (articles.js)
-- and is_featured is (infographics.js) — every read tolerates their absence,
-- and a save that hits a database missing this migration drops just the
-- focal point and says so, rather than losing the whole picture.
-- ============================================================================

ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS cover_focal TEXT NOT NULL DEFAULT '50% 50%';

COMMENT ON COLUMN articles.cover_focal IS
    'CSS object-position for the cover crop ("50% 50%" = centred, today''s default everywhere the column is untouched). Lets an off-centre subject survive the fixed 16:9 crop on the cards and the top of the article.';

ALTER TABLE infographics
    ADD COLUMN IF NOT EXISTS image_focal TEXT NOT NULL DEFAULT '50% 0%';

COMMENT ON COLUMN infographics.image_focal IS
    'CSS object-position for the card crop ("50% 0%" = top-centred, matching the object-top every infographic card used before this column existed, since an infographic's title usually sits at the top of the picture).';
