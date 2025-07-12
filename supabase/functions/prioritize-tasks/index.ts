
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskInput {
  id: string;
  text: string;
  tags: {
    liked?: boolean;
    urgent?: boolean;
    quick?: boolean;
    disliked?: boolean;
  };
  inferred: {
    complexity?: 'low' | 'medium' | 'high'; // Made optional since we're not using it
    importance?: 'low' | 'medium' | 'high'; // Made optional since we're not using it
    category: 'Creative' | 'Analytical+Technical' | 'DeepWork' | 'Admin+Life' | 'Chores' | 'Social' | 'Reflective';
  };
}

interface UserProfile {
  startPreference: 'quickWin' | 'eatTheFrog';
  energyState: 'low' | 'high';
  categoryRatings: Record<string, 'Loved' | 'Neutral' | 'Disliked'>;
}

interface ScoredTask extends TaskInput {
  totalScore: number;
  scoreBreakdown: {
    baseCategoryScore: number;
    liveTagScore: number;
    energyAdjust: number;
  };
  rulePlacement: string;
  position: number;
}

function calculateTaskScore(task: TaskInput, profile: UserProfile): { score: number; breakdown: any } {
  // a. BaseCategoryScore
  const categoryRating = profile.categoryRatings[task.inferred.category] || 'Neutral';
  const baseCategoryScore = categoryRating === 'Loved' ? 3 : categoryRating === 'Neutral' ? 0 : -2;

  // b. LiveTagScore
  let liveTagScore = 0;
  if (profile.startPreference === 'quickWin') {
    if (task.tags.liked) liveTagScore += 3;
    if (task.tags.quick) liveTagScore += 2;
    if (task.tags.urgent) liveTagScore += 1;
    if (task.tags.disliked) liveTagScore -= 3;
  } else { // eatTheFrog
    if (task.tags.liked) liveTagScore += 2;
    if (task.tags.quick) liveTagScore += 1;
    if (task.tags.urgent) liveTagScore += 3;
    if (task.tags.disliked) liveTagScore -= 2;
  }

  // c. EnergyAdjust (simplified without complexity)
  let energyAdjust = 0;
  if (profile.energyState === 'low') {
    if (task.tags.quick) energyAdjust += 1;
    if (task.tags.liked) energyAdjust += 1;
  } else { // high energy
    if (task.tags.urgent) energyAdjust += 1;
  }

  const totalScore = baseCategoryScore + liveTagScore + energyAdjust;

  return {
    score: totalScore,
    breakdown: {
      baseCategoryScore,
      liveTagScore,
      energyAdjust
    }
  };
}

