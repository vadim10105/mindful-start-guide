import { parseTimeToMinutes, formatMinutesToDisplay } from '@/utils/timeUtils';
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  list_location: 'active' | 'later' | 'collection';
  task_status: 'task_list' | 'not_started' | 'incomplete' | 'made_progress' | 'complete';
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  card_position?: number;
  notes?: string;
  estimated_minutes?: number;
  category?: string;
}

interface DoLessBetterProps {
  user: any;
  activeTaskIds: string[];
  tasksById: Record<string, Task>;
  taskTagsById: Record<string, { isLiked: boolean; isUrgent: boolean; isQuick: boolean }>;
  taskTimeEstimatesById: Record<string, string>;
  setActiveTaskIds: (ids: string[]) => void;
  setLaterTaskIds: (updater: (prev: string[]) => string[]) => void;
  saveTaskAsLater: (taskId: string) => Promise<void>;
  setLaterTasksExpanded?: (expanded: boolean) => void;
}

export const DoLessBetter = ({
  user,
  activeTaskIds,
  tasksById,
  taskTagsById,
  taskTimeEstimatesById,
  setActiveTaskIds,
  setLaterTaskIds,
  saveTaskAsLater,
  setLaterTasksExpanded
}: DoLessBetterProps) => {
  const { toast } = useToast();

  const calculateTotalActiveTime = () => {
    return activeTaskIds.reduce((total, taskId) => {
      const timeEstimate = taskTimeEstimatesById[taskId];
      const minutes = parseTimeToMinutes(timeEstimate || '') || 0;
      return total + minutes;
    }, 0);
  };

  const shortenActiveList = async () => {
    if (!user) return;

    // Calculate shortening score (separate from shuffle-tasks)
    const calculateShorteningScore = (taskId: string, userPreferences: any = {}) => {
      const task = tasksById[taskId];
      const tags = taskTagsById[taskId] || { isLiked: false, isUrgent: false, isQuick: false };
      
      let categoryScore = 0;
      let tagScore = 0;
      
      // Category score based on user preferences
      if (task?.category && userPreferences) {
        const preference = userPreferences[task.category];
        if (preference === 'Loved') categoryScore = 3;
        else if (preference === 'Neutral') categoryScore = 0;  
        else if (preference === 'Disliked') categoryScore = -2;
      }
      
      // Tag scores
      if (tags.isLiked) tagScore += 3;
      if (tags.isQuick) tagScore += 2;
      if (tags.isUrgent) tagScore += 1;
      
      return categoryScore + tagScore;
    };

    const tasksWithScores = activeTaskIds.map(taskId => ({
      taskId,
      score: calculateShorteningScore(taskId),
      timeMinutes: parseTimeToMinutes(taskTimeEstimatesById[taskId] || '') || 0,
      tags: taskTagsById[taskId] || { isLiked: false, isUrgent: false, isQuick: false }
    }));

    // Selection strategy: keep 1+ liked, 1+ quick, 1+ urgent, then fill to 2 hours
    const mustKeep: string[] = [];
    const available = [...tasksWithScores];

    // Keep 1+ liked task (highest scoring)
    const likedTasks = available.filter(t => t.tags.isLiked).sort((a, b) => b.score - a.score);
    if (likedTasks.length > 0) {
      mustKeep.push(likedTasks[0].taskId);
      const index = available.findIndex(t => t.taskId === likedTasks[0].taskId);
      available.splice(index, 1);
    }

    // Keep 1+ quick task (highest scoring)
    const quickTasks = available.filter(t => t.tags.isQuick).sort((a, b) => b.score - a.score);
    if (quickTasks.length > 0) {
      mustKeep.push(quickTasks[0].taskId);
      const index = available.findIndex(t => t.taskId === quickTasks[0].taskId);
      available.splice(index, 1);
    }

    // Keep 1+ urgent task (highest scoring)
    const urgentTasks = available.filter(t => t.tags.isUrgent).sort((a, b) => b.score - a.score);
    if (urgentTasks.length > 0) {
      mustKeep.push(urgentTasks[0].taskId);
      const index = available.findIndex(t => t.taskId === urgentTasks[0].taskId);
      available.splice(index, 1);
    }

    // Fill remaining time with highest-scoring tasks until ≤ 3 hours
    const sorted = available.sort((a, b) => b.score - a.score);
    let currentTime = mustKeep.reduce((total, taskId) => {
      const timeEstimate = taskTimeEstimatesById[taskId];
      return total + (parseTimeToMinutes(timeEstimate || '') || 0);
    }, 0);

    const toKeep = [...mustKeep];
    for (const task of sorted) {
      if (currentTime + task.timeMinutes <= 180) { // 3 hours = 180 minutes
        toKeep.push(task.taskId);
        currentTime += task.timeMinutes;
      }
    }

    // Move remaining tasks to later
    const toMoveToLater = activeTaskIds.filter(taskId => !toKeep.includes(taskId));
    
    if (toMoveToLater.length > 0) {
      // Update local state
      setActiveTaskIds(toKeep);
      setLaterTaskIds(prev => [...prev, ...toMoveToLater]);

      // Update database
      for (const taskId of toMoveToLater) {
        await saveTaskAsLater(taskId);
      }

      
      // Collapse the later tasks section after shortening
      if (setLaterTasksExpanded) {
        setLaterTasksExpanded(false);
      }
    }
  };

  const totalMinutes = calculateTotalActiveTime();
  const totalTimeDisplay = formatMinutesToDisplay(totalMinutes);
  const shouldShowShortenSuggestion = totalMinutes > 180; // 3 hours

  if (activeTaskIds.length === 0) return null;

  return (
    <div className="flex items-center gap-4 py-4 mb-4">
      <div className="flex-1 h-px bg-[#AAAAAA]/40"></div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium flex items-center gap-2" style={{ color: '#AAAAAA' }}>
          <Clock className="w-4 h-4" style={{ color: '#AAAAAA' }} />
          {totalTimeDisplay}
        </span>
        {shouldShowShortenSuggestion && (
          <>
            <span style={{ color: '#AAAAAA', opacity: 0.6 }}>•</span>
            <button
              onClick={shortenActiveList}
              className="text-sm text-yellow-500 hover:text-yellow-600 font-medium transition-colors"
            >
              Shorten List
            </button>
          </>
        )}
      </div>
      <div className="flex-1 h-px bg-[#AAAAAA]/40"></div>
    </div>
  );
};