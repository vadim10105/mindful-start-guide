import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Task {
  id: string;
  title: string;
  is_liked: boolean;
  is_urgent: boolean;
  is_quick: boolean;
  estimated_minutes: number | null;
  category: string | null;
  score: number;
}

function calculateTaskScore(task: Task, userPreferences: any): number {
  let categoryScore = 0;
  let tagScore = 0;
  
  // Category score based on user preferences
  if (task.category && userPreferences) {
    const preference = userPreferences[task.category];
    if (preference === 'Loved') categoryScore = 3;
    else if (preference === 'Neutral') categoryScore = 0;  
    else if (preference === 'Disliked') categoryScore = -2;
  }
  
  // Tag scores
  if (task.is_liked) tagScore += 3;
  if (task.is_quick) tagScore += 2;
  if (task.is_urgent) tagScore += 1;
  
  return categoryScore + tagScore;
}

function applyRulePlacement(tasks: Task[]): Task[] {
  const result: Task[] = [];
  const available = [...tasks];
  
  // Position 1: First Quick-tagged task (highest score if multiple)
  const quickTasks = available
    .filter(t => t.is_quick || (t.estimated_minutes && t.estimated_minutes <= 20))
    .sort((a, b) => b.score - a.score);
  
  if (quickTasks.length > 0) {
    result.push(quickTasks[0]);
    const index = available.findIndex(t => t.id === quickTasks[0].id);
    available.splice(index, 1);
  }
  
  // Position 2: First Liked-tagged task not already placed (highest score if multiple)
  const likedTasks = available
    .filter(t => t.is_liked)
    .sort((a, b) => b.score - a.score);
  
  if (likedTasks.length > 0) {
    result.push(likedTasks[0]);
    const index = available.findIndex(t => t.id === likedTasks[0].id);
    available.splice(index, 1);
  }
  
  // Position 3: First Urgent-tagged task if exists, otherwise next highest-scoring task
  const urgentTasks = available
    .filter(t => t.is_urgent)
    .sort((a, b) => b.score - a.score);
  
  if (urgentTasks.length > 0) {
    result.push(urgentTasks[0]);
    const index = available.findIndex(t => t.id === urgentTasks[0].id);
    available.splice(index, 1);
  } else if (available.length > 0) {
    // No urgent tasks, use highest scoring available task
    const highestScoring = available.sort((a, b) => b.score - a.score)[0];
    result.push(highestScoring);
    const index = available.findIndex(t => t.id === highestScoring.id);
    available.splice(index, 1);
  }
  
  // Position 4+: Alternate between lower scores and higher scores
  // End rule: Try to finish on a high-scoring task (Quick/Liked/Loved category)
  if (available.length > 0) {
    const sortedRemaining = available.sort((a, b) => b.score - a.score);
    
    // Find best task for ending (Quick/Liked/Loved category)
    const goodEndingTasks = sortedRemaining.filter(t => 
      t.is_quick || 
      t.is_liked || 
      (t.estimated_minutes && t.estimated_minutes <= 20)
    );
    
    let savedForEnd: Task | null = null;
    if (goodEndingTasks.length > 0 && sortedRemaining.length > 1) {
      savedForEnd = goodEndingTasks[0];
      const index = sortedRemaining.findIndex(t => t.id === savedForEnd!.id);
      sortedRemaining.splice(index, 1);
    }
    
    // Add remaining tasks (alternating pattern could be added here)
    result.push(...sortedRemaining);
    
    // Add the saved high-scoring task at the end
    if (savedForEnd) {
      result.push(savedForEnd);
    }
  }
  
  // Return tasks with their new positions
  return result.map((task, index) => ({
    ...task,
    position: index + 1
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    
    console.log('Received shuffle request for userId:', userId);
    
    if (!userId) {
      throw new Error('userId is required');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch user preferences from profiles table
    console.log('Fetching user preferences for:', userId);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('task_preferences')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      // Continue without preferences (will use defaults)
    }

    const userPreferences = profile?.task_preferences || {};
    console.log('User preferences:', userPreferences);

    // Fetch active tasks for the user
    console.log('Fetching tasks for user:', userId);
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, is_liked, is_urgent, is_quick, estimated_minutes, category, score')
      .eq('user_id', userId)
      .eq('list_location', 'active');

    console.log('Query result:', { tasks: tasks?.length, error });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No active tasks to shuffle',
        shuffledTasks: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate scores and update in database
    console.log('Calculating scores...');
    const scoreUpdates = tasks.map(async (task) => {
      const calculatedScore = calculateTaskScore(task, userPreferences);
      task.score = calculatedScore; // Update local copy
      
      return supabase
        .from('tasks')
        .update({ score: calculatedScore })
        .eq('id', task.id);
    });

    await Promise.all(scoreUpdates);
    console.log('Scores updated in database');

    // Apply rule placement to get shuffled order
    const shuffledTasks = applyRulePlacement(tasks);

    console.log(`Shuffled ${tasks.length} tasks for user ${userId}`);
    console.log('New order:', shuffledTasks.map((t, i) => `${i+1}. ${t.title} (score: ${t.score})`));

    return new Response(JSON.stringify({
      message: `Successfully shuffled ${tasks.length} tasks`,
      shuffledTasks: shuffledTasks.map(t => ({
        id: t.id,
        title: t.title,
        position: t.position,
        score: t.score
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in shuffle-tasks function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to shuffle tasks'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});