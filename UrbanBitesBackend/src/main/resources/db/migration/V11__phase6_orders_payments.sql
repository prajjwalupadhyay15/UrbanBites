CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    restaurant_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL,
    pricing_rule_version VARCHAR(40) NOT NULL,
    delivery_contact_name VARCHAR(120) NOT NULL,
    delivery_contact_phone VARCHAR(20) NOT NULL,
    delivery_address_line1 VARCHAR(255) NOT NULL,
    delivery_address_line2 VARCHAR(255),
    delivery_city VARCHAR(120) NOT NULL,
    delivery_state VARCHAR(120) NOT NULL,
    delivery_pincode VARCHAR(20) NOT NULL,
    delivery_latitude NUMERIC(10,7),
    delivery_longitude NUMERIC(10,7),
    delivery_distance_km NUMERIC(10,2) NOT NULL,
    total_items INTEGER NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    delivery_fee NUMERIC(10,2) NOT NULL,
    packing_charge NUMERIC(10,2) NOT NULL,
    platform_fee NUMERIC(10,2) NOT NULL,
    tax_total NUMERIC(10,2) NOT NULL,
    discount_total NUMERIC(10,2) NOT NULL,
    grand_total NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE RESTRICT,
    CONSTRAINT chk_orders_status CHECK (status IN (
        'CREATED','PENDING_PAYMENT','CONFIRMED','PREPARING','READY_FOR_PICKUP','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'
    )),
    CONSTRAINT chk_orders_total_items CHECK (total_items > 0)
);

CREATE INDEX IF NOT EXISTS idx_orders_user_created_at
    ON orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
    ON orders(status, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    menu_item_id BIGINT NOT NULL,
    item_name VARCHAR(140) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_snapshot NUMERIC(10,2) NOT NULL,
    line_total NUMERIC(10,2) NOT NULL,
    notes VARCHAR(255),
    is_veg BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT chk_order_items_quantity CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order
    ON order_items(order_id);

CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(8) NOT NULL,
    idempotency_key VARCHAR(80) NOT NULL UNIQUE,
    provider_reference VARCHAR(120),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT chk_payments_status CHECK (status IN (
        'INITIATED','AUTHORIZED','CAPTURED','FAILED','REFUNDED_PARTIAL','REFUNDED_FULL'
    ))
);

CREATE INDEX IF NOT EXISTS idx_payments_status
    ON payments(status, created_at DESC);

