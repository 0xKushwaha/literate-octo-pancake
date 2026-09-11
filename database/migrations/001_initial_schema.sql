-- ============================================================================
-- 001_initial_schema.sql
-- Base tables for the Lumen platform. Run first.
--
-- Reconstructed from the columns, filters and ordering the application code
-- actually uses. If you already have a live Supabase project from the sibling
-- `physco` repo, diff this against it before running — the `IF NOT EXISTS`
-- guards make the file safe to re-run, but they will NOT reconcile a column
-- that exists with a different type.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PROFILES — one row per auth user, carrying the role the admin guard checks
-- ============================================================================
-- Supabase's auth.users is managed by the auth schema and cannot carry app
-- columns, so role lives here and is joined by id.

CREATE TABLE IF NOT EXISTS profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    full_name   TEXT,
    role        TEXT NOT NULL DEFAULT 'USER',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    CONSTRAINT valid_role CHECK (role IN ('USER', 'THERAPIST', 'ADMIN', 'SUPER_ADMIN'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role)
    WHERE role IN ('ADMIN', 'SUPER_ADMIN');

-- ============================================================================
-- ARTICLES — the blog
-- ============================================================================

CREATE TABLE IF NOT EXISTS articles (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title         TEXT NOT NULL,
    slug          TEXT NOT NULL UNIQUE,
    excerpt       TEXT,
    content       TEXT NOT NULL DEFAULT '',
    category      TEXT,
    author_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_published  BOOLEAN NOT NULL DEFAULT FALSE,
    published_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT title_length CHECK (char_length(title) BETWEEN 1 AND 200),
    -- A published article must have a publish date: the public listing orders
    -- by published_at, and a NULL there sorts unpredictably and can vanish.
    CONSTRAINT published_has_date CHECK (is_published = FALSE OR published_at IS NOT NULL)
);

-- Matches the public listing: WHERE is_published ORDER BY published_at DESC
CREATE INDEX IF NOT EXISTS idx_articles_published
    ON articles(published_at DESC) WHERE is_published = TRUE;

CREATE INDEX IF NOT EXISTS idx_articles_category
    ON articles(category, published_at DESC) WHERE is_published = TRUE;

-- Matches the admin listing: ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS idx_articles_updated ON articles(updated_at DESC);

-- ============================================================================
-- FAQ_ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS faq_items (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question      TEXT NOT NULL,
    answer        TEXT NOT NULL,
    category      TEXT,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    is_published  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    CONSTRAINT question_length CHECK (char_length(question) BETWEEN 1 AND 300),
    CONSTRAINT answer_length CHECK (char_length(answer) BETWEEN 1 AND 4000)
);

CREATE INDEX IF NOT EXISTS idx_faq_published
    ON faq_items(sort_order) WHERE is_published = TRUE;
