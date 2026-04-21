ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS provider_order_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_webhook_event_id VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_order_id
    ON payments (provider_order_id)
    WHERE provider_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_payment_id
    ON payments (provider_payment_id)
    WHERE provider_payment_id IS NOT NULL;

