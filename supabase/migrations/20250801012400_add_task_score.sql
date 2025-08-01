-- Add score column to tasks table (calculated on shuffle only)
ALTER TABLE public.tasks ADD COLUMN score integer DEFAULT 0;