-- Phase 12: Restaurant reviews with delivered-order gating
CREATE TABLE IF NOT EXISTS restaurant_reviews (
    id              BIGSERIAL       PRIMARY KEY,
    order_id        BIGINT          NOT NULL REFERENCES orders(id),
    user_id         BIGINT          NOT NULL REFERENCES users(id),
    restaurant_id   BIGINT          NOT NULL REFERENCES restaurants(id),
    rating          INT             NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment         VARCHAR(1000),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_review_per_order UNIQUE (order_id, user_id)
);

CREATE INDEX idx_reviews_restaurant ON restaurant_reviews(restaurant_id);
CREATE INDEX idx_reviews_user       ON restaurant_reviews(user_id);
