CREATE TABLE IF NOT EXISTS carts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    restaurant_id BIGINT NOT NULL,
    state VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_carts_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT chk_carts_state CHECK (state IN ('ACTIVE', 'CHECKED_OUT', 'ABANDONED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_carts_user_active
    ON carts(user_id)
    WHERE state = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_carts_user_state
    ON carts(user_id, state);

CREATE TABLE IF NOT EXISTS cart_items (
    id BIGSERIAL PRIMARY KEY,
    cart_id BIGINT NOT NULL,
    menu_item_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_snapshot NUMERIC(10,2) NOT NULL,
    item_packing_fee_snapshot NUMERIC(10,2) NOT NULL DEFAULT 0,
    notes VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_menu_item FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    CONSTRAINT chk_cart_items_quantity CHECK (quantity > 0),
    CONSTRAINT ux_cart_items_cart_menu_item UNIQUE (cart_id, menu_item_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart
    ON cart_items(cart_id);

CREATE TABLE IF NOT EXISTS pricing_rules (
    id BIGSERIAL PRIMARY KEY,
    version VARCHAR(40) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    base_fee NUMERIC(10,2) NOT NULL,
    slab_km_cutoff NUMERIC(10,2) NOT NULL,
    slab_fee NUMERIC(10,2) NOT NULL,
    per_km_rate NUMERIC(10,2) NOT NULL,
    surge_peak_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1.000,
    surge_rain_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1.000,
    min_delivery_fee NUMERIC(10,2) NOT NULL,
    max_delivery_fee NUMERIC(10,2) NOT NULL,
    free_delivery_threshold NUMERIC(10,2),
    platform_fee_type VARCHAR(20) NOT NULL,
    platform_fee_value NUMERIC(10,2) NOT NULL,
    tax_percent NUMERIC(6,3) NOT NULL,
    packing_policy VARCHAR(20) NOT NULL,
    packing_value NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT chk_pricing_rules_platform_fee_type CHECK (platform_fee_type IN ('FIXED', 'PERCENT')),
    CONSTRAINT chk_pricing_rules_packing_policy CHECK (packing_policy IN ('FIXED', 'PERCENT', 'ITEM_LEVEL'))
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_active
    ON pricing_rules(active);

CREATE TABLE IF NOT EXISTS pricing_rule_audits (
    id BIGSERIAL PRIMARY KEY,
    pricing_rule_id BIGINT,
    action VARCHAR(20) NOT NULL,
    actor_user_id BIGINT,
    before_json TEXT,
    after_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_pricing_rule_audits_rule FOREIGN KEY (pricing_rule_id) REFERENCES pricing_rules(id) ON DELETE SET NULL,
    CONSTRAINT fk_pricing_rule_audits_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pricing_rule_audits_rule
    ON pricing_rule_audits(pricing_rule_id);

INSERT INTO pricing_rules (
    version,
    active,
    base_fee,
    slab_km_cutoff,
    slab_fee,
    per_km_rate,
    surge_peak_multiplier,
    surge_rain_multiplier,
    min_delivery_fee,
    max_delivery_fee,
    free_delivery_threshold,
    platform_fee_type,
    platform_fee_value,
    tax_percent,
    packing_policy,
    packing_value,
    created_at,
    updated_at
)
SELECT
    'v1',
    TRUE,
    20,
    3,
    10,
    8,
    1.200,
    1.100,
    15,
    120,
    299,
    'FIXED',
    5,
    5,
    'ITEM_LEVEL',
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM pricing_rules WHERE active = TRUE);

