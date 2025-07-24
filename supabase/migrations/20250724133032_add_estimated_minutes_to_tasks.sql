-- Add estimated_minutes column to tasks table
ALTER TABLE public.tasks ADD COLUMN estimated_minutes INTEGER;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.tasks.estimated_minutes IS 'AI-estimated time to complete task in minutes';