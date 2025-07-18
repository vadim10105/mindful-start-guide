
// Task categorization and user preference utilities

export interface CategoryRatings {
  'Creative': 'Loved' | 'Neutral' | 'Disliked';
  'Analytical+Technical': 'Loved' | 'Neutral' | 'Disliked';
  'DeepWork': 'Loved' | 'Neutral' | 'Disliked';
  'Admin+Life': 'Loved' | 'Neutral' | 'Disliked';
  'Chores': 'Loved' | 'Neutral' | 'Disliked';
  'Social': 'Loved' | 'Neutral' | 'Disliked';
  'Reflective': 'Loved' | 'Neutral' | 'Disliked';
}

// Map onboarding task IDs to prioritization categories
const TASK_ID_TO_CATEGORY_MAP: Record<string, keyof CategoryRatings> = {
  'creative_work': 'Creative',
  'design_visual': 'Creative',
  'writing_content': 'Creative',
  'brainstorming': 'Creative',
  'art_music': 'Creative',
  
  'coding_dev': 'Analytical+Technical',
  'data_analysis': 'Analytical+Technical',
  'research_study': 'Analytical+Technical',
  'problem_solving': 'Analytical+Technical',
  'technical_learning': 'Analytical+Technical',
  
  'deep_focus': 'DeepWork',
  'strategic_planning': 'DeepWork',
  'complex_projects': 'DeepWork',
  'learning_skills': 'DeepWork',
  
  'admin_tasks': 'Admin+Life',
  'emails_comm': 'Admin+Life',
  'meetings_calls': 'Admin+Life',
  'planning_org': 'Admin+Life',
  'finance_bills': 'Admin+Life',
  
  'household_chores': 'Chores',
  'cleaning_org': 'Chores',
  'maintenance': 'Chores',
  'errands': 'Chores',
  'shopping': 'Chores',
  
  'social_networking': 'Social',
  'team_collaboration': 'Social',
  'relationship_building': 'Social',
  'community_activities': 'Social',
  
  'self_reflection': 'Reflective',
  'goal_setting': 'Reflective',
  'journaling': 'Reflective',
  'meditation_mindfulness': 'Reflective',
  'personal_growth': 'Reflective'
};

// Keywords for automatic task categorization
const CATEGORY_KEYWORDS: Record<keyof CategoryRatings, string[]> = {
  'Creative': [
    'design', 'create', 'write', 'draw', 'paint', 'music', 'art', 'creative', 'brainstorm', 
    'content', 'video', 'photo', 'visual', 'story', 'blog', 'creative'
  ],
  'Analytical+Technical': [
    'code', 'program', 'develop', 'analyze', 'data', 'research', 'study', 'technical', 
    'algorithm', 'database', 'debug', 'test', 'api', 'system', 'software'
  ],
  'DeepWork': [
    'focus', 'concentrate', 'deep', 'complex', 'strategic', 'plan', 'strategy', 
    'learn', 'skill', 'project', 'important', 'critical'
  ],
  'Admin+Life': [
    'email', 'meeting', 'call', 'admin', 'organize', 'schedule', 'calendar', 
    'document', 'paperwork', 'form', 'application', 'finance', 'bill', 'tax'
  ],
  'Chores': [
    'clean', 'wash', 'laundry', 'dishes', 'vacuum', 'tidy', 'organize', 
    'grocery', 'shop', 'errand', 'maintenance', 'repair', 'chore'
  ],
  'Social': [
    'social', 'friend', 'family', 'team', 'collaborate', 'network', 'meet', 
    'chat', 'talk', 'connect', 'relationship', 'community', 'group'
  ],
  'Reflective': [
    'reflect', 'journal', 'meditate', 'mindful', 'goal', 'plan', 'think', 
    'review', 'assess', 'evaluate', 'personal', 'growth', 'self'
  ]
};

export function convertOnboardingPreferencesToCategoryRatings(taskPreferences: any): CategoryRatings {
  const categoryRatings: CategoryRatings = {
    'Creative': 'Neutral',
    'Analytical+Technical': 'Neutral',
    'DeepWork': 'Neutral',
    'Admin+Life': 'Neutral',
    'Chores': 'Neutral',
    'Social': 'Neutral',
    'Reflective': 'Neutral'
  };

  if (!taskPreferences) return categoryRatings;

  // Convert onboarding preferences to category ratings
  Object.entries(taskPreferences).forEach(([taskId, preference]) => {
    const category = TASK_ID_TO_CATEGORY_MAP[taskId];
    if (category && typeof preference === 'string') {
      if (preference === 'love') {
        categoryRatings[category] = 'Loved';
      } else if (preference === 'dislike') {
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
    'Analytical+Technical': 0,
    'DeepWork': 0,
    'Admin+Life': 0,
    'Chores': 0,
    'Social': 0,
    'Reflective': 0
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
  let bestCategory: keyof CategoryRatings = 'Admin+Life'; // Default fallback
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
