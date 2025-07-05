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
    complexity: 'low' | 'medium' | 'high';
    importance: 'low' | 'medium' | 'high';
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
    autoComplexity: number;
    autoImportance: number;
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

  // b. AutoComplexity
  const autoComplexity = task.inferred.complexity === 'high' ? 2 : task.inferred.complexity === 'medium' ? 1 : -1;

  // c. AutoImportance
  const autoImportance = task.inferred.importance === 'high' ? 2 : task.inferred.importance === 'medium' ? 1 : -1;

  // d. LiveTagScore
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

  // e. EnergyAdjust
  let energyAdjust = 0;
  if (profile.energyState === 'low') {
    if (task.tags.quick) energyAdjust += 1;
    if (task.tags.liked) energyAdjust += 1;
    // Additional penalty for HighComplexity when energy is low
    if (task.inferred.complexity === 'high') energyAdjust -= 1;
  } else { // high energy
    if (task.tags.urgent) energyAdjust += 1;
    if (task.inferred.complexity === 'high') energyAdjust += 1;
  }

  const totalScore = baseCategoryScore + autoComplexity + autoImportance + liveTagScore + energyAdjust;

  return {
    score: totalScore,
    breakdown: {
      baseCategoryScore,
      autoComplexity,
      autoImportance,
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

  // MomentumBuffer (Tasks 1-2): Pure Quick+LowComplexity tasks
  const quickLowTasks = remainingTasks
    .filter(t => t.tags.quick && t.inferred.complexity === 'low')
    .sort((a, b) => b.totalScore - a.totalScore);
  
  for (let i = 0; i < Math.min(2, quickLowTasks.length); i++) {
    const task = quickLowTasks[i];
    task.rulePlacement = `MomentumBuffer (${i + 1})`;
    task.position = orderedTasks.length + 1;
    orderedTasks.push(task);
    remainingTasks.splice(remainingTasks.indexOf(task), 1);
  }

  // Fill remaining momentum slots with highest Liked tasks of moderate or lower complexity
  if (orderedTasks.length < 2) {
    const likedModerateOrLowerTasks = remainingTasks
      .filter(t => t.tags.liked && (t.inferred.complexity === 'low' || t.inferred.complexity === 'medium'))
      .sort((a, b) => b.totalScore - a.totalScore);
    
    for (let i = 0; i < Math.min(2 - orderedTasks.length, likedModerateOrLowerTasks.length); i++) {
      const task = likedModerateOrLowerTasks[i];
      task.rulePlacement = `MomentumBuffer Fill (${orderedTasks.length + 1})`;
      task.position = orderedTasks.length + 1;
      orderedTasks.push(task);
      remainingTasks.splice(remainingTasks.indexOf(task), 1);
    }
  }

  // Booster (Task 3): Highest-scoring Liked task
  const boosterTask = remainingTasks
    .filter(t => t.tags.liked)
    .sort((a, b) => b.totalScore - a.totalScore)[0];
  
  if (boosterTask && orderedTasks.length < 3) {
    boosterTask.rulePlacement = 'Booster';
    boosterTask.position = orderedTasks.length + 1;
    orderedTasks.push(boosterTask);
    remainingTasks.splice(remainingTasks.indexOf(boosterTask), 1);
  }

  // EarlyPhase (Tasks 4-5): Exclude Disliked && HighComplexity, prefer Quick or Liked
  const earlyPhaseEligible = remainingTasks
    .filter(t => !(t.tags.disliked && t.inferred.complexity === 'high'))
    .sort((a, b) => {
      // Prefer Quick or Liked tasks first
      const aPreference = (a.tags.quick || a.tags.liked) ? 1 : 0;
      const bPreference = (b.tags.quick || b.tags.liked) ? 1 : 0;
      if (aPreference !== bPreference) return bPreference - aPreference;
      // Then by total score
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

  // Ensure ending on easy/neutral task
  const lastTask = orderedTasks[orderedTasks.length - 1];
  if (lastTask && lastTask.inferred.complexity === 'high') {
    // Find an easy task to swap with
    const easyTaskIndex = orderedTasks.findIndex(t => 
      t.inferred.complexity === 'low' || 
      (t.inferred.complexity === 'medium' && profile.categoryRatings[t.inferred.category] === 'Neutral')
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

  // Sort each category by descending (urgent+importance+complexity) score
  Object.values(tasksByCategory).forEach(categoryTasks => {
    categoryTasks.sort((a, b) => {
      const aUrgentScore = (a.tags.urgent ? 3 : 0) + 
                          (a.inferred.importance === 'high' ? 2 : a.inferred.importance === 'medium' ? 1 : 0) +
                          (a.inferred.complexity === 'high' ? 2 : a.inferred.complexity === 'medium' ? 1 : 0);
      const bUrgentScore = (b.tags.urgent ? 3 : 0) + 
                          (b.inferred.importance === 'high' ? 2 : b.inferred.importance === 'medium' ? 1 : 0) +
                          (b.inferred.complexity === 'high' ? 2 : b.inferred.complexity === 'medium' ? 1 : 0);
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

  // Ensure ending on easy/neutral task (Universal Rule)
  const lastTask = orderedTasks[orderedTasks.length - 1];
  if (lastTask && lastTask.inferred.complexity === 'high') {
    // Find an easy task to swap with
    const easyTaskIndex = orderedTasks.findIndex(t => 
      t.inferred.complexity === 'low' || 
      (t.inferred.complexity === 'medium' && profile.categoryRatings[t.inferred.category] === 'Neutral')
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