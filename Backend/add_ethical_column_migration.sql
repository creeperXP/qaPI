-- Migration to add ethical column to analysis table
-- Run this in your Supabase SQL Editor if the column doesn't exist

-- Add ethical column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analysis' AND column_name = 'ethical'
    ) THEN
        ALTER TABLE analysis ADD COLUMN ethical TEXT NOT NULL DEFAULT 'Ethical analysis pending';
        RAISE NOTICE 'Added ethical column to analysis table';
    ELSE
        RAISE NOTICE 'ethical column already exists in analysis table';
    END IF;
END $$;

