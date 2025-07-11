import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskInput {
  id?: string;
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
    category: string;
  };
}

interface UserProfile {
  startPreference: 'quickWin' | 'eatTheFrog';
  energyState: 'low' | 'high';
  categoryRatings: Record<string, number | 'Loved' | 'Neutral' | 'Disliked'>;
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

function calculateTaskScore(task: TaskInput, profile: UserProfile): { score: number; breakdown: ScoredTask['scoreBreakdown'] } {
  // Map category to expected categories
  const categoryMap: Record<string, string> = {
    'work': 'Analytical+Technical',
    'personal': 'Admin+Life',
    'health': 'Chores',
    'learning': 'DeepWork',
    'maintenance': 'Chores',
    'social': 'Social',
    'creative': 'Creative',
    'financial': 'Admin+Life'
  };
  
  const mappedCategory = categoryMap[task.inferred.category] || task.inferred.category;

  // Convert numeric ratings to string categories
  const convertRating = (rating: number | string): 'Loved' | 'Neutral' | 'Disliked' => {
    if (typeof rating === 'string') return rating as 'Loved' | 'Neutral' | 'Disliked';
    if (rating >= 0.8) return 'Loved';
    if (rating >= 0.5) return 'Neutral';
    return 'Disliked';
  };

  // a. BaseCategoryScore
  const rawRating = profile.categoryRatings[mappedCategory] || profile.categoryRatings[task.inferred.category] || 0.7;
  const categoryRating = convertRating(rawRating);
  const baseCategoryScore = categoryRating === 'Loved' ? 3 : categoryRating === 'Neutral' ? 0 : -2;

  // b. AutoComplexity
  const autoComplexity = task.inferred.complexity === 'high' ? 2 : task.inferred.complexity === 'medium' ? 1 : -1;

  // c. AutoImportance
  const autoImportance = task.inferred.importance === 'high' ? 2 : task.inferred.importance === 'medium' ? 1 : -1;

  // d. LiveTagScore (exact rules as specified)
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
    // For QuickWin users with low energy, further penalize high complexity (total -2)
    if (task.inferred.complexity === 'high') {
      energyAdjust -= (profile.startPreference === 'quickWin') ? 2 : 1;
    }
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

  // EarlyPhase (Tasks 4-5): Apply additional penalty to Disliked+HighComplexity, prefer Quick or Liked
  const earlyPhaseEligible = remainingTasks.map(task => {
    // Apply additional penalty for Disliked+HighComplexity tasks in early phase
    const earlyPhasePenalty = (task.tags.disliked && task.inferred.complexity === 'high') ? -1 : 0;
    return {
      ...task,
      adjustedScore: task.totalScore + earlyPhasePenalty
    };
  }).sort((a, b) => {
    // Prefer Quick or Liked tasks first
    const aPreference = (a.tags.quick || a.tags.liked) ? 1 : 0;
    const bPreference = (b.tags.quick || b.tags.liked) ? 1 : 0;
    if (aPreference !== bPreference) return bPreference - aPreference;
    // Then by adjusted score
    return b.adjustedScore - a.adjustedScore;
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
    const { tasks, profile } = await req.json();

    console.log('Received prioritization request:', { 
      taskCount: tasks?.length || 0, 
      startPreference: profile?.startPreference,
      profile: profile,
      tasks: tasks
    });

    // Add IDs to tasks if missing
    const tasksWithIds = tasks.map((task: TaskInput, index: number) => ({
      ...task,
      id: task.id || `task-${Date.now()}-${index}`
    }));

    // Default profile values if not provided
    const processedProfile: UserProfile = {
      startPreference: profile?.startPreference || 'quickWin',
      energyState: profile?.energyState || 'high',
      categoryRatings: profile?.categoryRatings || {
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

    if (processedProfile.startPreference === 'quickWin') {
      orderedTasks = applyQuickWinRules(tasksWithIds, processedProfile);
    } else {
      orderedTasks = applyEatTheFrogRules(tasksWithIds, processedProfile);
    }

    console.log('Prioritization completed:', {
      inputTasks: tasksWithIds.length,
      outputTasks: orderedTasks.length,
      strategy: processedProfile.startPreference
    });

    return new Response(JSON.stringify({
      orderedTasks,
      strategy: processedProfile.startPreference,
      profileUsed: processedProfile
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in prioritize-tasks function:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      requestBody: await req.text().catch(() => 'Could not read request body')
    });
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to prioritize tasks',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});