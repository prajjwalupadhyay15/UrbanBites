-- Migration V33: Menu Item Reviews and Ratings

-- 1. Add average rating and review count to menu_items table
ALTER TABLE menu_items
ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN review_count INT DEFAULT 0;

-- 2. Create the menu_item_reviews table
CREATE TABLE menu_item_reviews (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    menu_item_id BIGINT NOT NULL REFERENCES menu_items(id),
    order_id BIGINT NOT NULL REFERENCES orders(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Ensure a user can only review a specific item on a specific order once
    CONSTRAINT uk_menu_item_review_user_order UNIQUE (user_id, menu_item_id, order_id)
);

-- Index for quick lookups by menu item
CREATE INDEX idx_menu_item_reviews_menu_item_id ON menu_item_reviews(menu_item_id);
