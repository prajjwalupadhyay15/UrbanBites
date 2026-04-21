ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS eta_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS eta_updated_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_orders_eta_updated_at
    ON orders(eta_updated_at DESC);

