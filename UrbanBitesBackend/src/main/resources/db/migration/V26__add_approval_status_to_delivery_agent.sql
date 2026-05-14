-- V26__add_approval_status_to_delivery_agent.sql
-- Add missing approval_status column to delivery_agent_profiles table

ALTER TABLE delivery_agent_profiles ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) NOT NULL DEFAULT 'PENDING';
