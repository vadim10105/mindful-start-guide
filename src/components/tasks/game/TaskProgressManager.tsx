import { useState, useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { TaskCardData, CompletedTask } from './GameState';
import { unlockNextCard } from '@/services/cardService';
import { parseTimeToMinutes } from '@/utils/timeUtils';

// Global timer state per task ID (from useSimpleTimer)
const taskTimers = new Map<string, {
  baseElapsedMs: number;
  currentSessionStart: number | null;
}>();

export interface TaskProgressManagerHook {
  // Visual component
  ProgressBar: React.ComponentType<TaskProgressBarProps>;
  // Action handlers
  handleTaskComplete: (taskId: string) => Promise<void>;
  handleMadeProgress: (taskId: string) => Promise<void>;
  handlePauseTask: (taskId: string) => Promise<void>;
  handleCarryOn: (taskId: string) => void;
  handleSkip: (taskId: string) => Promise<void>;
  handleAddToCollectionDB: () => Promise<void>;
}

interface TaskProgressBarProps {
  taskId: string;
  estimatedTime?: string;
  isActiveCommitted: boolean;
  isPauseHovered?: boolean;
}

interface TaskProgressManagerProps {
  tasks: TaskCardData[];
  timerRef: React.MutableRefObject<NodeJS.Timeout | undefined>;
  taskStartTimes: Record<string, number>;
  pausedTasks: Map<string, number>;
  lastCompletedTask: {id: string, title: string, timeSpent: number} | null;
  currentViewingIndex: number;
  activeCommittedIndex: number;
  sunsetImages: string[];
  nextRewardCard: {
    card: any;
    cardId: string;
    cardNumber: number;
    collectionId: string;
  } | null;
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

export const useTaskProgressManager = (props: TaskProgressManagerProps): TaskProgressManagerHook => {
  const {
    tasks,
    timerRef,
    taskStartTimes,
    pausedTasks,
    lastCompletedTask,
    currentViewingIndex,
    activeCommittedIndex,
    sunsetImages,
    nextRewardCard,
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
  } = props;

  // Progress Bar Component (merged from TaskProgressBar)
  const ProgressBar: React.ComponentType<TaskProgressBarProps> = ({ 
    taskId, 
    estimatedTime, 
    isActiveCommitted,
    isPauseHovered = false
  }) => {
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Initialize timer state for this task if it doesn't exist
    if (!taskTimers.has(taskId)) {
      taskTimers.set(taskId, {
        baseElapsedMs: 0,
        currentSessionStart: null
      });
    }

    const timerState = taskTimers.get(taskId)!;

    // Timer logic (from useSimpleTimer)
    useEffect(() => {
      if (isActiveCommitted) {
        // Start/resume timer
        if (!timerState.currentSessionStart) {
          const now = Date.now();
          timerState.currentSessionStart = now;
          setCurrentTime(now);
        }
        
        const interval = setInterval(() => {
          setCurrentTime(Date.now());
        }, 100);
        
        return () => clearInterval(interval);
      } else {
        // Pause timer
        if (timerState.currentSessionStart) {
          const now = Date.now();
          const sessionElapsed = now - timerState.currentSessionStart;
          timerState.baseElapsedMs += sessionElapsed;
          timerState.currentSessionStart = null;
          setCurrentTime(now);
        }
      }
    }, [isActiveCommitted, taskId]);

    // Don't render if no estimated time
    if (!estimatedTime) {
      return null;
    }

    const estimatedMinutes = parseTimeToMinutes(estimatedTime);
    
    // Calculate total elapsed time
    const totalElapsedMs = timerState.currentSessionStart 
      ? timerState.baseElapsedMs + (currentTime - timerState.currentSessionStart)
      : timerState.baseElapsedMs;

    const elapsedMinutes = Math.floor(totalElapsedMs / 60000);
    const elapsedSeconds = totalElapsedMs / 1000;
    const estimatedSeconds = estimatedMinutes * 60;
    
    // Calculate progress percentage (capped at 100% for visual)
    const progressPercentage = Math.min((elapsedSeconds / estimatedSeconds) * 100, 100);
    
    // Check if we're overtime
    const isOvertime = elapsedMinutes > estimatedMinutes;

    // Format elapsed time for timer display in MM:SS
    const formatElapsedTime = (elapsedMs: number): string => {
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const elapsedTimeDisplay = formatElapsedTime(totalElapsedMs);
    
    // Dim text after 1 minute (60 seconds)
    const shouldDimText = totalElapsedMs > 60000;

    // Segmentation logic for tasks 39+ minutes
    const shouldSegment = estimatedMinutes >= 39;
    const segments: number[] = [];
    
    if (shouldSegment) {
      const fullSegments = Math.floor(estimatedMinutes / 20);
      const remainingMinutes = estimatedMinutes % 20;
      
      // Add 20-minute segments
      for (let i = 0; i < fullSegments; i++) {
        segments.push(20);
      }
      
      // Add remaining time as last segment if any
      if (remainingMinutes > 0) {
        segments.push(remainingMinutes);
      }
    }

    // Calculate which segments are filled and how much
    const getSegmentProgress = () => {
      if (!shouldSegment) return [];
      
      const segmentProgress: number[] = [];
      let remainingElapsedMinutes = elapsedMinutes;
      
      for (const segmentDuration of segments) {
        if (remainingElapsedMinutes <= 0) {
          segmentProgress.push(0);
        } else if (remainingElapsedMinutes >= segmentDuration) {
          segmentProgress.push(100);
          remainingElapsedMinutes -= segmentDuration;
        } else {
          segmentProgress.push((remainingElapsedMinutes / segmentDuration) * 100);
          remainingElapsedMinutes = 0;
        }
      }
      
      return segmentProgress;
    };

    const segmentProgress = getSegmentProgress();

    return (
      <div className="mx-4 mb-4">
        {/* Progress Bar with Timer Text Inside */}
        {shouldSegment ? (
          // Segmented progress bar for tasks 39+ minutes
          <div className="w-full h-8 relative flex rounded-full overflow-hidden">
            {segments.map((segmentDuration, index) => {
              const segmentWidth = (segmentDuration / estimatedMinutes) * 100;
              const segmentFillPercentage = segmentProgress[index] || 0;
              
              return (
                <div
                  key={index}
                  className="h-full relative flex-shrink-0 transition-all duration-700"
                  style={{ width: `${segmentWidth}%` }}
                >
                  {/* Segment background and fill */}
                  <div className="w-full h-full relative">
                    {/* Normal state background */}
                    <div 
                      className={`absolute inset-0 transition-opacity duration-700 ease-out ${isPauseHovered ? 'opacity-0' : 'opacity-100'}`}
                      style={{
                        background: `linear-gradient(to right, ${
                          isOvertime ? '#f59e0b' : 
                          isActiveCommitted ? 'hsl(48 100% 50%)' : '#9ca3af'
                        } ${segmentFillPercentage}%, ${
                          isOvertime ? 'rgba(245, 158, 11, 0.3)' : 
                          isActiveCommitted ? 'hsl(48 100% 85%)' : 'rgba(107, 114, 128, 0.3)'
                        } ${segmentFillPercentage}%)`
                      }}
                    />
                    {/* Pause hover state background */}
                    <div 
                      className={`absolute inset-0 transition-opacity duration-700 ease-out ${isPauseHovered ? 'opacity-100' : 'opacity-0'}`}
                      style={{
                        background: `linear-gradient(to right, #6b7280 ${segmentFillPercentage}%, rgba(107, 114, 128, 0.3) ${segmentFillPercentage}%)`
                      }}
                    />
                  </div>
                  
                  {/* Segment divider (except for last segment) */}
                  {index < segments.length - 1 && (
                    <div className="absolute right-0 top-0 w-1 h-full" style={{ backgroundColor: 'hsl(48 20% 97%)' }} />
                  )}
                </div>
              );
            })}
            
            {/* Timer text inside the bar - positioned on the right */}
            <div className="absolute inset-0 flex items-center justify-end pr-3 group">
              <span className={`text-xs font-medium transition-opacity duration-300 ${
                isOvertime ? 'text-white' : 'text-gray-700'
              } ${shouldDimText ? 'opacity-30 group-hover:opacity-100' : 'opacity-100'}`}>
                {elapsedTimeDisplay}
              </span>
            </div>
          </div>
        ) : (
          // Single progress bar for tasks under 39 minutes
          <div className="w-full rounded-full h-8 relative">
            {/* Normal state background */}
            <div 
              className={`absolute inset-0 rounded-full transition-opacity duration-700 ease-out ${isPauseHovered ? 'opacity-0' : 'opacity-100'}`}
              style={{
                background: `linear-gradient(to right, ${
                  isOvertime ? '#f59e0b' : 
                  isActiveCommitted ? 'hsl(48 100% 50%)' : '#9ca3af'
                } ${progressPercentage}%, ${
                  isOvertime ? 'rgba(245, 158, 11, 0.3)' : 
                  isActiveCommitted ? 'hsl(48 100% 85%)' : 'rgba(107, 114, 128, 0.3)'
                } ${progressPercentage}%)`
              }}
            />
            {/* Pause hover state background */}
            <div 
              className={`absolute inset-0 rounded-full transition-opacity duration-700 ease-out ${isPauseHovered ? 'opacity-100' : 'opacity-0'}`}
              style={{
                background: `linear-gradient(to right, #6b7280 ${progressPercentage}%, rgba(107, 114, 128, 0.3) ${progressPercentage}%)`
              }}
            />
            {/* Timer text inside the bar - positioned on the right */}
            <div className="absolute inset-0 flex items-center justify-end pr-3 group">
              <span className={`text-xs font-medium transition-opacity duration-300 ${
                isOvertime ? 'text-white' : 'text-gray-700'
              } ${shouldDimText ? 'opacity-30 group-hover:opacity-100' : 'opacity-100'}`}>
                {elapsedTimeDisplay}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Action handlers (from TaskProgressTracker)
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
    
    // Use preloaded card data for instant display
    let collectedCard = null;
    if (nextRewardCard) {
      collectedCard = {
        cardId: nextRewardCard.cardId,
        cardNumber: nextRewardCard.cardNumber,
        collectionId: nextRewardCard.collectionId,
        card: {
          imageUrl: nextRewardCard.card.imageUrl,
          attribution: nextRewardCard.card.attribution,
          attributionUrl: nextRewardCard.card.attributionUrl,
          description: nextRewardCard.card.description,
          caption: nextRewardCard.card.caption
        }
      };
    }

    // Handle database operations asynchronously
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && collectedCard) {
        // Use the preloaded card data to unlock the card
        const unlockedCard = await unlockNextCard(user.id);
        
        if (unlockedCard) {
          console.log(`🎴 User earned card #${collectedCard.cardNumber}:`, collectedCard.card);
          
          // Update task with the specific card they earned and mark complete
          await supabase
            .from('tasks')
            .update({ 
              list_location: 'collection',
              task_status: 'complete',
              completed_at: new Date().toISOString(),
              time_spent_minutes: timeSpent,
              collection_card_id: collectedCard.cardId,
              flipped_image_url: collectedCard.card.imageUrl
            })
            .eq('id', taskId);

          // Progress is already updated by unlockNextCard()
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
      caption: collectedCard?.card.caption,
      cardNumber: collectedCard?.cardNumber
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
    
    // Use preloaded card data for instant display
    let collectedCard = null;
    if (nextRewardCard) {
      collectedCard = {
        cardId: nextRewardCard.cardId,
        cardNumber: nextRewardCard.cardNumber,
        collectionId: nextRewardCard.collectionId,
        card: {
          imageUrl: nextRewardCard.card.imageUrl,
          attribution: nextRewardCard.card.attribution,
          attributionUrl: nextRewardCard.card.attributionUrl,
          description: nextRewardCard.card.description,
          caption: nextRewardCard.card.caption
        }
      };
    }

    // Handle database operations asynchronously
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && collectedCard) {
        // Use the preloaded card data to unlock the card
        const unlockedCard = await unlockNextCard(user.id);
        
        if (unlockedCard) {
          console.log(`🎴 User earned card #${collectedCard.cardNumber} for made progress:`, collectedCard.card);
          
          // Mark original task as COMPLETE and move to collection (they earned a card!)
          await supabase
            .from('tasks')
            .update({
              list_location: 'collection',
              task_status: 'complete',
              completed_at: new Date().toISOString(),
              time_spent_minutes: timeSpent,
              collection_card_id: collectedCard.cardId,
              flipped_image_url: collectedCard.card.imageUrl
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

          // Progress is already updated by unlockNextCard()
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
      caption: collectedCard?.card.caption,
      cardNumber: collectedCard?.cardNumber
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
    ProgressBar,
    handleTaskComplete,
    handleMadeProgress,
    handlePauseTask,
    handleCarryOn,
    handleSkip,
    handleAddToCollectionDB
  };
};