-- ============================================================================
-- 004_lumen_cms.sql
-- Lumen CMS Extension — new tables for physco_2 features
-- Run this against the same Supabase project as physco.
-- Prerequisites: 001_initial_schema.sql, 002_rls_policies.sql, 003_functions.sql
-- ============================================================================

-- ============================================================================
-- 1. SITE_CONTENT — headless CMS key-value store
-- ============================================================================

CREATE TABLE IF NOT EXISTS site_content (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key         TEXT NOT NULL UNIQUE,
    -- dot-notation key, e.g. "hero.tagline", "services.individual.blurb"
    value       TEXT NOT NULL DEFAULT '',
    type        TEXT NOT NULL DEFAULT 'text',
    -- 'text' | 'richtext' | 'image_url'
    section     TEXT,
    -- e.g. 'hero', 'services', 'brand' — for grouping in admin UI
    label       TEXT,
    -- human-readable label shown in the admin editor
    updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_site_content_section ON site_content(section);

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read content
CREATE POLICY site_content_select_public ON site_content
    FOR SELECT USING (TRUE);

CREATE POLICY site_content_insert_admin ON site_content
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY site_content_update_admin ON site_content
    FOR UPDATE USING (is_admin());

CREATE POLICY site_content_delete_admin ON site_content
    FOR DELETE USING (is_admin());

-- ============================================================================
-- 2. BREATHING_EXERCISES
-- ============================================================================

CREATE TABLE IF NOT EXISTS breathing_exercises (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    description     TEXT,
    technique       TEXT NOT NULL,
    -- e.g. 'box', '4-7-8', 'triangle'
    inhale_sec      INTEGER NOT NULL CHECK (inhale_sec > 0),
    hold_in_sec     INTEGER NOT NULL DEFAULT 0 CHECK (hold_in_sec >= 0),
    exhale_sec      INTEGER NOT NULL CHECK (exhale_sec > 0),
    hold_out_sec    INTEGER NOT NULL DEFAULT 0 CHECK (hold_out_sec >= 0),
    cycles          INTEGER NOT NULL DEFAULT 4 CHECK (cycles > 0),
    benefits        TEXT[] NOT NULL DEFAULT '{}',
    suitable_for    TEXT[] NOT NULL DEFAULT '{}',
    -- e.g. 'anxiety', 'sleep', 'focus'
    difficulty      TEXT NOT NULL DEFAULT 'beginner',
    -- 'beginner' | 'intermediate' | 'advanced'
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    CONSTRAINT valid_difficulty CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'))
);

CREATE INDEX IF NOT EXISTS idx_breathing_active ON breathing_exercises(sort_order)
    WHERE is_active = TRUE;

ALTER TABLE breathing_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY breathing_select_public ON breathing_exercises
    FOR SELECT USING (is_active = TRUE OR is_admin());

CREATE POLICY breathing_admin ON breathing_exercises
    FOR ALL USING (is_admin());

CREATE TRIGGER update_breathing_exercises_updated_at
    BEFORE UPDATE ON breathing_exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. YOUTUBE_RESOURCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS youtube_resources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,
    description     TEXT,
    youtube_id      TEXT NOT NULL,
    -- 11-character YouTube video ID only (not the full URL)
    thumbnail_url   TEXT,
    category        TEXT,
    -- e.g. 'anxiety', 'mindfulness', 'sleep', 'relationships'
    tags            TEXT[] NOT NULL DEFAULT '{}',
    duration_sec    INTEGER,
    curator_note    TEXT,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    added_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    CONSTRAINT valid_youtube_id CHECK (youtube_id ~ '^[A-Za-z0-9_-]{11}$')
);

CREATE INDEX IF NOT EXISTS idx_youtube_active ON youtube_resources(sort_order)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_youtube_featured ON youtube_resources(sort_order)
    WHERE is_featured = TRUE AND is_active = TRUE;

ALTER TABLE youtube_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY youtube_select_public ON youtube_resources
    FOR SELECT USING (is_active = TRUE OR is_admin());

CREATE POLICY youtube_admin ON youtube_resources
    FOR ALL USING (is_admin());

CREATE TRIGGER update_youtube_resources_updated_at
    BEFORE UPDATE ON youtube_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. BOOKING_SUBMISSIONS — replaces localStorage-only booking form
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_submissions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference           TEXT NOT NULL UNIQUE,
    -- LM-XXXXXXXX reference generated client-side
    concerns            TEXT[] NOT NULL DEFAULT '{}',
    who                 TEXT,
    format              TEXT,
    cadence             TEXT,
    preferred_therapist TEXT,
    preferred_date      DATE,
    preferred_time      TEXT,
    name                TEXT NOT NULL,
    email               TEXT NOT NULL,
    phone               TEXT,
    insurer             TEXT,
    notes               TEXT,
    -- may contain sensitive mental health disclosures
    status              TEXT NOT NULL DEFAULT 'pending',
    ip_hash             TEXT,
    -- SHA-256 hash of client IP, never the raw IP
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    contacted_at        TIMESTAMPTZ,
    CONSTRAINT valid_booking_status CHECK (
        status IN ('pending', 'contacted', 'booked', 'declined')
    ),
    CONSTRAINT valid_email CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

CREATE INDEX IF NOT EXISTS idx_booking_status ON booking_submissions(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_email ON booking_submissions(email);

ALTER TABLE booking_submissions ENABLE ROW LEVEL SECURITY;

-- Anonymous users can INSERT (the booking form has no auth)
CREATE POLICY booking_insert_public ON booking_submissions
    FOR INSERT WITH CHECK (TRUE);

-- Only admins can read or update submissions
CREATE POLICY booking_select_admin ON booking_submissions
    FOR SELECT USING (is_admin());

CREATE POLICY booking_update_admin ON booking_submissions
    FOR UPDATE USING (is_admin());

-- ============================================================================
-- 5. SEED DATA — 3 breathing exercises
-- ============================================================================

INSERT INTO breathing_exercises
    (name, slug, description, technique, inhale_sec, hold_in_sec, exhale_sec, hold_out_sec, cycles, benefits, suitable_for, difficulty, sort_order)
VALUES
    (
        'Box Breathing',
        'box-breathing',
        'Equal-count breathing used by Navy SEALs and first responders to reset the nervous system quickly.',
        'box',
        4, 4, 4, 4, 4,
        ARRAY['Reduces stress', 'Improves focus', 'Calms anxiety'],
        ARRAY['anxiety', 'focus', 'stress'],
        'beginner',
        1
    ),
    (
        '4-7-8 Technique',
        '4-7-8',
        'Developed by Dr. Andrew Weil. The extended exhale activates the parasympathetic nervous system for deep calm.',
        '4-7-8',
        4, 7, 8, 0, 4,
        ARRAY['Promotes sleep', 'Reduces anxiety', 'Lowers heart rate'],
        ARRAY['sleep', 'anxiety', 'relaxation'],
        'beginner',
        2
    ),
    (
        'Triangle Breathing',
        'triangle-breathing',
        'A gentle three-phase pattern ideal for beginners and those with anxiety around breath-holding.',
        'triangle',
        4, 4, 4, 0, 6,
        ARRAY['Gentle on beginners', 'Reduces tension', 'Grounding'],
        ARRAY['anxiety', 'grounding', 'beginners'],
        'beginner',
        3
    )
ON CONFLICT (slug) DO NOTHING;
