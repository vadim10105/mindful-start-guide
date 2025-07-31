import { supabase } from "@/integrations/supabase/client";
import { TaskCardData, CompletedTask } from './GameState';

export interface TaskProgressTrackerHook {
  handleTaskComplete: (taskId: string) => Promise<void>;
  handleMadeProgress: (taskId: string) => Promise<void>;
  handlePauseTask: (taskId: string) => Promise<void>;
  handleCarryOn: (taskId: string) => void;
  handleSkip: (taskId: string) => Promise<void>;
  handleAddToCollectionDB: () => Promise<void>;
}

interface TaskProgressTrackerProps {
  tasks: TaskCardData[];
  timerRef: React.MutableRefObject<NodeJS.Timeout | undefined>;
  taskStartTimes: Record<string, number>;
  pausedTasks: Map<string, number>;
  lastCompletedTask: {id: string, title: string, timeSpent: number} | null;
  currentViewingIndex: number;
  activeCommittedIndex: number;
  sunsetImages: string[];
  setFlowProgress: (progress: number) => void;
  setHasCommittedToTask: (committed: boolean) => void;
  setIsInitialLoad: (isInitial: boolean) => void;
  setCompletedTasks: (tasks: React.SetStateAction<Set<string>>) => void;
  setLastCompletedTask: (task: {id: string, title: string, timeSpent: number} | null) => void;
  setTodaysCompletedTasks: (tasks: React.SetStateAction<CompletedTask[]>) => void;
  setPausedTasks: (tasks: React.SetStateAction<Map<string, number>>) => void;
  setTaskStartTimes: (times: React.SetStateAction<Record<string, number>>) => void;
  setActiveCommittedIndex: (index: number) => void;
  setFlowStartTime: (time: number) => void;
  onTaskComplete?: (taskId: string) => void;
}

export const useTaskProgressTracker = ({
  tasks,
  timerRef,
  taskStartTimes,
  pausedTasks,
  lastCompletedTask,
  currentViewingIndex,
  activeCommittedIndex,
  sunsetImages,
  setFlowProgress,
  setHasCommittedToTask,
  setIsInitialLoad,
  setCompletedTasks,
  setLastCompletedTask,
  setTodaysCompletedTasks,
  setPausedTasks,
  setTaskStartTimes,
  setActiveCommittedIndex,
  setFlowStartTime,
  onTaskComplete
}: TaskProgressTrackerProps): TaskProgressTrackerHook => {

  const handleTaskComplete = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const startTime = taskStartTimes[taskId];
    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 60000) : 0;
    

    // Clear timer and reset flow state
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setFlowProgress(0);
    setHasCommittedToTask(false);
    setIsInitialLoad(false);
    
    // Update completion state
    setCompletedTasks(prev => new Set([...prev, taskId]));
    setLastCompletedTask({ id: taskId, title: task.title, timeSpent });
    
    // Add to today's collection (UI state update)
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    const newCollectedTask: CompletedTask = {
      id: taskId,
      title: task.title,
      timeSpent: timeSpent,
      completedAt: new Date(),
      sunsetImageUrl: sunsetImages[taskIndex % sunsetImages.length]
    };
    setTodaysCompletedTasks(prev => [...prev, newCollectedTask]);
    
    // Handle database operations asynchronously
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tasks')
          .update({ 
            list_location: 'collection',
            task_status: 'complete',
            completed_at: new Date().toISOString(),
            time_spent_minutes: timeSpent
          })
          .eq('id', taskId);

        await supabase.rpc('update_daily_stats', {
          p_user_id: user.id,
          p_date: new Date().toISOString().split('T')[0],
          p_tasks_completed: 1,
          p_time_minutes: timeSpent
        });
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
    
    onTaskComplete?.(taskId);
  };

  const handleMadeProgress = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const startTime = taskStartTimes[taskId];
    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 60000) : 0;
    
    // Clear timer and reset flow state
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setFlowProgress(0);
    setHasCommittedToTask(false);
    setIsInitialLoad(false);
    
    // Mark as completed in UI to flip the card
    setCompletedTasks(prev => new Set([...prev, taskId]));
    setLastCompletedTask({ id: taskId, title: task.title, timeSpent });
    
    // Save task to database with status 'later' to appear in saved for later list
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Parse estimated time to minutes if available
        const parseTimeToMinutes = (timeStr: string): number => {
          const match = timeStr.match(/(\d+)\s*(min|minute|minutes|m|hr|hour|hours|h)/i);
          if (!match) return 0;
          
          const value = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          
          if (unit.startsWith('h')) {
            return value * 60;
          }
          return value;
        };

        const estimatedMinutes = task.estimated_time ? parseTimeToMinutes(task.estimated_time) : null;
        
        await supabase
          .from('tasks')
          .insert({
            title: task.title,
            user_id: user.id,
            source: 'brain_dump' as const,
            list_location: 'later' as const, // Tasks with progress go to later list
            task_status: 'made_progress' as const, // Task had some work done on it
            is_liked: task.is_liked || false,
            is_urgent: task.is_urgent || false,
            is_quick: task.is_quick || false,
            estimated_minutes: estimatedMinutes,
          });
      }
    } catch (error) {
      console.error('Error saving task as made progress:', error);
    }
    
    onTaskComplete?.(taskId);
  };

  const handlePauseTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const startTime = taskStartTimes[taskId];
    const timeSpentMs = startTime ? (Date.now() - startTime) : 0;
    
    // Clear current timer and reset flow state
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setFlowProgress(0);
    
    // Mark current task as paused (store elapsed milliseconds)
    setPausedTasks(prev => new Map(prev.set(taskId, timeSpentMs)));
    
    // Release commitment - allow user to choose next task manually
    setHasCommittedToTask(false);
    setActiveCommittedIndex(-1);
    setIsInitialLoad(false);
    
    // Save pause state to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tasks')
          .update({ 
            status: 'paused',
            paused_at: new Date().toISOString(),
            time_spent_minutes: Math.round(timeSpentMs / 60000)
          })
          .eq('id', taskId);
      }
    } catch (error) {
      console.error('Error pausing task:', error);
    }
  };

  const handleCarryOn = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const pausedTimeMs = pausedTasks.get(taskId) || 0;
    
    setHasCommittedToTask(true);
    setActiveCommittedIndex(currentViewingIndex);
    setFlowStartTime(Date.now());
    setFlowProgress(0);
    
    setTaskStartTimes(prev => ({
      ...prev,
      [taskId]: Date.now() - pausedTimeMs
    }));
    
    setPausedTasks(prev => {
      const newMap = new Map(prev);
      newMap.delete(taskId);
      return newMap;
    });
  };

  const handleSkip = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setPausedTasks(prev => {
      const newMap = new Map(prev);
      newMap.delete(taskId);
      return newMap;
    });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tasks')
          .update({ status: 'skipped' })
          .eq('id', taskId);
      }
    } catch (error) {
      console.error('Error skipping task:', error);
    }
  };

  const handleAddToCollectionDB = async () => {
    if (!lastCompletedTask) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tasks')
          .update({ collection_added_at: new Date().toISOString() })
          .eq('id', lastCompletedTask.id);

        await supabase.rpc('update_daily_stats', {
          p_user_id: user.id,
          p_date: new Date().toISOString().split('T')[0],
          p_cards_collected: 1
        });
      }
    } catch (error) {
      console.error('Error adding to collection:', error);
    }
  };

  return {
    handleTaskComplete,
    handleMadeProgress,
    handlePauseTask,
    handleCarryOn,
    handleSkip,
    handleAddToCollectionDB
  };
};