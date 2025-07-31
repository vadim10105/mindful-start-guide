import { supabase } from "@/integrations/supabase/client";
import { TaskCardData, CompletedTask } from './GameState';
import { getNextSequentialCard } from '@/services/cardService';

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
    
    // Update UI state immediately for instant response
    setCompletedTasks(prev => new Set([...prev, taskId]));
    setLastCompletedTask({ id: taskId, title: task.title, timeSpent });
    
    // Handle database operations asynchronously
    let collectedCard = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get the next sequential card for this user
        const nextCard = await getNextSequentialCard(user.id);
        
        if (nextCard) {
          collectedCard = nextCard;
          console.log(`🎴 User earned card #${nextCard.cardNumber}:`, nextCard.card);
          
          // Update task with the specific card they earned and mark complete
          await supabase
            .from('tasks')
            .update({ 
              list_location: 'collection',
              task_status: 'complete',
              completed_at: new Date().toISOString(),
              time_spent_minutes: timeSpent,
              collection_card_id: nextCard.cardId
            })
            .eq('id', taskId);

          // Update user progress to reflect they've unlocked this card
          await supabase
            .from('user_card_progress')
            .upsert({
              user_id: user.id,
              collection_id: nextCard.collectionId,
              cards_unlocked: nextCard.cardNumber
            }, {
              onConflict: 'user_id,collection_id'
            });
        } else {
          // No more cards available, just complete the task
          await supabase
            .from('tasks')
            .update({ 
              list_location: 'collection',
              task_status: 'complete',
              completed_at: new Date().toISOString(),
              time_spent_minutes: timeSpent
            })
            .eq('id', taskId);
        }

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

    // Add to today's collection with the earned card (or fallback)  
    const newCollectedTask: CompletedTask = {
      id: taskId,
      title: task.title,
      timeSpent: timeSpent,
      completedAt: new Date(),
      sunsetImageUrl: collectedCard?.card.imageUrl || sunsetImages[0], // Use earned card or fallback
      attribution: collectedCard?.card.attribution,
      attributionUrl: collectedCard?.card.attributionUrl,
      description: collectedCard?.card.description,
      caption: collectedCard?.card.caption
    };
    setTodaysCompletedTasks(prev => [...prev, newCollectedTask]);
    
    onTaskComplete?.(taskId);
  };

  const handleMadeProgress = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const startTime = taskStartTimes[taskId];
    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 60000) : 0;

    // Get the original task data from database to preserve all fields
    let originalTaskData = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: dbTask } = await supabase
          .from('tasks')
          .select('estimated_minutes, category')
          .eq('id', taskId)
          .eq('user_id', user.id)
          .single();
        originalTaskData = dbTask;
      }
    } catch (error) {
      console.error('Error fetching original task data:', error);
    }
    
    // Clear timer and reset flow state
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setFlowProgress(0);
    setHasCommittedToTask(false);
    setIsInitialLoad(false);
    
    // Update UI state immediately for instant response
    setCompletedTasks(prev => new Set([...prev, taskId]));
    setLastCompletedTask({ id: taskId, title: task.title, timeSpent });
    
    // Handle database operations asynchronously to get the card
    let collectedCard = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get the next sequential card for this user (same as completion)
        const nextCard = await getNextSequentialCard(user.id);
        
        if (nextCard) {
          collectedCard = nextCard;
          console.log(`🎴 User earned card #${nextCard.cardNumber} for made progress:`, nextCard.card);
          
          // Mark original task as COMPLETE and move to collection (they earned a card!)
          await supabase
            .from('tasks')
            .update({
              list_location: 'collection',
              task_status: 'complete',
              completed_at: new Date().toISOString(),
              time_spent_minutes: timeSpent,
              collection_card_id: nextCard.cardId
            })
            .eq('id', taskId);

          // Create duplicate task in later list (so they can continue working on it)
          await supabase
            .from('tasks')
            .insert({
              title: task.title,
              user_id: user.id,
              source: 'brain_dump' as const,
              list_location: 'later' as const,
              task_status: 'task_list' as const, // Fresh task status
              is_liked: task.is_liked || false,
              is_urgent: task.is_urgent || false,
              is_quick: task.is_quick || false,
              notes: task.notes || null,
              estimated_minutes: originalTaskData?.estimated_minutes || null,
              category: originalTaskData?.category || null
            });

          // Update user progress to reflect they've unlocked this card
          await supabase
            .from('user_card_progress')
            .upsert({
              user_id: user.id,
              collection_id: nextCard.collectionId,
              cards_unlocked: nextCard.cardNumber
            }, {
              onConflict: 'user_id,collection_id'
            });
        } else {
          // No more cards available - still complete original and create duplicate
          await supabase
            .from('tasks')
            .update({
              list_location: 'collection',
              task_status: 'complete',
              completed_at: new Date().toISOString(),
              time_spent_minutes: timeSpent
            })
            .eq('id', taskId);

          // Create duplicate task in later list
          await supabase
            .from('tasks')
            .insert({
              title: task.title,
              user_id: user.id,
              source: 'brain_dump' as const,
              list_location: 'later' as const,
              task_status: 'task_list' as const,
              is_liked: task.is_liked || false,
              is_urgent: task.is_urgent || false,
              is_quick: task.is_quick || false,
              notes: task.notes || null,
              estimated_minutes: originalTaskData?.estimated_minutes || null,
              category: originalTaskData?.category || null
            });
        }

        // Update daily stats (since original task is completed)
        await supabase.rpc('update_daily_stats', {
          p_user_id: user.id,
          p_date: new Date().toISOString().split('T')[0],
          p_tasks_completed: 1,
          p_time_minutes: timeSpent
        });
      }
    } catch (error) {
      console.error('Error updating task as made progress:', error);
    }

    // Add to today's collection with the earned card (or fallback)  
    const newCollectedTask: CompletedTask = {
      id: taskId,
      title: task.title,
      timeSpent: timeSpent,
      completedAt: new Date(),
      sunsetImageUrl: collectedCard?.card.imageUrl || sunsetImages[0], // Use earned card or fallback
      attribution: collectedCard?.card.attribution,
      attributionUrl: collectedCard?.card.attributionUrl,
      description: collectedCard?.card.description,
      caption: collectedCard?.card.caption
    };
    setTodaysCompletedTasks(prev => [...prev, newCollectedTask]);
    
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