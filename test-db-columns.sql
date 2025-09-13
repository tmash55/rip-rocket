-- Test if the new columns exist in the cards table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cards' 
  AND table_schema = 'public'
  AND column_name IN (
    'is_graded', 
    'grading_company', 
    'grade', 
    'certification_number', 
    'parallel_type', 
    'insert_type'
  )
ORDER BY column_name;
