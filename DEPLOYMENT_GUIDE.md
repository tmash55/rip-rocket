# eBay Integration Deployment Guide

## 🚀 Deploy to Vercel for eBay Testing

Since eBay requires HTTPS redirect URIs, we need to deploy to Vercel for testing.

### Step 1: Deploy to Vercel

```bash
# Install Vercel CLI if you haven't already
npm install -g vercel

# Deploy from your project root
vercel

# Follow the prompts and link to your project
```

### Step 2: Configure Environment Variables in Vercel

Go to your Vercel dashboard → Project → Settings → Environment Variables

Add these variables:

```env
# eBay Sandbox Configuration
NEXT_PUBLIC_EBAY_SANDBOX_CLIENT_ID=TylerMas-RipRocke-SBX-[your-app-id]
EBAY_SANDBOX_CLIENT_SECRET=SBX-[your-cert-id]
NEXT_PUBLIC_EBAY_SANDBOX_RU_NAME=Tyler_Maschoff-TylerMas-RipRoc-qjhkkjsu

# Site URL (replace with your actual Vercel domain)
NEXT_PUBLIC_SITE_URL=https://your-project-name.vercel.app

# Supabase (if not already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe (if using)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Step 3: Update eBay Developer Console

1. Go to your eBay Developer Account
2. Find your "Rip Rocket" application
3. Click "Add eBay Redirect URL"
4. Add: `https://your-vercel-domain.vercel.app/api/integrations/ebay/callback`

### Step 4: Test the Integration

1. Visit your Vercel domain: `https://your-project.vercel.app/integrations`
2. Click "Connect eBay"
3. Complete OAuth flow
4. Check browser console and Vercel function logs for debugging
5. Use "Check Status" button to verify token storage

### Step 5: Check Database

Make sure your Supabase database has the `ebay_tokens` table:

```sql
CREATE TABLE ebay_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE ebay_tokens ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to manage their own tokens
CREATE POLICY "Users can manage their own eBay tokens" ON ebay_tokens
  FOR ALL USING (auth.uid() = user_id);
```

### Debugging Tips

- Check Vercel function logs: `vercel logs`
- Use the enhanced logging we added to track the OAuth flow
- Use the `/api/integrations/ebay/status` endpoint to verify token storage
- Check browser Network tab for any failed requests

### Next Steps After Successful Token Storage

Once eBay tokens are working, we can start building:
1. eBay API client for listing management
2. Card inventory system
3. Bulk listing creation UI
4. Collection/variation management

Let me know once you have it deployed and we can test the eBay integration!
