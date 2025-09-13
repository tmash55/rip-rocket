-- Card Management Database Schema for Rip Rocket MVP

-- Main cards table - one record per physical card
CREATE TABLE cards (
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
CREATE TABLE card_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Image storage
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- S3/Supabase Storage path
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
CREATE TABLE upload_batches (
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
CREATE TABLE batch_images (
  batch_id UUID REFERENCES upload_batches(id) ON DELETE CASCADE,
  image_id UUID REFERENCES card_images(id) ON DELETE CASCADE,
  PRIMARY KEY (batch_id, image_id)
);

-- CSV import data for variations
CREATE TABLE card_variations (
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
CREATE TABLE listing_templates (
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

-- Indexes for performance
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_ebay_status ON cards(ebay_listing_status);
CREATE INDEX idx_cards_needs_review ON cards(needs_manual_review);
CREATE INDEX idx_card_images_card_id ON card_images(card_id);
CREATE INDEX idx_card_images_type ON card_images(image_type);
CREATE INDEX idx_upload_batches_user_id ON upload_batches(user_id);

-- RLS Policies
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_templates ENABLE ROW LEVEL SECURITY;

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

