-- Align legacy notification type CHECK constraints with current NotificationType enum.

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
          AND t.relname = 'notifications'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%type%'
    LOOP
        EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END
$$;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (
        type IN (
            'ACCOUNT_REGISTERED',
            'LOGIN_ALERT',
            'ORDER_CONFIRMED',
            'ORDER_ACCEPTED_BY_RESTAURANT',
            'ORDER_PREPARING',
            'ORDER_READY_FOR_PICKUP',
            'ORDER_OUT_FOR_DELIVERY',
            'ORDER_DELIVERED',
            'ORDER_CANCELLED',
            'ORDER_OWNER_ACTION_REQUIRED',
            'PAYMENT_SUCCESS',
            'PAYMENT_FAILURE',
            'REFUND_PROCESSED',
            'DELIVERY_NO_AGENT_AVAILABLE',
            'PARTNER_APPROVAL_APPROVED',
            'PARTNER_APPROVAL_REJECTED',
            'RESTAURANT_APPROVAL_APPROVED',
            'RESTAURANT_APPROVAL_REJECTED',
            'DELIVERY_AGENT_APPROVAL_APPROVED',
            'DELIVERY_AGENT_APPROVAL_REJECTED'
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
          AND t.relname = 'notification_jobs'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%type%'
    LOOP
        EXECUTE format('ALTER TABLE notification_jobs DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END
$$;

ALTER TABLE notification_jobs
    ADD CONSTRAINT notification_jobs_type_check
    CHECK (
        type IN (
            'ACCOUNT_REGISTERED',
            'LOGIN_ALERT',
            'ORDER_CONFIRMED',
            'ORDER_ACCEPTED_BY_RESTAURANT',
            'ORDER_PREPARING',
            'ORDER_READY_FOR_PICKUP',
            'ORDER_OUT_FOR_DELIVERY',
            'ORDER_DELIVERED',
            'ORDER_CANCELLED',
            'ORDER_OWNER_ACTION_REQUIRED',
            'PAYMENT_SUCCESS',
            'PAYMENT_FAILURE',
            'REFUND_PROCESSED',
            'DELIVERY_NO_AGENT_AVAILABLE',
            'PARTNER_APPROVAL_APPROVED',
            'PARTNER_APPROVAL_REJECTED',
            'RESTAURANT_APPROVAL_APPROVED',
            'RESTAURANT_APPROVAL_REJECTED',
            'DELIVERY_AGENT_APPROVAL_APPROVED',
            'DELIVERY_AGENT_APPROVAL_REJECTED'
        )
    );

