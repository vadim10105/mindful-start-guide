-- Add time tracking and collection fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS time_spent_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS collection_added_at timestamp with time zone;

-- Create daily stats table for aggregated statistics
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  stat_date date NOT NULL,
  tasks_completed integer DEFAULT 0,
  total_time_minutes integer DEFAULT 0,
  cards_collected integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, stat_date)
);

-- Enable RLS on daily_stats
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_stats
CREATE POLICY "Users can view their own daily stats" 
ON public.daily_stats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily stats" 
ON public.daily_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily stats" 
ON public.daily_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update daily stats
CREATE OR REPLACE FUNCTION public.update_daily_stats(
  p_user_id uuid,
  p_date date,
  p_tasks_completed integer DEFAULT 0,
  p_time_minutes integer DEFAULT 0,
  p_cards_collected integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.daily_stats (user_id, stat_date, tasks_completed, total_time_minutes, cards_collected)
  VALUES (p_user_id, p_date, p_tasks_completed, p_time_minutes, p_cards_collected)
  ON CONFLICT (user_id, stat_date)
  DO UPDATE SET
    tasks_completed = daily_stats.tasks_completed + p_tasks_completed,
    total_time_minutes = daily_stats.total_time_minutes + p_time_minutes,
    cards_collected = daily_stats.cards_collected + p_cards_collected,
    updated_at = now();
END;
$$;

-- Add trigger for automatic timestamp updates on daily_stats
CREATE TRIGGER update_daily_stats_updated_at
BEFORE UPDATE ON public.daily_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();