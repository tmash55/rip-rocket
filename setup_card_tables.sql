-- Card Management Database Setup for Rip Rocket MVP
-- This script will create all necessary tables for card processing
-- Run this in your Supabase SQL Editor

-- First, let's check what tables already exist
-- You can run this query to see your current tables:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- =============================================================================
-- 1. CREATE CORE CARD TABLES
-- =============================================================================

-- Main cards table - one record per physical card
CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Card Identification (OCR extracted)
  card_name TEXT,
  player_name TEXT,
  year INTEGER,
  brand TEXT, -- Topps, Panini, Upper Deck, etc.
  set_name TEXT, -- Chrome, Prizm, etc.
  card_number TEXT, -- "150", "RC-5", etc.
  parallel_type TEXT, -- Base, Refractor, Auto, etc.
  
  -- Condition & Grading
  condition TEXT, -- NM, EX, PSA 10, BGS 9.5, etc.
  is_graded BOOLEAN DEFAULT FALSE,
  grading_company TEXT, -- PSA, BGS, SGC, etc.
  grade TEXT, -- 10, 9.5, etc.
  
  -- Pricing & Inventory
  estimated_value DECIMAL(10,2),
  asking_price DECIMAL(10,2),
  quantity INTEGER DEFAULT 1,
  
  -- Card categorization
  sport TEXT, -- Baseball, Basketball, Football, etc.
  card_type TEXT, -- Base, Insert, Rookie, Auto, Memorabilia
  is_rookie_card BOOLEAN DEFAULT FALSE,
  is_autograph BOOLEAN DEFAULT FALSE,
  is_memorabilia BOOLEAN DEFAULT FALSE,
  
  -- OCR & Processing Status
  ocr_processed BOOLEAN DEFAULT FALSE,
  ocr_confidence DECIMAL(3,2), -- 0.00 to 1.00
  ocr_raw_data JSONB, -- Store raw OCR results
  needs_manual_review BOOLEAN DEFAULT TRUE,
  
  -- eBay Listing Status
  ebay_listing_id TEXT,
  ebay_listing_status TEXT, -- draft, active, sold, ended
  listed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Card images table - multiple images per card (front, back, details)
