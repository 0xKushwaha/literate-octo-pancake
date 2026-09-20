-- ============================================================================
-- 008 — pictures in the blog
-- ============================================================================
-- Two things, both asked for together: a cover image on every article, and a
-- place to put an uploaded file so the practice is not forced to find a URL
-- for every picture it wants to publish.
--
-- Safe to run more than once: every statement is IF NOT EXISTS or guarded.
--
-- The site works before it is run, the same way 007 does. Every article query
-- asks for the cover columns and retries without them if they are not there,
-- and the editor saves without them and says so in a toast rather than losing
-- the picture silently. Uploading is the one thing that genuinely needs this
-- file — until it is run, the editor's "paste a link" box still works.
-- ============================================================================

-- ── 1. the cover image ──────────────────────────────────────────────────────

ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS cover_image TEXT;

ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS cover_alt TEXT;

COMMENT ON COLUMN articles.cover_image IS
    'Full URL of the article''s cover picture — uploaded to the media bucket, or any https link pasted in the editor. Shown on the blog cards, the homepage cards and the top of the article.';

COMMENT ON COLUMN articles.cover_alt IS
    'What the cover shows, for screen readers and for when the image fails to load. Left empty, the picture is treated as decoration.';

-- ── 2. somewhere to put uploaded pictures ───────────────────────────────────
-- Public-read, admin-write. Public read is the point: these are pictures on a
-- public marketing site, and a signed URL for each one would expire and break
-- every published article.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'media',
    'media',
    TRUE,
    10485760,  -- 10 MB; a cover photo has no business being larger
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
-- On a re-run only `public` is reasserted. Resetting the size limit and the
-- mime list here used to undo 012 (audio) whenever this file was run again,
-- which silently broke testimonial clip uploads.
ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public;

-- Policies cannot be written IF NOT EXISTS, so they are dropped first. That is
-- what makes this file safe to re-run.
DROP POLICY IF EXISTS "media is publicly readable" ON storage.objects;
CREATE POLICY "media is publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'media');

DROP POLICY IF EXISTS "admins can upload media" ON storage.objects;
CREATE POLICY "admins can upload media"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'media' AND is_admin());

DROP POLICY IF EXISTS "admins can replace media" ON storage.objects;
CREATE POLICY "admins can replace media"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'media' AND is_admin())
    WITH CHECK (bucket_id = 'media' AND is_admin());

DROP POLICY IF EXISTS "admins can delete media" ON storage.objects;
CREATE POLICY "admins can delete media"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'media' AND is_admin());
