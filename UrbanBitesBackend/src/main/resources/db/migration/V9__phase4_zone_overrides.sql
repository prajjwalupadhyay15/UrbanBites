CREATE TABLE IF NOT EXISTS service_zones (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    min_latitude NUMERIC(10,7) NOT NULL,
    max_latitude NUMERIC(10,7) NOT NULL,
    min_longitude NUMERIC(10,7) NOT NULL,
    max_longitude NUMERIC(10,7) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT chk_service_zones_lat_bounds CHECK (min_latitude <= max_latitude),
    CONSTRAINT chk_service_zones_lon_bounds CHECK (min_longitude <= max_longitude)
);

CREATE INDEX IF NOT EXISTS idx_service_zones_active ON service_zones(is_active);

CREATE TABLE IF NOT EXISTS restaurant_service_zones (
    id BIGSERIAL PRIMARY KEY,
    restaurant_id BIGINT NOT NULL,
    service_zone_id BIGINT NOT NULL,
    rule_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_restaurant_service_zones_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_restaurant_service_zones_zone FOREIGN KEY (service_zone_id) REFERENCES service_zones(id) ON DELETE CASCADE,
    CONSTRAINT ux_restaurant_zone UNIQUE (restaurant_id, service_zone_id),
    CONSTRAINT chk_restaurant_zone_rule CHECK (rule_type IN ('INCLUDE','EXCLUDE'))
);

CREATE INDEX IF NOT EXISTS idx_restaurant_service_zones_restaurant ON restaurant_service_zones(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_service_zones_zone ON restaurant_service_zones(service_zone_id);

