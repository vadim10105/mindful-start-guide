-- Add target_hours column to profiles table with default value of 3
ALTER TABLE profiles 
ADD COLUMN target_hours INTEGER DEFAULT 3 CHECK (target_hours > 0 AND target_hours <= 12);

-- Add comment explaining the column
COMMENT ON COLUMN profiles.target_hours IS 'Target hours for active task list management (default: 3 hours)';