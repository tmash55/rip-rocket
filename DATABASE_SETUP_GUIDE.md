# Database Setup Guide for Card Management System

## 📋 Overview

This guide will help you set up all the necessary database tables and storage for the card management MVP.

## 🔍 Current Database Status

Based on your existing code, you already have:
- ✅ `ebay_tokens` table (for eBay OAuth)
- ✅ `profiles` table (for Stripe integration)
- ✅ Supabase Auth system
- ✅ Basic RLS policies

## 🚀 Setup Steps

### Step 1: Check Current Tables

First, run this query in your Supabase SQL Editor to see what tables you currently have:

```sql
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Step 2: Create Card Management Tables

1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the entire `setup_card_tables.sql` file
3. Click **Run** to execute all the table creation commands

This will create:
- `cards` - Main card records with OCR data
- `card_images` - Image storage and metadata
- `upload_batches` - Batch upload tracking
- `batch_images` - Links batches to images
- `card_variations` - CSV import variations
- `listing_templates` - eBay listing templates

### Step 3: Create Storage Bucket

1. Go to **Storage** → **Create bucket**
2. Bucket name: `card-images`
3. Set as **Public** (for easier image access)
4. Click **Create bucket**

### Step 4: Set Storage Policies

After creating the bucket, run these commands in the SQL Editor:

```sql
-- Allow authenticated users to upload images to their own folder
CREATE POLICY "Users can upload their own card images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'card-images' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to view their own images
CREATE POLICY "Users can view their own card images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'card-images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own card images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'card-images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

### Step 5: Environment Variables

Add this to your environment variables (Vercel or local):

```env
# Google Vision API for OCR
GOOGLE_VISION_API_KEY=your_google_vision_api_key_here

# Existing variables you should already have:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 6: Verification

Run the verification queries at the end of `setup_card_tables.sql` to confirm everything is set up correctly.

## 📊 Expected Table Structure

After setup, you should have these tables:

```
Database Tables:
├── auth.users (Supabase managed)
├── ebay_tokens (existing)
├── profiles (existing)
├── cards (new)
├── card_images (new)
├── upload_batches (new)
├── batch_images (new)
├── card_variations (new)
└── listing_templates (new)

Storage:
└── card-images bucket
```

## 🔧 Troubleshooting

**If you get foreign key errors:**
- Make sure `auth.users` table exists (it should by default)
- Check that RLS is properly configured

**If storage policies fail:**
- Ensure the bucket was created first
- Make sure you're running the storage policies in the SQL Editor, not the Storage interface

**If table creation fails:**
- Check if tables already exist with: `\dt` in SQL Editor
- Use `DROP TABLE tablename CASCADE;` to remove and recreate if needed

## 🎯 Next Steps

Once the database is set up:
1. ✅ Database tables created
2. ✅ Storage bucket configured
3. ✅ RLS policies enabled
4. 🔄 Build upload UI component
5. 🔄 Create API routes for processing
6. 🔄 Implement OCR processing pipeline

## 📞 Getting Help

If you run into issues:
1. Check the Supabase logs in the Dashboard
2. Verify your user authentication is working
3. Test a simple insert to make sure RLS policies work
4. Share any error messages for debugging

