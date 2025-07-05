-- Add 'paused' to the task_status enum
ALTER TYPE task_status ADD VALUE 'paused';

-- Add a column to track when task was paused (optional but useful for analytics)
ALTER TABLE public.tasks ADD COLUMN paused_at TIMESTAMP WITH TIME ZONE;