-- V20__add_partner_approval_workflow.sql
-- Add approval status tracking for restaurant owners, delivery agents, and restaurants

-- Add approval columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_rejection_reason VARCHAR(500);

-- Add approval columns to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) NOT NULL DEFAULT 'PENDING';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS approval_rejection_reason VARCHAR(500);

-- Change restaurant active default from true to false (pending approval)
-- Note: existing records will keep their current active status via default
ALTER TABLE restaurants ALTER COLUMN is_active SET DEFAULT false;

-- Add approval columns to delivery_agent_profiles table
ALTER TABLE delivery_agent_profiles ADD COLUMN IF NOT EXISTS approval_rejection_reason VARCHAR(500);

-- Create index for pending approval queries
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);
CREATE INDEX IF NOT EXISTS idx_restaurants_approval_status ON restaurants(approval_status);
CREATE INDEX IF NOT EXISTS idx_delivery_agent_profiles_verified ON delivery_agent_profiles(verified);

-- Create index for discovery queries (active + approval)
CREATE INDEX IF NOT EXISTS idx_restaurants_active_approved ON restaurants(is_active, approval_status, is_open_now);

