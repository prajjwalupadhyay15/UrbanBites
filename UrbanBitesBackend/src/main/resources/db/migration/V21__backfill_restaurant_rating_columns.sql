ALTER TABLE restaurants
    ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_restaurants_rating ON restaurants(avg_rating);