CREATE TABLE IF NOT EXISTS card_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Image storage
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_size INTEGER,
  mime_type TEXT,
  
  -- Image classification
  image_type TEXT NOT NULL, -- 'front', 'back', 'detail', 'signature', 'defect'
  is_primary BOOLEAN DEFAULT FALSE, -- Main image for eBay listing
  display_order INTEGER DEFAULT 0,
  
  -- Image processing
  width INTEGER,
  height INTEGER,
  processed BOOLEAN DEFAULT FALSE,
  
  -- OCR results for this specific image
  ocr_text TEXT,
  ocr_data JSONB, -- Structured OCR results
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Upload batches - track bulk uploads
CREATE TABLE IF NOT EXISTS upload_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  batch_name TEXT,
  total_images INTEGER,
  processed_images INTEGER DEFAULT 0,
  status TEXT DEFAULT 'uploading', -- uploading, processing, completed, failed
  
  -- Processing results
  cards_created INTEGER DEFAULT 0,
  cards_paired INTEGER DEFAULT 0, -- Front/back pairs found
  ocr_success_rate DECIMAL(3,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Link upload batches to images
CREATE TABLE IF NOT EXISTS batch_images (
  batch_id UUID REFERENCES upload_batches(id) ON DELETE CASCADE,
  image_id UUID REFERENCES card_images(id) ON DELETE CASCADE,
  PRIMARY KEY (batch_id, image_id)
);

-- CSV import data for variations
CREATE TABLE IF NOT EXISTS card_variations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  
  -- Variation details
  variation_type TEXT, -- condition, price, etc.
  sku TEXT,
  price DECIMAL(10,2),
  quantity INTEGER DEFAULT 1,
  condition_notes TEXT,
  
  -- eBay specific
  ebay_variation_id TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- eBay listing templates
CREATE TABLE IF NOT EXISTS listing_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  template_name TEXT NOT NULL,
  title_template TEXT, -- "{year} {brand} {set} {player_name} #{card_number}"
  description_template TEXT,
  category_id TEXT, -- eBay category
  
  -- Default settings
  listing_type TEXT DEFAULT 'FixedPriceItem', -- Auction, FixedPriceItem
  duration TEXT DEFAULT 'Days_7',
  shipping_cost DECIMAL(10,2),
  handling_time INTEGER DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Drop indexes if they exist (to avoid errors) and recreate
DROP INDEX IF EXISTS idx_cards_user_id;
DROP INDEX IF EXISTS idx_cards_ebay_status;
DROP INDEX IF EXISTS idx_cards_needs_review;
DROP INDEX IF EXISTS idx_card_images_card_id;
DROP INDEX IF EXISTS idx_card_images_type;
DROP INDEX IF EXISTS idx_upload_batches_user_id;

CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_ebay_status ON cards(ebay_listing_status);
CREATE INDEX idx_cards_needs_review ON cards(needs_manual_review);
CREATE INDEX idx_card_images_card_id ON card_images(card_id);
CREATE INDEX idx_card_images_type ON card_images(image_type);
CREATE INDEX idx_upload_batches_user_id ON upload_batches(user_id);

-- =============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_images ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. CREATE RLS POLICIES
-- =============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can manage their own cards" ON cards;
DROP POLICY IF EXISTS "Users can manage their own card images" ON card_images;
DROP POLICY IF EXISTS "Users can manage their own upload batches" ON upload_batches;
DROP POLICY IF EXISTS "Users can manage their own card variations" ON card_variations;
DROP POLICY IF EXISTS "Users can manage their own listing templates" ON listing_templates;
DROP POLICY IF EXISTS "Users can manage their own batch images" ON batch_images;

-- Users can only access their own data
CREATE POLICY "Users can manage their own cards" ON cards
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own card images" ON card_images
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own upload batches" ON upload_batches
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own card variations" ON card_variations
  FOR ALL USING (auth.uid() = (SELECT user_id FROM cards WHERE id = card_id));

CREATE POLICY "Users can manage their own listing templates" ON listing_templates
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own batch images" ON batch_images
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM upload_batches WHERE id = batch_id)
  );

-- =============================================================================
-- 5. CREATE STORAGE BUCKET (Run this separately in Storage section)
-- =============================================================================

-- Note: You'll need to create the storage bucket manually in Supabase Dashboard
-- or run this in the Storage section:
-- 
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('card-images', 'card-images', true);

-- =============================================================================
-- 6. CREATE STORAGE POLICIES (Run after creating bucket)
-- =============================================================================

-- Allow authenticated users to upload images to their own folder
-- CREATE POLICY "Users can upload their own card images" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'card-images' AND 
--     auth.role() = 'authenticated' AND
--     (storage.foldername(name))[1] = auth.uid()::text
--   );

-- Allow users to view their own images
-- CREATE POLICY "Users can view their own card images" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'card-images' AND
--     auth.role() = 'authenticated' AND
--     (storage.foldername(name))[1] = auth.uid()::text
--   );

-- Allow users to delete their own images
-- CREATE POLICY "Users can delete their own card images" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'card-images' AND
--     auth.role() = 'authenticated' AND
--     (storage.foldername(name))[1] = auth.uid()::text
--   );

-- =============================================================================
-- 7. VERIFICATION QUERIES
-- =============================================================================

-- Run these to verify everything was created successfully:

-- Check all tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('cards', 'card_images', 'upload_batches', 'batch_images', 'card_variations', 'listing_templates')
ORDER BY table_name;

-- Check indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('cards', 'card_images', 'upload_batches')
ORDER BY tablename, indexname;

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('cards', 'card_images', 'upload_batches', 'card_variations', 'listing_templates', 'batch_images')
ORDER BY tablename;

-- Check policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('cards', 'card_images', 'upload_batches', 'card_variations', 'listing_templates', 'batch_images')
ORDER BY tablename, policyname;

