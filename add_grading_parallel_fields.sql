-- Add grading and parallel fields to cards table
-- Run this in Supabase SQL Editor to enhance card data capture

-- Add grading fields
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS is_graded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS grading_company TEXT,
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS certification_number TEXT;

-- Add parallel/insert fields  
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS parallel_type TEXT,
ADD COLUMN IF NOT EXISTS insert_type TEXT;

-- Add indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_cards_graded ON cards(is_graded) WHERE is_graded = TRUE;
CREATE INDEX IF NOT EXISTS idx_cards_grading_company ON cards(grading_company) WHERE grading_company IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cards_parallel_type ON cards(parallel_type) WHERE parallel_type IS NOT NULL;

-- Update existing cards to set is_graded based on existing condition field
UPDATE cards 
SET is_graded = TRUE,
    grading_company = CASE 
      WHEN condition ILIKE '%PSA%' THEN 'PSA'
      WHEN condition ILIKE '%BGS%' THEN 'BGS'  
      WHEN condition ILIKE '%SGC%' THEN 'SGC'
      ELSE NULL
    END,
    grade = CASE
      WHEN condition ~ '\d+\.?\d*' THEN 
        (regexp_match(condition, '(\d+\.?\d*)'))[1]
      ELSE NULL
    END
WHERE condition ILIKE '%PSA%' OR condition ILIKE '%BGS%' OR condition ILIKE '%SGC%';

-- Add comments for documentation
COMMENT ON COLUMN cards.is_graded IS 'Whether the card is professionally graded';
COMMENT ON COLUMN cards.grading_company IS 'Grading company: PSA, BGS, SGC, etc.';
COMMENT ON COLUMN cards.grade IS 'Assigned grade: 9, 10, 9.5, etc.';
COMMENT ON COLUMN cards.certification_number IS 'Unique certification number from grading company';
COMMENT ON COLUMN cards.parallel_type IS 'Parallel type: Prizm, Refractor, Optic, etc.';
COMMENT ON COLUMN cards.insert_type IS 'Insert type: Preview, Red Zone, Downtown, etc.';
