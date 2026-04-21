CREATE TABLE IF NOT EXISTS admin_action_audits (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT NOT NULL REFERENCES users(id),
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id BIGINT NOT NULL,
    before_json VARCHAR(1200),
    after_json VARCHAR(1200),
    reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_action_audits_actor_created
    ON admin_action_audits(actor_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_dispute_cases (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    title VARCHAR(160) NOT NULL,
    description VARCHAR(1200) NOT NULL,
    resolution_note VARCHAR(1200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_dispute_cases_status_created
    ON admin_dispute_cases(status, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_coupon_campaigns (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    discount_percent NUMERIC(5,2) NOT NULL,
    max_uses INT,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_coupon_campaigns_active_dates
    ON admin_coupon_campaigns(active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS admin_review_moderation (
    id BIGSERIAL PRIMARY KEY,
    target_review_type VARCHAR(40) NOT NULL,
    target_review_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    moderated_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_review_moderation_target
    ON admin_review_moderation(target_review_type, target_review_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_payout_controls (
    id BIGSERIAL PRIMARY KEY,
    restaurant_id BIGINT NOT NULL UNIQUE REFERENCES restaurants(id),
    payouts_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    reason VARCHAR(255),
    updated_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_payout_controls_blocked
    ON admin_payout_controls(payouts_blocked, updated_at DESC);

