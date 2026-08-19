-- Add owner moderation fields to restaurant_reviews table
ALTER TABLE restaurant_reviews
ADD COLUMN owner_reply TEXT,
ADD COLUMN reply_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE;
