-- Create enums for task model
CREATE TYPE public.task_source AS ENUM ('brain_dump', 'manual', 'ai');
CREATE TYPE public.task_status AS ENUM ('active', 'completed', 'skipped');
CREATE TYPE public.task_difficulty AS ENUM ('easy', 'neutral', 'hard');

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Source and status
  source task_source NOT NULL DEFAULT 'manual',
  status task_status NOT NULL DEFAULT 'active',
  
  -- User tags
  is_liked BOOLEAN DEFAULT FALSE,
  is_urgent BOOLEAN DEFAULT FALSE,
  is_quick BOOLEAN DEFAULT FALSE,
  is_disliked BOOLEAN DEFAULT FALSE,
  difficulty task_difficulty DEFAULT 'neutral',
  
  -- AI metadata
  dopamine_score FLOAT,
  ai_priority_score FLOAT,
  inferred_from_onboarding BOOLEAN DEFAULT FALSE,
  
  -- Card presentation
  card_position INTEGER NOT NULL DEFAULT 1,
  manually_reordered BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  flipped_image_url VARCHAR(2048)
);

-- Create subtasks table
CREATE TABLE public.subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tasks
CREATE POLICY "Users can view their own tasks" 
ON public.tasks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" 
ON public.tasks 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" 
ON public.tasks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for subtasks
CREATE POLICY "Users can view their own subtasks" 
ON public.subtasks 
FOR SELECT 
USING (auth.uid() = (SELECT user_id FROM public.tasks WHERE id = subtasks.task_id));

CREATE POLICY "Users can create their own subtasks" 
ON public.subtasks 
FOR INSERT 
WITH CHECK (auth.uid() = (SELECT user_id FROM public.tasks WHERE id = subtasks.task_id));

CREATE POLICY "Users can update their own subtasks" 
ON public.subtasks 
FOR UPDATE 
USING (auth.uid() = (SELECT user_id FROM public.tasks WHERE id = subtasks.task_id))
WITH CHECK (auth.uid() = (SELECT user_id FROM public.tasks WHERE id = subtasks.task_id));

CREATE POLICY "Users can delete their own subtasks" 
ON public.subtasks 
FOR DELETE 
USING (auth.uid() = (SELECT user_id FROM public.tasks WHERE id = subtasks.task_id));

-- Create indexes for performance
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_card_position ON public.tasks(card_position);
CREATE INDEX idx_subtasks_task_id ON public.subtasks(task_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subtasks_updated_at
  BEFORE UPDATE ON public.subtasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique constraint for card_position per user for active tasks
CREATE UNIQUE INDEX idx_tasks_user_card_position_unique 
ON public.tasks(user_id, card_position) 
WHERE status = 'active';