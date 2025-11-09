# Supabase Setup Instructions

## Get Your Supabase Credentials

1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL** → This is your `SUPABASE_URL`
   - **anon/public key** → This is your `SUPABASE_KEY` (use the anon key for client-side operations)

## Update .env File

Add these to your `.env` file in the root directory:

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-key-here
```

## Create Users Table

Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  auth0_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth0_id ON users(auth0_id);
```

## Verify Connection

After updating `.env`, restart your backend server. You should see:
```
✅ Supabase client initialized successfully
✅ Supabase database connection verified
```

If you see errors, check:
1. SUPABASE_URL and SUPABASE_KEY are correct in .env
2. The users table exists in Supabase
3. Your Supabase project is active



