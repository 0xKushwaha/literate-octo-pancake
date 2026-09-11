-- ============================================================================
-- 006_booking_api.sql
-- Moves booking writes behind /api/booking (a Vercel serverless function).
-- Safe to re-run.
--
-- Before this, any holder of the public anon key could INSERT into
-- booking_submissions directly. That is what a WITH CHECK (TRUE) policy means:
-- every bound, every bot check and every rate limit lived in JavaScript the
-- submitter could edit. After this, the only write path is the serverless
-- function, which holds the service-role key and runs the checks server-side.
-- ============================================================================

-- ── 1. Close the anonymous write path ───────────────────────────────────────
DROP POLICY IF EXISTS booking_insert_public ON booking_submissions;

-- The service-role key bypasses RLS by design, so /api/booking keeps working
-- with no policy of its own. Nothing else can write here now.
REVOKE ALL ON booking_submissions FROM anon;

-- Admins still read and triage through the browser client, under the policies
-- from 004. Re-asserted here so this file can be read on its own.
DROP POLICY IF EXISTS booking_select_admin ON booking_submissions;
CREATE POLICY booking_select_admin ON booking_submissions
    FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS booking_update_admin ON booking_submissions;
CREATE POLICY booking_update_admin ON booking_submissions
    FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

GRANT SELECT, UPDATE ON booking_submissions TO authenticated;

-- ── 2. Rate limiting ────────────────────────────────────────────────────────
-- A fixed window per key. Counting in Postgres rather than in the function's
-- memory is what makes it work at all: serverless instances are created and
-- destroyed per request, so anything held in process memory resets constantly
-- and enforces nothing.

CREATE TABLE IF NOT EXISTS rate_limits (
    key           TEXT PRIMARY KEY,
    hits          INTEGER NOT NULL DEFAULT 0,
    window_start  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies at all: only the service role (which bypasses RLS) may touch it.
REVOKE ALL ON rate_limits FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

/**
 * Counts one hit against p_key and reports whether it is allowed.
 *
 * The whole read-modify-write happens inside one INSERT ... ON CONFLICT, so two
 * requests arriving together cannot both read "2 hits" and both decide they are
 * under a limit of 3. Doing this as SELECT-then-UPDATE from the function would
 * be exactly that race.
 */
CREATE OR REPLACE FUNCTION consume_rate_limit(
    p_key TEXT,
    p_max INTEGER,
    p_window_seconds INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now     TIMESTAMPTZ := NOW();
    v_cutoff  TIMESTAMPTZ := NOW() - make_interval(secs => GREATEST(p_window_seconds, 1));
    v_hits    INTEGER;
    v_start   TIMESTAMPTZ;
BEGIN
    INSERT INTO rate_limits AS rl (key, hits, window_start, updated_at)
    VALUES (p_key, 1, v_now, v_now)
    ON CONFLICT (key) DO UPDATE
        SET hits = CASE WHEN rl.window_start < v_cutoff THEN 1 ELSE rl.hits + 1 END,
            window_start = CASE WHEN rl.window_start < v_cutoff THEN v_now ELSE rl.window_start END,
            updated_at = v_now
    RETURNING hits, window_start INTO v_hits, v_start;

    RETURN json_build_object(
        'allowed', v_hits <= p_max,
        'hits', v_hits,
        'retry_after',
            GREATEST(0, p_window_seconds - FLOOR(EXTRACT(EPOCH FROM (v_now - v_start)))::INTEGER)
    );
END;
$$;

REVOKE ALL ON FUNCTION consume_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;

/**
 * Housekeeping. Rows older than a day are dead weight — call this from a cron
 * job (Supabase Dashboard → Database → Cron) or ignore it; the table stays
 * small either way.
 */
CREATE OR REPLACE FUNCTION prune_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    removed INTEGER;
BEGIN
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 day';
    GET DIAGNOSTICS removed = ROW_COUNT;
    RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION prune_rate_limits() FROM PUBLIC, anon, authenticated;

-- ── 3. The reference is now issued by the server ────────────────────────────
-- It used to be generated in the browser, where a client could pick its own or
-- collide with an existing one. The UNIQUE constraint from 004 already caught
-- collisions; this just records where the value comes from now.
COMMENT ON COLUMN booking_submissions.reference IS
    'LM-XXXXXXXX. Issued by /api/booking from crypto.randomBytes — never client-supplied.';

COMMENT ON COLUMN booking_submissions.ip_hash IS
    'Salted SHA-256 of the submitting IP, written by /api/booking. Never the raw IP.';
