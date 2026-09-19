-- ============================================================================
-- 012 — Audio testimonials
-- ============================================================================
-- A recorded voice alongside the written quote. No new table: a testimonial is
-- already a row in `testimonials.items` in site_content, and splitting the
-- written ones from the spoken ones across two stores would mean two screens
-- to edit one list.
--
-- All this migration does is let the existing `media` bucket accept audio.
-- Same bucket, same public-read / admin-write policies from 008, so there is
-- no second set of rules to keep in step.
--
-- BEFORE YOU USE THIS, read the note in the admin: a recording of a client's
-- voice is identifiable personal data in a way a typed quote is not. Written
-- consent naming the website specifically, and a way to withdraw it.
--
-- Safe to run more than once.
-- ============================================================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
        'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
        -- mp3, m4a/aac, wav, ogg, webm. Between them these cover what every
        -- phone and every browser records and plays.
        'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
        'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm'
    ],
    -- Raised from 10 MB: a two-minute clip off a phone is comfortably under
    -- this, and the admin refuses anything larger before it reaches the API.
    file_size_limit = 20971520
WHERE id = 'media';

-- If 008 was never run there is no bucket to update, and the UPDATE above
-- quietly matches nothing. Say so rather than leaving someone to find out
-- when an upload fails.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'media') THEN
        RAISE NOTICE 'No media bucket found — run 008_article_images.sql first, then this file again.';
    END IF;
END $$;