function applyQuickWinRules(tasks: TaskInput[], profile: UserProfile): ScoredTask[] {
  // Score all tasks first
  const scoredTasks = tasks.map(task => {
    const { score, breakdown } = calculateTaskScore(task, profile);
    return {
      ...task,
      totalScore: score,
      scoreBreakdown: breakdown,
      rulePlacement: '',
      position: 0
    };
  });

  const orderedTasks: ScoredTask[] = [];
  const remainingTasks = [...scoredTasks];

  // MomentumBuffer (Tasks 1-2): Quick tasks (removed complexity requirement)
  const quickTasks = remainingTasks
    .filter(t => t.tags.quick)
    .sort((a, b) => b.totalScore - a.totalScore);
  
  for (let i = 0; i < Math.min(2, quickTasks.length); i++) {
    const task = quickTasks[i];
    task.rulePlacement = `MomentumBuffer (${i + 1})`;
    task.position = orderedTasks.length + 1;
    orderedTasks.push(task);
    remainingTasks.splice(remainingTasks.indexOf(task), 1);
  }

  // Fill remaining momentum slots with highest Liked tasks
  if (orderedTasks.length < 2) {
    const likedTasks = remainingTasks
      .filter(t => t.tags.liked)
      .sort((a, b) => b.totalScore - a.totalScore);
    
    for (let i = 0; i < Math.min(2 - orderedTasks.length, likedTasks.length); i++) {
      const task = likedTasks[i];
      task.rulePlacement = `MomentumBuffer Fill (${orderedTasks.length + 1})`;
      task.position = orderedTasks.length + 1;
      orderedTasks.push(task);
      remainingTasks.splice(remainingTasks.indexOf(task), 1);
    }
  }

  // Booster (Task 3): Highest-scoring Liked task, or next highest Quick/Neutral if no Liked tasks
  let boosterTask = remainingTasks
    .filter(t => t.tags.liked)
    .sort((a, b) => b.totalScore - a.totalScore)[0];
  
  // If no liked tasks available, use next highest Quick or Neutral task
  if (!boosterTask && orderedTasks.length < 3) {
    boosterTask = remainingTasks
      .filter(t => t.tags.quick || profile.categoryRatings[t.inferred.category] === 'Neutral')
      .sort((a, b) => b.totalScore - a.totalScore)[0];
  }
  
  if (boosterTask && orderedTasks.length < 3) {
    boosterTask.rulePlacement = 'Booster';
    boosterTask.position = orderedTasks.length + 1;
    orderedTasks.push(boosterTask);
    remainingTasks.splice(remainingTasks.indexOf(boosterTask), 1);
  }

  // EarlyPhase (Tasks 4-5): Prefer Quick or Liked tasks (removed complexity penalties)
  const earlyPhaseEligible = remainingTasks.sort((a, b) => {
    // Prefer Quick or Liked tasks first
    const aPreference = (a.tags.quick || a.tags.liked) ? 1 : 0;
    const bPreference = (b.tags.quick || b.tags.liked) ? 1 : 0;
    if (aPreference !== bPreference) return bPreference - aPreference;
    // Then by score
    return b.totalScore - a.totalScore;
  });
  
  for (let i = 0; i < Math.min(2, earlyPhaseEligible.length) && orderedTasks.length < 5; i++) {
    const task = earlyPhaseEligible[i];
    task.rulePlacement = `EarlyPhase (${orderedTasks.length + 1})`;
    task.position = orderedTasks.length + 1;
    orderedTasks.push(task);
    remainingTasks.splice(remainingTasks.indexOf(task), 1);
  }

  // AlternationPhase (Tasks 6+): Alternate Liked/Loved ↔ Other
  let consecutiveNonLiked = 0;
  let lastCategory = '';
  
  while (remainingTasks.length > 0) {
    let nextTask;
    
    // If we've had 2 non-liked in a row, must pick a liked task
    if (consecutiveNonLiked >= 2) {
      nextTask = remainingTasks
        .filter(t => t.tags.liked)
        .sort((a, b) => b.totalScore - a.totalScore)[0];
    }
    
    // If no liked task available or not forced to pick liked, use normal alternation
    if (!nextTask) {
      // Try to bundle same category if beneficial
      const sameCategoryTasks = remainingTasks.filter(t => t.inferred.category === lastCategory);
      if (sameCategoryTasks.length > 0 && Math.random() > 0.7) { // 30% chance to bundle
        nextTask = sameCategoryTasks.sort((a, b) => b.totalScore - a.totalScore)[0];
      } else {
        nextTask = remainingTasks.sort((a, b) => b.totalScore - a.totalScore)[0];
      }
    }
    
    if (nextTask) {
      nextTask.rulePlacement = `AlternationPhase (${orderedTasks.length + 1})`;
      nextTask.position = orderedTasks.length + 1;
      orderedTasks.push(nextTask);
      remainingTasks.splice(remainingTasks.indexOf(nextTask), 1);
      
      // Update tracking
      if (nextTask.tags.liked) {
        consecutiveNonLiked = 0;
      } else {
        consecutiveNonLiked++;
      }
      lastCategory = nextTask.inferred.category;
    }
  }

  // Ensure ending on easy/neutral task (based on category rating only)
  const lastTask = orderedTasks[orderedTasks.length - 1];
  if (lastTask && profile.categoryRatings[lastTask.inferred.category] === 'Disliked') {
    // Find a neutral or loved task to swap with
    const easyTaskIndex = orderedTasks.findIndex(t => 
      profile.categoryRatings[t.inferred.category] === 'Neutral' || 
      profile.categoryRatings[t.inferred.category] === 'Loved'
    );
    
    if (easyTaskIndex !== -1 && easyTaskIndex < orderedTasks.length - 1) {
      // Swap positions
      [orderedTasks[easyTaskIndex], orderedTasks[orderedTasks.length - 1]] = 
      [orderedTasks[orderedTasks.length - 1], orderedTasks[easyTaskIndex]];
      
      // Update positions
      orderedTasks.forEach((task, index) => {
        task.position = index + 1;
      });
    }
  }

  return orderedTasks;
}

