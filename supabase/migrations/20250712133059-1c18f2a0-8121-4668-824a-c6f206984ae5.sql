
-- Add archive fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN archived_at timestamp with time zone,
ADD COLUMN archive_position integer;

-- Create index for efficient archive queries
CREATE INDEX idx_tasks_archived_at ON public.tasks(archived_at) WHERE archived_at IS NOT NULL;

-- Create index for archive ordering
CREATE INDEX idx_tasks_archive_position ON public.tasks(archive_position) WHERE archive_position IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.archived_at IS 'Timestamp when task was archived, NULL for active tasks';
COMMENT ON COLUMN public.tasks.archive_position IS 'Position in archive list for ordering, NULL for active tasks';
