ALTER TABLE dispatch_assignments
    ADD COLUMN IF NOT EXISTS agent_payout_amount NUMERIC(10,2);

UPDATE dispatch_assignments da
SET agent_payout_amount = COALESCE(o.delivery_fee, 0)
FROM orders o
WHERE da.order_id = o.id
  AND da.agent_payout_amount IS NULL;

ALTER TABLE dispatch_assignments
    ALTER COLUMN agent_payout_amount SET DEFAULT 0,
    ALTER COLUMN agent_payout_amount SET NOT NULL;

