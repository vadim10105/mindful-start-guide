-- SQL to add 'technical_work': 'neutral' to existing user profiles' task_preferences JSON
-- Run this in your Supabase SQL Editor

UPDATE profiles 
SET task_preferences = jsonb_set(
  COALESCE(task_preferences, '{}'::jsonb), 
  '{technical_work}', 
  '"neutral"'::jsonb
)
WHERE task_preferences IS NOT NULL 
  AND NOT (task_preferences ? 'technical_work');

-- This query will:
-- 1. Only update profiles that have task_preferences (not null)
-- 2. Only update profiles that don't already have technical_work
-- 3. Add technical_work: 'neutral' to their existing preferences
-- 4. Keep all existing preferences intact