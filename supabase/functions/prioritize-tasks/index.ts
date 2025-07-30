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
    complexity?: 'low' | 'medium' | 'high';
    importance?: 'low' | 'medium' | 'high';
    category: 'Creative' | 'Analytical' | 'Social' | 'Physical' | 'Routine' | 'Learning' | 'Planning';
  };
  estimated_time?: string;
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

function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  
  const timeStr_lower = timeStr.toLowerCase().trim();
  
  // Match patterns like "15m", "1h", "1h 30m", "90m", etc.
  const hourMatch = timeStr_lower.match(/(\d+)\s*h/);
  const minuteMatch = timeStr_lower.match(/(\d+)\s*m/);
  
  let totalMinutes = 0;
  
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1]) * 60;
  }
  
  if (minuteMatch) {
    totalMinutes += parseInt(minuteMatch[1]);
  }
  
  // If no matches but it's a pure number, assume minutes
  if (totalMinutes === 0 && /^\d+$/.test(timeStr_lower)) {
    totalMinutes = parseInt(timeStr_lower);
  }
  
  return totalMinutes > 0 ? totalMinutes : null;
}

function isTaskQuick(task: TaskInput, quickThresholdMinutes: number = 20): boolean {
  // First check user's manual quick tag
  if (task.tags.quick) return true;
  
  // Then check estimated time
  if (task.estimated_time) {
    const minutes = parseTimeToMinutes(task.estimated_time);
    if (minutes !== null && minutes <= quickThresholdMinutes) {
      return true;
    }
  }
  
  return false;
}

