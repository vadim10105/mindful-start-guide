import { parseTimeToMinutes, formatMinutesToDisplay } from '@/utils/timeUtils';
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { forwardRef, useImperativeHandle, useState } from "react";

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
  laterTaskIds: string[];
  tasksById: Record<string, Task>;
  taskTagsById: Record<string, { isLiked: boolean; isUrgent: boolean; isQuick: boolean }>;
  taskTimeEstimatesById: Record<string, string>;
  setActiveTaskIds: (ids: string[]) => void;
  setLaterTaskIds: (updater: (prev: string[]) => string[]) => void;
  saveTaskAsLater: (taskId: string) => Promise<void>;
  setLaterTasksExpanded?: (expanded: boolean) => void;
  isProcessing: boolean;
  targetHours?: number; // Optional target hours, defaults to 3
}

export const DoLessBetter = forwardRef<
  { shortenActiveList: () => Promise<void>; flashButton: () => void },
  DoLessBetterProps
>((props, ref) => {
  const {
    user,
    activeTaskIds,
    laterTaskIds,
    tasksById,
    taskTagsById,
    taskTimeEstimatesById,
    setActiveTaskIds,
    setLaterTaskIds,
    saveTaskAsLater,
    setLaterTasksExpanded,
    isProcessing,
    targetHours = 3
  } = props;
  const { toast } = useToast();
  const [isFlashing, setIsFlashing] = useState(false);
  
  const targetMinutes = targetHours * 60; // Convert hours to minutes

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

    // Fill remaining time with highest-scoring tasks until ≤ target hours
    const sorted = available.sort((a, b) => b.score - a.score);
    let currentTime = mustKeep.reduce((total, taskId) => {
      const timeEstimate = taskTimeEstimatesById[taskId];
      return total + (parseTimeToMinutes(timeEstimate || '') || 0);
    }, 0);

    const toKeep = [...mustKeep];
    for (const task of sorted) {
      if (currentTime + task.timeMinutes <= targetMinutes) {
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

  const flashButton = () => {
    setIsFlashing(true);
    setTimeout(() => {
      setIsFlashing(false);
    }, 600); // Flash duration
  };

  // Expose the shortenActiveList function via ref
  useImperativeHandle(ref, () => ({
    shortenActiveList,
    flashButton
  }));

  const addFromLater = async () => {
    if (!user || laterTaskIds.length === 0) return;
    
    // Smart selection logic (same as the removed button from Later section)
    const calculateScore = (taskId: string) => {
      const tags = taskTagsById[taskId] || { isLiked: false, isUrgent: false, isQuick: false };
      let tagScore = 0;
      if (tags.isLiked) tagScore += 3;
      if (tags.isQuick) tagScore += 2;
      if (tags.isUrgent) tagScore += 1;
      return tagScore;
    };

    const laterTasksWithScores = laterTaskIds.map(taskId => ({
      taskId,
      score: calculateScore(taskId),
      timeMinutes: parseTimeToMinutes(taskTimeEstimatesById[taskId] || '') || 30, // Default 30min if no estimate
      tags: taskTagsById[taskId] || { isLiked: false, isUrgent: false, isQuick: false }
    }));

    // Selection strategy: prioritize 1+ liked, 1+ quick, 1+ urgent, then fill to 3 hours
    const toMove: string[] = [];
    const available = [...laterTasksWithScores];

    // Prioritize highest scoring liked task
    const likedTasks = available.filter(t => t.tags.isLiked).sort((a, b) => b.score - a.score);
    if (likedTasks.length > 0) {
      toMove.push(likedTasks[0].taskId);
      const index = available.findIndex(t => t.taskId === likedTasks[0].taskId);
      available.splice(index, 1);
    }

    // Prioritize highest scoring quick task
    const quickTasks = available.filter(t => t.tags.isQuick).sort((a, b) => b.score - a.score);
    if (quickTasks.length > 0) {
      toMove.push(quickTasks[0].taskId);
      const index = available.findIndex(t => t.taskId === quickTasks[0].taskId);
      available.splice(index, 1);
    }

    // Prioritize highest scoring urgent task
    const urgentTasks = available.filter(t => t.tags.isUrgent).sort((a, b) => b.score - a.score);
    if (urgentTasks.length > 0) {
      toMove.push(urgentTasks[0].taskId);
      const index = available.findIndex(t => t.taskId === urgentTasks[0].taskId);
      available.splice(index, 1);
    }

    // Calculate current active time
    const currentActiveTime = calculateTotalActiveTime();

    // Fill remaining time with highest-scoring tasks until ≤ 3 hours total
    const sorted = available.sort((a, b) => b.score - a.score);
    let timeWithMustKeep = toMove.reduce((total, taskId) => {
      const task = laterTasksWithScores.find(t => t.taskId === taskId);
      return total + (task?.timeMinutes || 30);
    }, 0);

    for (const task of sorted) {
      if (currentActiveTime + timeWithMustKeep + task.timeMinutes <= targetMinutes) {
        toMove.push(task.taskId);
        timeWithMustKeep += task.timeMinutes;
      }
    }

    if (toMove.length > 0) {
      // Update local state
      setActiveTaskIds(prev => [...prev, ...toMove]);
      setLaterTaskIds(prev => prev.filter(id => !toMove.includes(id)));
      
      // Update database
      for (const taskId of toMove) {
        try {
          await supabase
            .from('tasks')
            .update({ list_location: 'active' })
            .eq('id', taskId)
            .eq('user_id', user?.id);
        } catch (error) {
          console.error('Error moving task to active:', error);
        }
      }
      
      const totalTimeAfter = currentActiveTime + timeWithMustKeep;
      console.log(`📝 Smart-moved ${toMove.length} tasks from later to active (${Math.round(totalTimeAfter/60*10)/10} hours total)`);
    }
  };

  const totalMinutes = calculateTotalActiveTime();
  const totalTimeDisplay = formatMinutesToDisplay(totalMinutes);
  const shouldShowShortenSuggestion = totalMinutes > targetMinutes;
  
  // Check if we can actually add any tasks from later
  const canActuallyAddFromLater = () => {
    if (laterTaskIds.length === 0 || isProcessing) return false;
    
    // If no active tasks, we can always add from later
    if (activeTaskIds.length === 0) return true;
    
    // Check if any later task can fit in the remaining time
    const remainingMinutes = targetMinutes - totalMinutes;
    if (remainingMinutes <= 0) return false;
    
    // Check if any later task is small enough to fit
    return laterTaskIds.some(taskId => {
      const timeMinutes = parseTimeToMinutes(taskTimeEstimatesById[taskId] || '') || 30;
      return timeMinutes <= remainingMinutes;
    });
  };
  
  const shouldShowFillButton = canActuallyAddFromLater() && activeTaskIds.length > 0; // Only show when there are active tasks

  // Only show component when there are active tasks
  if (activeTaskIds.length === 0) return null;

  return (
    <div className="flex items-center gap-4 py-4 mb-4">
      <div className="flex-1 h-px bg-[#AAAAAA]/40"></div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium flex items-center gap-2" style={{ color: '#AAAAAA' }}>
          <Clock className="w-4 h-4" style={{ color: '#AAAAAA' }} />
          {totalTimeDisplay}
        </span>
        {(shouldShowShortenSuggestion || shouldShowFillButton) && (
          <>
            <span style={{ color: '#AAAAAA', opacity: 0.6 }}>•</span>
            {shouldShowShortenSuggestion && (
              <button
                onClick={shortenActiveList}
                className={`text-sm font-medium transition-all duration-300 ${
                  isFlashing 
                    ? 'text-yellow-400 bg-yellow-400/20 px-2 py-1 rounded-md scale-105 shadow-lg' 
                    : 'text-yellow-500 hover:text-yellow-600'
                }`}
              >
                Shorten List
              </button>
            )}
            {shouldShowShortenSuggestion && shouldShowFillButton && (
              <>
                <span style={{ color: '#AAAAAA', opacity: 0.6 }}>•</span>
              </>
            )}
            {shouldShowFillButton && (
              <button
                onClick={addFromLater}
                className="text-sm font-medium text-yellow-500 hover:text-yellow-600 transition-colors"
              >
                Fill from Later
              </button>
            )}
          </>
        )}
      </div>
      <div className="flex-1 h-px bg-[#AAAAAA]/40"></div>
    </div>
  );
});

DoLessBetter.displayName = 'DoLessBetter';