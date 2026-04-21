ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS refund_reason VARCHAR(255),
    ADD COLUMN IF NOT EXISTS refund_evidence_image_path VARCHAR(255);

