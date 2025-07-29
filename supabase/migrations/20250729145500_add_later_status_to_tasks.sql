-- Add 'later' to the task_status enum
ALTER TYPE task_status ADD VALUE 'later';

-- Add a column to track when task was moved to later (optional but useful for analytics)
ALTER TABLE public.tasks ADD COLUMN later_at TIMESTAMP WITH TIME ZONE;