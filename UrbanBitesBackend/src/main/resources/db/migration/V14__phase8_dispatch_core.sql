CREATE TABLE IF NOT EXISTS delivery_agent_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    verified BOOLEAN NOT NULL DEFAULT TRUE,
    online BOOLEAN NOT NULL DEFAULT FALSE,
    available BOOLEAN NOT NULL DEFAULT FALSE,
    current_load INTEGER NOT NULL DEFAULT 0,
    transport_type VARCHAR(40),
    active_shift BOOLEAN NOT NULL DEFAULT FALSE,
    last_latitude NUMERIC(10,7),
    last_longitude NUMERIC(10,7),
    last_location_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_delivery_agent_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_delivery_agent_current_load CHECK (current_load >= 0)
);

CREATE INDEX IF NOT EXISTS idx_delivery_agent_availability
    ON delivery_agent_profiles(verified, online, available, active_shift, current_load);

CREATE TABLE IF NOT EXISTS dispatch_assignments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    agent_user_id BIGINT,
    status VARCHAR(30) NOT NULL,
    attempt_number INTEGER NOT NULL,
    offer_expires_at TIMESTAMP WITH TIME ZONE,
    decision_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_dispatch_assignment_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_dispatch_assignment_agent FOREIGN KEY (agent_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_dispatch_assignment_status CHECK (status IN ('OFFERED','ACCEPTED','REJECTED','TIMED_OUT','NO_AGENT_AVAILABLE')),
    CONSTRAINT chk_dispatch_attempt_number CHECK (attempt_number > 0)
);

CREATE INDEX IF NOT EXISTS idx_dispatch_assignment_order_created
    ON dispatch_assignments(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dispatch_assignment_agent_status
    ON dispatch_assignments(agent_user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS dispatch_events (
    id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL,
    event_note VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_dispatch_event_assignment FOREIGN KEY (assignment_id) REFERENCES dispatch_assignments(id) ON DELETE CASCADE,
    CONSTRAINT chk_dispatch_event_status CHECK (status IN ('OFFERED','ACCEPTED','REJECTED','TIMED_OUT','NO_AGENT_AVAILABLE'))
);

CREATE INDEX IF NOT EXISTS idx_dispatch_events_assignment_created
    ON dispatch_events(assignment_id, created_at DESC);

