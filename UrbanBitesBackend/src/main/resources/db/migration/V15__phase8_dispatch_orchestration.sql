ALTER TABLE delivery_agent_profiles
    ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE dispatch_assignments
    ADD COLUMN IF NOT EXISTS retry_after TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS no_agent_retry_until TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS admin_visibility BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE dispatch_assignments
    DROP CONSTRAINT IF EXISTS chk_dispatch_assignment_status;

ALTER TABLE dispatch_assignments
    ADD CONSTRAINT chk_dispatch_assignment_status
    CHECK (status IN (
        'UNASSIGNED',
        'OFFERED',
        'ACCEPTED',
        'PICKED_UP',
        'DELIVERED',
        'REJECTED',
        'TIMED_OUT',
        'REASSIGNED',
        'NO_AGENT_AVAILABLE',
        'CANCELLED'
    ));

ALTER TABLE dispatch_events
    DROP CONSTRAINT IF EXISTS chk_dispatch_event_status;

ALTER TABLE dispatch_events
    ADD CONSTRAINT chk_dispatch_event_status
    CHECK (status IN (
        'UNASSIGNED',
        'OFFERED',
        'ACCEPTED',
        'PICKED_UP',
        'DELIVERED',
        'REJECTED',
        'TIMED_OUT',
        'REASSIGNED',
        'NO_AGENT_AVAILABLE',
        'CANCELLED'
    ));

CREATE INDEX IF NOT EXISTS idx_dispatch_assignment_status_retry
    ON dispatch_assignments(status, retry_after);

CREATE INDEX IF NOT EXISTS idx_dispatch_assignment_status_created
    ON dispatch_assignments(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dispatch_assignment_admin_visibility
    ON dispatch_assignments(status, admin_visibility, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_agent_last_assigned
    ON delivery_agent_profiles(last_assigned_at);

