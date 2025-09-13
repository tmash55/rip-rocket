-- Enable RLS on card_pairs if not already enabled
ALTER TABLE card_pairs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "card_pairs_own" ON card_pairs;
DROP POLICY IF EXISTS "card_pairs_select_own" ON card_pairs;
DROP POLICY IF EXISTS "card_pairs_insert_own" ON card_pairs;
DROP POLICY IF EXISTS "card_pairs_update_own" ON card_pairs;
DROP POLICY IF EXISTS "card_pairs_delete_own" ON card_pairs;

-- Create comprehensive RLS policies for card_pairs
CREATE POLICY "card_pairs_select_own" ON card_pairs
FOR SELECT 
USING (profile_id = auth.uid());

CREATE POLICY "card_pairs_insert_own" ON card_pairs
FOR INSERT 
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "card_pairs_update_own" ON card_pairs
FOR UPDATE 
USING (profile_id = auth.uid());

CREATE POLICY "card_pairs_delete_own" ON card_pairs
FOR DELETE 
USING (profile_id = auth.uid());

-- Also ensure uploads table has proper RLS
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uploads_select_own" ON uploads;
DROP POLICY IF EXISTS "uploads_insert_own" ON uploads;
DROP POLICY IF EXISTS "uploads_update_own" ON uploads;
DROP POLICY IF EXISTS "uploads_delete_own" ON uploads;

CREATE POLICY "uploads_select_own" ON uploads
FOR SELECT 
USING (profile_id = auth.uid());

CREATE POLICY "uploads_insert_own" ON uploads
FOR INSERT 
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "uploads_update_own" ON uploads
FOR UPDATE 
USING (profile_id = auth.uid());

CREATE POLICY "uploads_delete_own" ON uploads
FOR DELETE 
USING (profile_id = auth.uid());
