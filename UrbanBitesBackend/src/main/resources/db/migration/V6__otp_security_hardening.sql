ALTER TABLE otp_verifications
    ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_otp_verifications_lock
    ON otp_verifications(email, phone, purpose, used, created_at DESC);