function applyEatTheFrogRules(tasks: TaskInput[], profile: UserProfile): ScoredTask[] {
  // Score all tasks first
  const scoredTasks = tasks.map(task => {
    const { score, breakdown } = calculateTaskScore(task, profile);
    return {
      ...task,
      totalScore: score,
      scoreBreakdown: breakdown,
      rulePlacement: '',
      position: 0
    };
  });

  // Group by category for bundling
  const tasksByCategory = scoredTasks.reduce((acc, task) => {
    if (!acc[task.inferred.category]) acc[task.inferred.category] = [];
    acc[task.inferred.category].push(task);
    return acc;
  }, {} as Record<string, ScoredTask[]>);

  // Sort each category by descending urgency score only (removed importance and complexity)
  Object.values(tasksByCategory).forEach(categoryTasks => {
    categoryTasks.sort((a, b) => {
      const aUrgentScore = (a.tags.urgent ? 3 : 0);
      const bUrgentScore = (b.tags.urgent ? 3 : 0);
      // If urgency is the same, use total score
      if (aUrgentScore === bUrgentScore) {
        return b.totalScore - a.totalScore;
      }
      return bUrgentScore - aUrgentScore;
    });
  });

  // Build ordered list with bundling and alternation
  const orderedTasks: ScoredTask[] = [];
  const categoryKeys = Object.keys(tasksByCategory).sort((a, b) => {
    const avgScoreA = tasksByCategory[a].reduce((sum, t) => sum + t.totalScore, 0) / tasksByCategory[a].length;
    const avgScoreB = tasksByCategory[b].reduce((sum, t) => sum + t.totalScore, 0) / tasksByCategory[b].length;
    return avgScoreB - avgScoreA;
  });

  let currentCategoryIndex = 0;
  let tasksFromCurrentCategory = 0;
  
  while (orderedTasks.length < tasks.length) {
    const currentCategory = categoryKeys[currentCategoryIndex];
    const availableTasks = tasksByCategory[currentCategory]?.filter(t => !orderedTasks.includes(t));
    
    if (availableTasks && availableTasks.length > 0) {
      const nextTask = availableTasks[0];
      nextTask.rulePlacement = `EatTheFrog-${currentCategory} (${orderedTasks.length + 1})`;
      nextTask.position = orderedTasks.length + 1;
      orderedTasks.push(nextTask);
      tasksFromCurrentCategory++;
      
      // Switch category every 3-4 tasks or when current category is exhausted
      if (tasksFromCurrentCategory >= 3 + Math.floor(Math.random() * 2) || availableTasks.length === 1) {
        currentCategoryIndex = (currentCategoryIndex + 1) % categoryKeys.length;
        tasksFromCurrentCategory = 0;
      }
    } else {
      currentCategoryIndex = (currentCategoryIndex + 1) % categoryKeys.length;
      tasksFromCurrentCategory = 0;
    }
  }

  // Ensure ending on easy/neutral task (based on category rating only)
  const lastTask = orderedTasks[orderedTasks.length - 1];
  if (lastTask && profile.categoryRatings[lastTask.inferred.category] === 'Disliked') {
    // Find a neutral or loved task to swap with
    const easyTaskIndex = orderedTasks.findIndex(t => 
      profile.categoryRatings[t.inferred.category] === 'Neutral' || 
      profile.categoryRatings[t.inferred.category] === 'Loved'
    );
    
    if (easyTaskIndex !== -1 && easyTaskIndex < orderedTasks.length - 1) {
      // Swap positions
      [orderedTasks[easyTaskIndex], orderedTasks[orderedTasks.length - 1]] = 
      [orderedTasks[orderedTasks.length - 1], orderedTasks[easyTaskIndex]];
      
      // Update positions
      orderedTasks.forEach((task, index) => {
        task.position = index + 1;
      });
    }
  }

  return orderedTasks;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tasks, userProfile } = await req.json();

    console.log('Received prioritization request:', { 
      taskCount: tasks.length, 
      startPreference: userProfile.startPreference 
    });

    // Default profile values if not provided
    const profile: UserProfile = {
      startPreference: userProfile.startPreference || 'quickWin',
      energyState: userProfile.energyState || 'high',
      categoryRatings: userProfile.categoryRatings || {
        'Creative': 'Neutral',
        'Analytical+Technical': 'Neutral',
        'DeepWork': 'Neutral',
        'Admin+Life': 'Neutral',
        'Chores': 'Neutral',
        'Social': 'Neutral',
        'Reflective': 'Neutral'
      }
    };

    let orderedTasks: ScoredTask[];

    if (profile.startPreference === 'quickWin') {
      orderedTasks = applyQuickWinRules(tasks, profile);
    } else {
      orderedTasks = applyEatTheFrogRules(tasks, profile);
    }

    console.log('Prioritization completed:', {
      inputTasks: tasks.length,
      outputTasks: orderedTasks.length,
      strategy: profile.startPreference
    });

    return new Response(JSON.stringify({
      orderedTasks,
      strategy: profile.startPreference,
      profileUsed: profile
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in prioritize-tasks function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to prioritize tasks'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
