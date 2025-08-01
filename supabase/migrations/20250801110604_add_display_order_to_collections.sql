-- Add display_order field to card_collections table
ALTER TABLE card_collections ADD COLUMN display_order INTEGER;

-- Create index for performance
CREATE INDEX idx_card_collections_display_order ON card_collections(display_order);

-- Set display_order for existing collections based on created_at
WITH numbered_collections AS (
  SELECT id, row_number() OVER (ORDER BY created_at) as rn
  FROM card_collections 
  WHERE display_order IS NULL
)
UPDATE card_collections 
SET display_order = numbered_collections.rn
FROM numbered_collections
WHERE card_collections.id = numbered_collections.id;

-- Make display_order NOT NULL after setting values
ALTER TABLE card_collections ALTER COLUMN display_order SET NOT NULL;

-- Add unique constraint to prevent duplicate display_order values
ALTER TABLE card_collections ADD CONSTRAINT card_collections_display_order_unique UNIQUE (display_order);