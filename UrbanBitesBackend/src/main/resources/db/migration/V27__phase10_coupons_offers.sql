-- Phase 10: Coupon usage tracking for customer-facing coupon application
CREATE TABLE IF NOT EXISTS coupon_usages (
    id              BIGSERIAL       PRIMARY KEY,
    campaign_id     BIGINT          NOT NULL REFERENCES admin_coupon_campaigns(id),
    user_id         BIGINT          NOT NULL REFERENCES users(id),
    order_id        BIGINT          REFERENCES orders(id),
    status          VARCHAR(20)     NOT NULL DEFAULT 'APPLIED',
    discount_amount NUMERIC(10,2)   NOT NULL DEFAULT 0,
    applied_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    used_at         TIMESTAMPTZ,

    CONSTRAINT uq_coupon_usage_user_order UNIQUE (campaign_id, user_id, order_id)
);

CREATE INDEX idx_coupon_usages_user     ON coupon_usages(user_id);
CREATE INDEX idx_coupon_usages_campaign ON coupon_usages(campaign_id);

-- Add coupon_code column to carts so we can track applied coupon before checkout
ALTER TABLE carts ADD COLUMN IF NOT EXISTS applied_coupon_code VARCHAR(80);
