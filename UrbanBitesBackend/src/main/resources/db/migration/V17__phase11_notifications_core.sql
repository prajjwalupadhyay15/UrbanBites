CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    event_key VARCHAR(160) NOT NULL,
    type VARCHAR(60) NOT NULL,
    title VARCHAR(160) NOT NULL,
    message VARCHAR(500) NOT NULL,
    reference_label VARCHAR(160),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_notifications_user_event UNIQUE (user_id, event_key)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
    ON notifications(user_id, read_at, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_jobs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    event_key VARCHAR(160) NOT NULL,
    type VARCHAR(60) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    title_text VARCHAR(160) NOT NULL,
    body_text VARCHAR(500) NOT NULL,
    reference_label VARCHAR(160),
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_notification_jobs_event_channel_recipient UNIQUE (event_key, channel, recipient)
);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_status_retry
    ON notification_jobs(status, next_retry_at);

