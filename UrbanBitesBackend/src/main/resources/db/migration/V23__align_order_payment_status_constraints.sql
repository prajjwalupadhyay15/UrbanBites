-- Align legacy order/payment status CHECK constraints with current enum values.

DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = current_schema()
          AND t.relname = 'orders'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END
$$;

ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
    CHECK (
        status IN (
            'CREATED',
            'PENDING_PAYMENT',
            'CONFIRMED',
            'ACCEPTED_BY_RESTAURANT',
            'PREPARING',
            'READY_FOR_PICKUP',
            'OUT_FOR_DELIVERY',
            'DELIVERED',
            'CANCELLED'
        )
    );

DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = current_schema()
          AND t.relname = 'payments'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END
$$;

ALTER TABLE payments
    ADD CONSTRAINT payments_status_check
    CHECK (
        status IN (
            'INITIATED',
            'AUTHORIZED',
            'CAPTURED',
            'FAILED',
            'REFUNDED_PARTIAL',
            'REFUNDED_FULL'
        )
    );

