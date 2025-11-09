-- Supabase Migration: Create products tables for API v1 and v2
-- Run this in your Supabase SQL Editor
ALTER TABLE products_v1 DISABLE ROW LEVEL SECURITY;
ALTER TABLE products_v2 DISABLE ROW LEVEL SECURITY;

-- Create products_v1 table
CREATE TABLE IF NOT EXISTS products_v1 (
    id TEXT PRIMARY KEY,
    name TEXT,
    value NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    version TEXT DEFAULT 'v1',
    status TEXT DEFAULT 'active',
    due_date TEXT,
    discount_rate NUMERIC DEFAULT 0.1,
    loyalty_discount NUMERIC DEFAULT 0.05,
    data JSONB -- Store any additional fields
);

-- Create products_v2 table (intentionally different from v1 for regression testing)
CREATE TABLE IF NOT EXISTS products_v2 (
    id TEXT PRIMARY KEY,
    name TEXT,
    value NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    version TEXT DEFAULT 'v2',
    status TEXT DEFAULT 'active',
    data JSONB -- Store any additional fields
    -- Note: v2 intentionally REMOVES: due_date, discount_rate, loyalty_discount
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_v1_created_at ON products_v1(created_at);
CREATE INDEX IF NOT EXISTS idx_products_v2_created_at ON products_v2(created_at);
CREATE INDEX IF NOT EXISTS idx_products_v1_status ON products_v1(status);
CREATE INDEX IF NOT EXISTS idx_products_v2_status ON products_v2(status);

-- Enable Row Level Security (optional, adjust as needed)
ALTER TABLE products_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_v2 ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations on products_v1" ON products_v1
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on products_v2" ON products_v2
    FOR ALL USING (true) WITH CHECK (true);

-- Create saved_test_reports table for storing test reports
CREATE TABLE IF NOT EXISTS saved_test_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    notes TEXT,
    report_style TEXT DEFAULT 'detailed',
    test_data JSONB NOT NULL,
    test_type TEXT DEFAULT 'single', -- single, all_tests
    json JSONB, -- Combined JSON from tests
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_test_reports_saved_at ON saved_test_reports(saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_test_reports_test_type ON saved_test_reports(test_type);

-- Enable Row Level Security
ALTER TABLE saved_test_reports ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations on saved_test_reports" ON saved_test_reports
    FOR ALL USING (true) WITH CHECK (true);

-- Create test_folders table for organizing test reports
CREATE TABLE IF NOT EXISTS test_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#8B5CF6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_test_folders_created_at ON test_folders(created_at DESC);

-- Enable Row Level Security
ALTER TABLE test_folders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations on test_folders" ON test_folders
    FOR ALL USING (true) WITH CHECK (true);

-- Add folder_id column to saved_test_reports if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'saved_test_reports' AND column_name = 'folder_id'
    ) THEN
        ALTER TABLE saved_test_reports ADD COLUMN folder_id UUID REFERENCES test_folders(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_saved_test_reports_folder_id ON saved_test_reports(folder_id);
    END IF;
END $$;

-- Add json column to saved_test_reports if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'saved_test_reports' AND column_name = 'json'
    ) THEN
        ALTER TABLE saved_test_reports ADD COLUMN json JSONB;
    END IF;
END $$;

-- Add ainotes column to saved_test_reports if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'saved_test_reports' AND column_name = 'ainotes'
    ) THEN
        ALTER TABLE saved_test_reports ADD COLUMN ainotes TEXT;
    END IF;
END $$;

-- Create analysis table for storing analysis reports
CREATE TABLE IF NOT EXISTS analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer TEXT NOT NULL,
    user TEXT NOT NULL,
    business TEXT NOT NULL,
    prediction TEXT NOT NULL,
    changes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add report_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analysis' AND column_name = 'report_id'
    ) THEN
        ALTER TABLE analysis ADD COLUMN report_id UUID REFERENCES saved_test_reports(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_analysis_report_id ON analysis(report_id);
    END IF;
END $$;

-- Add ethical column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analysis' AND column_name = 'ethical'
    ) THEN
        ALTER TABLE analysis ADD COLUMN ethical TEXT NOT NULL DEFAULT 'Ethical analysis pending';
    END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_analysis_created_at ON analysis(created_at DESC);

-- Enable Row Level Security
ALTER TABLE analysis ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Allow all operations on analysis" ON analysis;
CREATE POLICY "Allow all operations on analysis" ON analysis
    FOR ALL USING (true) WITH CHECK (true);

