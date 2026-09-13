-- ============================================================================
-- 009 — who asked for the Discord invite
-- ============================================================================
-- The closing band takes an email address and then opens the community invite.
-- This is where those addresses land, so the practice can see how many people
-- joined and write to them if the invite link ever has to change.
--
-- Safe to run more than once.
--
-- The shape follows booking_submissions deliberately: an unauthenticated form
-- writing to the database gets NO anonymous INSERT policy. The only door is
-- /api/community, which holds the service-role key, rate-limits by hashed IP
-- and validates the address. A public INSERT policy would put every one of
-- those checks in code the submitter controls.
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_signups (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       TEXT NOT NULL,
    -- Which page the form was on, so the practice can see what earns a join.
    source      TEXT,
    -- Salted hash, never the address itself — same treatment as bookings.
    ip_hash     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    CONSTRAINT community_email_shape CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
    CONSTRAINT community_email_length CHECK (char_length(email) BETWEEN 3 AND 320),
    CONSTRAINT community_source_length CHECK (source IS NULL OR char_length(source) <= 120)
);

-- One row per person. The API turns the resulting conflict into a success:
-- someone who submits twice wants the invite, not an error message.
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_signups_email
    ON community_signups (lower(email));

-- Matches the admin listing: newest first.
CREATE INDEX IF NOT EXISTS idx_community_signups_created
    ON community_signups (created_at DESC);

ALTER TABLE community_signups ENABLE ROW LEVEL SECURITY;

-- Nothing for anon, in either direction. Writes go through /api/community;
-- reads are an admin's business only — this is a list of email addresses.
REVOKE ALL ON community_signups FROM anon;

DROP POLICY IF EXISTS community_select_admin ON community_signups;
CREATE POLICY community_select_admin ON community_signups
    FOR SELECT TO authenticated
    USING (is_admin());

DROP POLICY IF EXISTS community_delete_admin ON community_signups;
CREATE POLICY community_delete_admin ON community_signups
    FOR DELETE TO authenticated
    USING (is_admin());

GRANT SELECT, DELETE ON community_signups TO authenticated;

COMMENT ON TABLE community_signups IS
    'Email addresses left at the "Join our community" band before being sent to the Discord invite. Written only by /api/community; readable only by admins.';
