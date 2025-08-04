// Task categorization and user preference utilities

export interface CategoryRatings {
  'Creative Work': 'Loved' | 'Neutral' | 'Disliked';
  'Data Analysis': 'Loved' | 'Neutral' | 'Disliked';
  'Team Meetings': 'Loved' | 'Neutral' | 'Disliked';
  'Physical Tasks': 'Loved' | 'Neutral' | 'Disliked';
  'Admin Work': 'Loved' | 'Neutral' | 'Disliked';
  'Learning New Skills': 'Loved' | 'Neutral' | 'Disliked';
  'Project Planning': 'Loved' | 'Neutral' | 'Disliked';
  'Technical Work': 'Loved' | 'Neutral' | 'Disliked';
}

// Updated map to match the actual onboarding task IDs from TaskSwipeCards
const TASK_ID_TO_CATEGORY_MAP: Record<string, keyof CategoryRatings> = {
  'creative_work': 'Creative Work',
  'data_analysis': 'Data Analysis', 
  'team_meetings': 'Team Meetings',
  'physical_tasks': 'Physical Tasks',
  'admin_work': 'Admin Work',
  'learning_new_skills': 'Learning New Skills',
  'project_planning': 'Project Planning',
  'technical_work': 'Technical Work'
};

// Keywords for fallback categorization
const CATEGORY_KEYWORDS: Record<keyof CategoryRatings, string[]> = {
  'Creative Work': [
    'design', 'create', 'write', 'draw', 'paint', 'music', 'art', 'creative', 'brainstorm', 
    'content', 'video', 'photo', 'visual', 'story', 'blog', 'sketch', 'craft', 'compose',
    'artistic', 'imagination', 'conceptualize', 'ideate', 'logo', 'graphics', 'branding',
    'mockup', 'prototype', 'wireframe', 'ui', 'ux', 'interface'
  ],
  'Data Analysis': [
    'research', 'analyze', 'data', 'study', 'investigate', 'examine', 'evaluate', 'assess',
    'calculate', 'measure', 'statistics', 'logic', 'reasoning', 'problem-solving', 'solve',
    'troubleshoot', 'debug', 'review', 'compare', 'test', 'verify', 'metrics', 'performance',
    'optimization', 'analysis', 'database', 'query', 'sql', 'api', 'integration'
  ],
  'Team Meetings': [
    'meeting', 'call', 'collaborate', 'team', 'discuss', 'communicate', 'present', 'share',
    'network', 'connect', 'interview', 'coordinate', 'negotiate', 'feedback', 'conversation',
    'social', 'group', 'partnership', 'relationship', 'client', 'customer', 'stakeholder',
    'presentation', 'demo', 'conference', 'workshop', 'session', 'sync', 'standup'
  ],
  'Physical Tasks': [
    'build', 'fix', 'repair', 'move', 'exercise', 'walk', 'run', 'hands-on', 'manual',
    'physical', 'craft', 'assemble', 'install', 'maintenance', 'construction', 'gardening',
    'cooking', 'cleaning', 'organizing', 'setup', 'workout', 'hardware', 'equipment'
  ],
  'Admin Work': [
    'admin', 'administrative', 'paperwork', 'form', 'document', 'file', 'organize', 'schedule',
    'calendar', 'email', 'routine', 'recurring', 'maintenance', 'update', 'backup', 'report',
    'invoice', 'billing', 'accounting', 'tax', 'compliance', 'process', 'procedure', 'workflow',
    'approval', 'submission', 'filing', 'documentation', 'record', 'log', 'tracking'
  ],
  'Learning New Skills': [
    'learn', 'study', 'course', 'training', 'education', 'skill', 'tutorial', 'practice',
    'development', 'improve', 'master', 'certification', 'workshop', 'seminar', 'reading',
    'book', 'article', 'knowledge', 'understanding', 'explore', 'discover', 'research',
    'documentation', 'guide', 'manual', 'best practices', 'framework', 'methodology'
  ],
  'Project Planning': [
    'plan', 'organize', 'strategy', 'strategize', 'schedule', 'coordinate', 'manage', 'project',
    'roadmap', 'timeline', 'agenda', 'prepare', 'structure', 'framework', 'outline', 'design',
    'architecture', 'blueprint', 'goals', 'objectives', 'milestones', 'prioritize', 'scope',
    'requirements', 'specification', 'proposal', 'estimate', 'budget', 'resource', 'allocation'
  ],
  'Technical Work': [
    'technical', 'code', 'programming', 'development', 'software', 'system', 'architecture',
    'cad', 'engineering', 'configuration', 'implementation', 'coding', 'algorithm', 'bug',
    'framework', 'library', 'server', 'network', 'infrastructure', 'deployment', 'automation',
    'scripting', 'modeling', '3d', 'simulation', 'testing', 'quality assurance', 'devops'
  ]
};

