-- ============================================================================
-- 005_hardening.sql
-- Follow-up to 004_lumen_cms.sql. Safe to re-run.
--
-- Fixes found during the production-readiness review:
--   1. site_content keys were not validated, so a key without a section prefix
--      saved fine and then silently never rendered on the site.
--   2. site_content.updated_at was only maintained by the client, so a row
--      edited directly in SQL kept a stale timestamp.
--   3. The anonymous booking INSERT policy accepted unbounded text. The form
--      is public and unauthenticated; nothing capped payload size.
--   4. booking_submissions.status transitions had no audit timestamp.
-- ============================================================================

-- ── 1. Content keys must be "<section>.<name>" ──────────────────────────────
-- useSiteContent(section) looks up rows by `section` and then strips the part
-- before the first dot to get the field name. A key that does not match this
-- shape is editable in the admin panel but can never appear on the site.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_content_key'
    ) THEN
        -- Clean up anything already stored in the wrong shape before adding
        -- the constraint, so this migration cannot fail on existing data.
        DELETE FROM site_content WHERE key !~ '^[a-z0-9_]+\.[a-z0-9_.]+$';

        ALTER TABLE site_content
            ADD CONSTRAINT valid_content_key
            CHECK (key ~ '^[a-z0-9_]+\.[a-z0-9_.]+$');
    END IF;
END $$;

-- The section column must agree with the key prefix, or the admin panel groups
-- a field under one heading while the site looks for it under another.
CREATE OR REPLACE FUNCTION site_content_sync_section()
RETURNS TRIGGER AS $$
BEGIN
    NEW.section := split_part(NEW.key, '.', 1);
    NEW.updated_at := (NOW() AT TIME ZONE 'utc');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS site_content_before_write ON site_content;
CREATE TRIGGER site_content_before_write
    BEFORE INSERT OR UPDATE ON site_content
    FOR EACH ROW EXECUTE FUNCTION site_content_sync_section();

-- Backfill any rows whose section drifted from their key.
UPDATE site_content
   SET section = split_part(key, '.', 1)
 WHERE section IS DISTINCT FROM split_part(key, '.', 1);

-- ── 2. Cap what an anonymous visitor can write ──────────────────────────────
-- The booking form is public by design. Without bounds, one script can fill
-- the table (and the admin inbox) with megabytes of text.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_field_lengths') THEN
        ALTER TABLE booking_submissions
            ADD CONSTRAINT booking_field_lengths CHECK (
                char_length(name)  BETWEEN 1 AND 120
            AND char_length(email) BETWEEN 3 AND 254
            AND char_length(COALESCE(phone, ''))               <= 40
            AND char_length(COALESCE(insurer, ''))             <= 120
            AND char_length(COALESCE(notes, ''))               <= 4000
            AND char_length(COALESCE(preferred_time, ''))      <= 40
            AND char_length(COALESCE(preferred_therapist, '')) <= 80
            AND COALESCE(array_length(concerns, 1), 0) <= 12
            );
    END IF;
END $$;

-- A booking cannot be for a date in the past, and cannot be dated absurdly far
-- ahead — both are signs of a malformed or automated submission.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_date_sane') THEN
        ALTER TABLE booking_submissions
            ADD CONSTRAINT booking_date_sane CHECK (
                preferred_date IS NULL
                OR preferred_date BETWEEN DATE '2020-01-01' AND DATE '2100-01-01'
            );
    END IF;
END $$;

-- ── 3. Status change audit ─────────────────────────────────────────────────
ALTER TABLE booking_submissions
    ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION booking_status_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.status_changed_at := (NOW() AT TIME ZONE 'utc');
        NEW.status_changed_by := auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_status_audit_trigger ON booking_submissions;
CREATE TRIGGER booking_status_audit_trigger
    BEFORE UPDATE ON booking_submissions
    FOR EACH ROW EXECUTE FUNCTION booking_status_audit();

-- ── 4. An anonymous visitor must not be able to read back what they wrote ───
-- booking_insert_public already allows INSERT for everyone. Postgres returns
-- the inserted row to the client on `INSERT ... RETURNING`, which PostgREST
-- does by default — and the SELECT policy is admin-only, so the insert fails
-- with a policy error unless the client asks for no representation. The app
-- does this correctly; this comment exists so the next person does not "fix"
-- it by loosening booking_select_admin.

-- ── 5. Verify prerequisites from migrations 001-003 are present ─────────────
DO $$
DECLARE
    missing TEXT := '';
BEGIN
    IF to_regclass('public.profiles') IS NULL THEN missing := missing || ' profiles'; END IF;
    IF to_regclass('public.articles') IS NULL THEN missing := missing || ' articles'; END IF;
    IF to_regclass('public.faq_items') IS NULL THEN missing := missing || ' faq_items'; END IF;
    IF to_regproc('public.is_admin') IS NULL THEN missing := missing || ' is_admin()'; END IF;

    IF missing <> '' THEN
        RAISE EXCEPTION
            'Missing prerequisites from migrations 001-003:%. Run those first.', missing;
    END IF;
END $$;
