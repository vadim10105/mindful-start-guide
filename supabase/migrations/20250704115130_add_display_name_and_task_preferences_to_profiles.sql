-- Add display_name field and consolidate task preferences
ALTER TABLE public.profiles 
ADD COLUMN display_name TEXT;

-- Add single task_preferences field to replace the separate rating fields
ALTER TABLE public.profiles 
ADD COLUMN task_preferences JSONB DEFAULT '{}'::jsonb;

-- Remove the old separate rating fields
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS task_love_ratings,
DROP COLUMN IF EXISTS task_avoid_ratings;