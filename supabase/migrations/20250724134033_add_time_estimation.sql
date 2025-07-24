-- Add time estimation field to tasks table
ALTER TABLE public.tasks 
ADD COLUMN estimated_minutes INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.estimated_minutes IS 'AI-generated or user-edited time estimate in minutes for task completion';