export function convertOnboardingPreferencesToCategoryRatings(taskPreferences: any): CategoryRatings {
  console.log('🔍 Raw task preferences from database:', taskPreferences);
  
  const categoryRatings: CategoryRatings = {
    'Creative Work': 'Neutral',
    'Data Analysis': 'Neutral',
    'Team Meetings': 'Neutral',
    'Physical Tasks': 'Neutral',
    'Admin Work': 'Neutral',
    'Learning New Skills': 'Neutral',
    'Project Planning': 'Neutral',
    'Technical Work': 'Neutral'
  };

  if (!taskPreferences) {
    console.log('⚠️ No task preferences found, using all Neutral');
    return categoryRatings;
  }

  // Convert onboarding preferences to category ratings
  Object.entries(taskPreferences).forEach(([taskId, preference]) => {
    const category = TASK_ID_TO_CATEGORY_MAP[taskId];
    console.log(`📋 Processing taskId: ${taskId}, preference: ${preference}, maps to category: ${category}`);
    
    if (category && typeof preference === 'string') {
      if (preference === 'liked') {
        categoryRatings[category] = 'Loved';
        console.log(`✅ Set ${category} to Loved`);
      } else if (preference === 'disliked') {
        categoryRatings[category] = 'Disliked';
        console.log(`❌ Set ${category} to Disliked`);
      }
      // 'neutral' stays as 'Neutral'
    } else {
      console.log(`⚠️ No mapping found for taskId: ${taskId}`);
    }
  });

  console.log('📊 Final category ratings:', categoryRatings);
  return categoryRatings;
}

// Fallback keyword-based categorization
function categorizeTaskByKeywords(taskTitle: string): keyof CategoryRatings {
  const lowerTitle = taskTitle.toLowerCase();
  
  // Count keyword matches for each category
  const categoryScores: Record<keyof CategoryRatings, number> = {
    'Creative Work': 0,
    'Data Analysis': 0,
    'Team Meetings': 0,
    'Physical Tasks': 0,
    'Admin Work': 0,
    'Learning New Skills': 0,
    'Project Planning': 0,
    'Technical Work': 0
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
  let bestCategory: keyof CategoryRatings = 'Admin Work'; // Default fallback
  let bestScore = 0;

  Object.entries(categoryScores).forEach(([category, score]) => {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category as keyof CategoryRatings;
    }
  });

  return bestCategory;
}

// Main categorization function - tries AI first, falls back to keywords
export async function categorizeTask(taskTitle: string): Promise<keyof CategoryRatings> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    console.log(`🤖 Attempting AI categorization for: "${taskTitle}"`);
    
    const { data, error } = await supabase.functions.invoke('categorize-task', {
      body: { tasks: [taskTitle] }
    });

    if (error) {
      console.warn('AI categorization failed:', error);
      throw error;
    }

    if (data?.results && data.results.length > 0) {
      const result = data.results[0];
      console.log(`✅ AI categorized "${taskTitle}" as ${result.category} (confidence: ${result.confidence})`);
      console.log(`   Reasoning: ${result.reasoning}`);
      return result.category;
    }

    throw new Error('No AI categorization results');

  } catch (error) {
    console.warn(`⚠️ AI categorization failed for "${taskTitle}", using keyword fallback:`, error);
    const category = categorizeTaskByKeywords(taskTitle);
    console.log(`🔤 Keyword categorized "${taskTitle}" as ${category}`);
    return category;
  }
}

// Batch categorization for multiple tasks
export async function categorizeTasks(taskTitles: string[]): Promise<Record<string, keyof CategoryRatings>> {
  if (taskTitles.length === 0) return {};

  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    console.log(`🤖 Attempting AI batch categorization for ${taskTitles.length} tasks`);
    
    const { data, error } = await supabase.functions.invoke('categorize-task', {
      body: { tasks: taskTitles }
    });

    if (error) {
      console.warn('AI batch categorization failed:', error);
      throw error;
    }

    if (data?.results && data.results.length > 0) {
      const results: Record<string, keyof CategoryRatings> = {};
      data.results.forEach((result: any) => {
        results[result.task] = result.category;
        console.log(`✅ AI categorized "${result.task}" as ${result.category} (confidence: ${result.confidence})`);
      });
      return results;
    }

    throw new Error('No AI categorization results');

  } catch (error) {
    console.warn(`⚠️ AI batch categorization failed, using keyword fallback:`, error);
    const results: Record<string, keyof CategoryRatings> = {};
    taskTitles.forEach(title => {
      results[title] = categorizeTaskByKeywords(title);
      console.log(`🔤 Keyword categorized "${title}" as ${results[title]}`);
    });
    return results;
  }
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
