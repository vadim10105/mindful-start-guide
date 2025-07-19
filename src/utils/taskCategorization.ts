
// Task categorization and user preference utilities

export interface CategoryRatings {
  'Creative': 'Loved' | 'Neutral' | 'Disliked';
  'Analytical': 'Loved' | 'Neutral' | 'Disliked';
  'Social': 'Loved' | 'Neutral' | 'Disliked';
  'Physical': 'Loved' | 'Neutral' | 'Disliked';
  'Routine': 'Loved' | 'Neutral' | 'Disliked';
  'Learning': 'Loved' | 'Neutral' | 'Disliked';
  'Planning': 'Loved' | 'Neutral' | 'Disliked';
}

// Map onboarding task IDs to prioritization categories
const TASK_ID_TO_CATEGORY_MAP: Record<string, keyof CategoryRatings> = {
  'creative_tasks': 'Creative',
  'analytical_tasks': 'Analytical',
  'social_tasks': 'Social',
  'physical_tasks': 'Physical',
  'routine_tasks': 'Routine',
  'learning_tasks': 'Learning',
  'planning_tasks': 'Planning'
};

// Updated keywords for automatic task categorization - mapped to the correct categories
const CATEGORY_KEYWORDS: Record<keyof CategoryRatings, string[]> = {
  'Creative': [
    'design', 'create', 'write', 'draw', 'paint', 'music', 'art', 'creative', 'brainstorm', 
    'content', 'video', 'photo', 'visual', 'story', 'blog', 'sketch', 'craft', 'compose',
    'artistic', 'imagination', 'conceptualize', 'ideate', 'logo', 'graphics', 'branding',
    'mockup', 'prototype', 'wireframe', 'ui', 'ux', 'interface'
  ],
  'Analytical': [
    'research', 'analyze', 'data', 'study', 'investigate', 'examine', 'evaluate', 'assess',
    'calculate', 'measure', 'statistics', 'logic', 'reasoning', 'problem-solving', 'solve',
    'troubleshoot', 'debug', 'review', 'compare', 'test', 'verify', 'metrics', 'performance',
    'optimization', 'analysis', 'technical', 'code', 'programming', 'development', 'bug',
    'algorithm', 'database', 'query', 'sql', 'api', 'integration', 'system', 'architecture'
  ],
  'Social': [
    'meeting', 'call', 'collaborate', 'team', 'discuss', 'communicate', 'present', 'share',
    'network', 'connect', 'interview', 'coordinate', 'negotiate', 'feedback', 'conversation',
    'social', 'group', 'partnership', 'relationship', 'client', 'customer', 'stakeholder',
    'presentation', 'demo', 'conference', 'workshop', 'session', 'sync', 'standup'
  ],
  'Physical': [
    'build', 'fix', 'repair', 'move', 'exercise', 'walk', 'run', 'hands-on', 'manual',
    'physical', 'craft', 'assemble', 'install', 'maintenance', 'construction', 'gardening',
    'cooking', 'cleaning', 'organizing', 'setup', 'workout', 'hardware', 'equipment'
  ],
  'Routine': [
    'admin', 'administrative', 'paperwork', 'form', 'document', 'file', 'organize', 'schedule',
    'calendar', 'email', 'routine', 'recurring', 'maintenance', 'update', 'backup', 'report',
    'invoice', 'billing', 'accounting', 'tax', 'compliance', 'process', 'procedure', 'workflow',
    'approval', 'submission', 'filing', 'documentation', 'record', 'log', 'tracking'
  ],
  'Learning': [
    'learn', 'study', 'course', 'training', 'education', 'skill', 'tutorial', 'practice',
    'development', 'improve', 'master', 'certification', 'workshop', 'seminar', 'reading',
    'book', 'article', 'knowledge', 'understanding', 'explore', 'discover', 'research',
    'documentation', 'guide', 'manual', 'best practices', 'framework', 'methodology'
  ],
  'Planning': [
    'plan', 'organize', 'strategy', 'strategize', 'schedule', 'coordinate', 'manage', 'project',
    'roadmap', 'timeline', 'agenda', 'prepare', 'structure', 'framework', 'outline', 'design',
    'architecture', 'blueprint', 'goals', 'objectives', 'milestones', 'prioritize', 'scope',
    'requirements', 'specification', 'proposal', 'estimate', 'budget', 'resource', 'allocation'
  ]
};

export function convertOnboardingPreferencesToCategoryRatings(taskPreferences: any): CategoryRatings {
  const categoryRatings: CategoryRatings = {
    'Creative': 'Neutral',
    'Analytical': 'Neutral',
    'Social': 'Neutral',
    'Physical': 'Neutral',
    'Routine': 'Neutral',
    'Learning': 'Neutral',
    'Planning': 'Neutral'
  };

  if (!taskPreferences) return categoryRatings;

  // Convert onboarding preferences to category ratings
  Object.entries(taskPreferences).forEach(([taskId, preference]) => {
    const category = TASK_ID_TO_CATEGORY_MAP[taskId];
    if (category && typeof preference === 'string') {
      if (preference === 'liked') {
        categoryRatings[category] = 'Loved';
      } else if (preference === 'disliked') {
        categoryRatings[category] = 'Disliked';
      }
      // 'neutral' stays as 'Neutral'
    }
  });

  return categoryRatings;
}

export function categorizeTask(taskTitle: string): keyof CategoryRatings {
  const lowerTitle = taskTitle.toLowerCase();
  
  // Count keyword matches for each category
  const categoryScores: Record<keyof CategoryRatings, number> = {
    'Creative': 0,
    'Analytical': 0,
    'Social': 0,
    'Physical': 0,
    'Routine': 0,
    'Learning': 0,
    'Planning': 0
  };

  // Score each category based on keyword matches
  Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      if (lowerTitle.includes(keyword.toLowerCase())) {
        categoryScores[category as keyof CategoryRatings] += 1;
      }
    });
  });

  // Find the category with the highest score
  let bestCategory: keyof CategoryRatings = 'Routine'; // Default fallback
  let bestScore = 0;

  Object.entries(categoryScores).forEach(([category, score]) => {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category as keyof CategoryRatings;
    }
  });

  return bestCategory;
}

export function getCurrentEnergyState(peakEnergyTime?: string, lowestEnergyTime?: string): 'high' | 'low' {
  if (!peakEnergyTime || !lowestEnergyTime) {
    return 'high'; // Default to high energy if no data
  }

  const now = new Date();
  const currentHour = now.getHours();

  // Parse time strings (assuming format like "09:00" or "21:00")
  const parseTimeString = (timeStr: string): number => {
    const [hours] = timeStr.split(':').map(Number);
    return hours;
  };

  try {
    const peakHour = parseTimeString(peakEnergyTime);
    const lowHour = parseTimeString(lowestEnergyTime);

    // Simple heuristic: if current time is closer to peak energy time, return high energy
    const distanceToPeak = Math.min(
      Math.abs(currentHour - peakHour),
      24 - Math.abs(currentHour - peakHour) // Handle wrap-around (e.g., 23:00 to 01:00)
    );
    
    const distanceToLow = Math.min(
      Math.abs(currentHour - lowHour),
      24 - Math.abs(currentHour - lowHour)
    );

    return distanceToPeak <= distanceToLow ? 'high' : 'low';
  } catch (error) {
    console.error('Error parsing energy times:', error);
    return 'high';
  }
}
