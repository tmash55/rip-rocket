-- Check existing RLS policies for card_pairs table
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'card_pairs';

-- Check if RLS is enabled on card_pairs
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'card_pairs';

-- Show the card_pairs table structure
\d card_pairs;

-- Check current user access
SELECT current_user, current_role;