function calculateTaskScore(task: TaskInput, profile: UserProfile): { score: number; breakdown: any } {
  console.log(`\n🎯 Calculating score for task: "${task.text}"`);
  console.log(`📂 Category: ${task.inferred.category}`);
  console.log(`👤 User category ratings:`, profile.categoryRatings);
  
  // a. BaseCategoryScore - uses actual user preferences from onboarding
  const categoryRating = profile.categoryRatings[task.inferred.category] || 'Neutral';
  console.log(`⭐ Category rating for ${task.inferred.category}: ${categoryRating}`);
  
  const baseCategoryScore = categoryRating === 'Loved' ? 3 : categoryRating === 'Neutral' ? 0 : -2;
  console.log(`📊 Base category score: ${baseCategoryScore}`);

  // b. LiveTagScore - based on live tags and start preference
  let liveTagScore = 0;
  const isQuickTask = isTaskQuick(task);
  console.log(`🏷️ Task tags:`, task.tags);
  console.log(`⏱️ Estimated time: ${task.estimated_time || 'none'}`);
  console.log(`⚡ Is quick task: ${isQuickTask} (manual tag: ${task.tags.quick}, time-based: ${task.estimated_time ? parseTimeToMinutes(task.estimated_time) + 'min' : 'none'})`);
  console.log(`🎯 Start preference: ${profile.startPreference}`);
  
  if (profile.startPreference === 'quickWin') {
    if (task.tags.liked) liveTagScore += 3;
    if (isQuickTask) liveTagScore += 2; // Use combined quick detection
    if (task.tags.urgent) liveTagScore += 1;
    if (task.tags.disliked) liveTagScore -= 3;
  } else { // eatTheFrog
    if (task.tags.liked) liveTagScore += 2;
    if (isQuickTask) liveTagScore += 1; // Use combined quick detection
    if (task.tags.urgent) liveTagScore += 3;
    if (task.tags.disliked) liveTagScore -= 2;
  }
  console.log(`🏷️ Live tag score: ${liveTagScore}`);

  // c. EnergyAdjust - FIXED: This should always apply based on energy state
  let energyAdjust = 0;
  console.log(`⚡ Energy state: ${profile.energyState}`);
  
  if (profile.energyState === 'low') {
    // Low energy: boost quick tasks and liked tasks
    if (isQuickTask) energyAdjust += 1; // Use combined quick detection
    if (task.tags.liked) energyAdjust += 1;
    // Also boost categories that require less mental energy
    if (task.inferred.category === 'Physical' || task.inferred.category === 'Routine') {
      energyAdjust += 1;
    }
    // Penalize high-energy categories when energy is low
    if (task.inferred.category === 'Analytical' || task.inferred.category === 'Learning') {
      energyAdjust -= 1;
    }
  } else { // high energy
    // High energy: boost urgent tasks and challenging categories
    if (task.tags.urgent) energyAdjust += 1;
    if (task.inferred.category === 'Analytical' || task.inferred.category === 'Learning') {
      energyAdjust += 1;
    }
    // Slight boost for creative work during high energy
    if (task.inferred.category === 'Creative') {
      energyAdjust += 1;
    }
  }
  console.log(`⚡ Energy adjustment: ${energyAdjust}`);

  const totalScore = baseCategoryScore + liveTagScore + energyAdjust;
  console.log(`🎯 TOTAL SCORE: ${totalScore} (Base: ${baseCategoryScore} + Tags: ${liveTagScore} + Energy: ${energyAdjust})`);

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

  // Create a simple array to hold final ordered tasks
  const finalOrder: ScoredTask[] = [];
  const available = [...scoredTasks];

  // MomentumBuffer (Tasks 1-2): Quick tasks with highest scores
  const quickTasks = available
    .filter(t => isTaskQuick(t))
    .sort((a, b) => b.totalScore - a.totalScore);
  
  for (let i = 0; i < Math.min(2, quickTasks.length); i++) {
    const task = { ...quickTasks[i] };
    task.rulePlacement = `MomentumBuffer (${finalOrder.length + 1})`;
    task.position = finalOrder.length + 1;
    finalOrder.push(task);
    // Remove from available
    const index = available.findIndex(t => t.id === task.id);
    if (index !== -1) available.splice(index, 1);
  }

  // Fill remaining momentum slots with highest Liked tasks
  if (finalOrder.length < 2) {
    const likedTasks = available
      .filter(t => t.tags.liked)
      .sort((a, b) => b.totalScore - a.totalScore);
    
    for (let i = 0; i < Math.min(2 - finalOrder.length, likedTasks.length); i++) {
      const task = { ...likedTasks[i] };
      task.rulePlacement = `MomentumBuffer Fill (${finalOrder.length + 1})`;
      task.position = finalOrder.length + 1;
      finalOrder.push(task);
      // Remove from available
      const index = available.findIndex(t => t.id === task.id);
      if (index !== -1) available.splice(index, 1);
    }
  }

  // Add remaining tasks in score order
  while (available.length > 0 && finalOrder.length < tasks.length) {
    const nextTask = available.sort((a, b) => b.totalScore - a.totalScore)[0];
    const task = { ...nextTask };
    
    if (finalOrder.length === 2) {
      task.rulePlacement = 'Booster';
    } else if (finalOrder.length < 5) {
      task.rulePlacement = `EarlyPhase (${finalOrder.length + 1})`;
    } else {
      task.rulePlacement = `AlternationPhase (${finalOrder.length + 1})`;
    }
    
    task.position = finalOrder.length + 1;
    finalOrder.push(task);
    
    // Remove from available
    const index = available.findIndex(t => t.id === task.id);
    if (index !== -1) available.splice(index, 1);
  }

  console.log('🔄 Final order before return:');
  finalOrder.forEach((task, index) => {
    console.log(`  ${index + 1}. "${task.text}" - Score: ${task.totalScore} - Rule: ${task.rulePlacement}`);
  });

  return finalOrder;
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

  // Sort by position to ensure correct order
  orderedTasks.sort((a, b) => a.position - b.position);

  return orderedTasks;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tasks, userProfile } = await req.json();

    console.log('\n🚀 Received prioritization request:');
    console.log('📋 Task count:', tasks.length);
    console.log('🎯 Start preference:', userProfile.startPreference);
    console.log('⚡ Energy state:', userProfile.energyState);
    console.log('📊 Category ratings:', userProfile.categoryRatings);
    console.log('📝 Task categories:', tasks.map(t => `"${t.text}": ${t.inferred.category}`));

    // Default profile values if not provided
    const profile: UserProfile = {
      startPreference: userProfile.startPreference || 'quickWin',
      energyState: userProfile.energyState || 'high',
      categoryRatings: userProfile.categoryRatings || {
        'Creative': 'Neutral',
        'Analytical': 'Neutral',
        'Social': 'Neutral',
        'Physical': 'Neutral',
        'Routine': 'Neutral',
        'Learning': 'Neutral',
        'Planning': 'Neutral'
      }
    };

    let orderedTasks: ScoredTask[];

    if (profile.startPreference === 'quickWin') {
      orderedTasks = applyQuickWinRules(tasks, profile);
    } else {
      orderedTasks = applyEatTheFrogRules(tasks, profile);
    }

    console.log('\n✅ Prioritization completed:');
    console.log('📊 Score summary:');
    orderedTasks.forEach((task, index) => {
      console.log(`${index + 1}. "${task.text}" - Score: ${task.totalScore} (${task.rulePlacement}) - Position: ${task.position}`);
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
