ALTER TABLE admin_coupon_campaigns 
ADD COLUMN current_uses INTEGER NOT NULL DEFAULT 0,
ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

-- Backfill current_uses from coupon_usages
UPDATE admin_coupon_campaigns c
SET current_uses = COALESCE((
    SELECT COUNT(*) 
    FROM coupon_usages u 
    WHERE u.campaign_id = c.id 
      AND u.status = 'USED'
), 0);
