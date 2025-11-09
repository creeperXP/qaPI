-- Migration to add report_id column to analysis table
-- Run this in your Supabase SQL Editor if the column doesn't exist

-- Add report_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analysis' AND column_name = 'report_id'
    ) THEN
        ALTER TABLE analysis ADD COLUMN report_id UUID REFERENCES saved_test_reports(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_analysis_report_id ON analysis(report_id);
        RAISE NOTICE 'Added report_id column to analysis table';
    ELSE
        RAISE NOTICE 'report_id column already exists in analysis table';
    END IF;
END $$;


