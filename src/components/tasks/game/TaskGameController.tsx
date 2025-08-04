import { useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { TaskSwiper } from "./TaskSwiper";
import { NavigationDots } from "./NavigationDots";
import { useGameState, TaskCardData } from "./GameState";
import { ShuffleAnimation } from "./ShuffleAnimation";
import { Eye } from "lucide-react";
// New decomposed managers
import { formatTime } from "@/utils/timeUtils";
import { useTaskNavigationManager } from "./TaskNavigationManager";
import { useTaskProgressManager } from "./TaskProgressManager";
import { usePictureInPictureManager, PictureInPictureManager } from "./PictureInPicture/PictureInPictureManager";
import { usePiP } from "./PictureInPicture";
import { getRewardCardData, RewardCardData } from "@/services/cardService";
import { WhatsAheadOverlay } from "./WhatsAheadOverlay";

// External dependencies
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getNextSequentialCard } from "@/services/cardService";

interface TaskGameControllerProps {
  tasks: TaskCardData[];
  onComplete: (completedTaskIds: Set<string>) => void;
  onTaskComplete?: (taskId: string) => void;
  isLoading?: boolean;
  isProcessing?: boolean;
  onLoadingComplete?: () => void;
}

export const TaskGameController = ({ 
  tasks: initialTasks, 
  onComplete, 
  onTaskComplete, 
  isLoading = false, 
  isProcessing = false, 
  onLoadingComplete 
}: TaskGameControllerProps) => {
  const [tasks, setTasks] = useState(initialTasks);
  const gameState = useGameState(tasks);
  const [showWhatsAhead, setShowWhatsAhead] = useState(false);

  // Update tasks when initialTasks changes
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);
  const { toast } = useToast();

  // Debounce timers for saving notes
  const [notesSaveTimers, setNotesSaveTimers] = useState<Record<string, NodeJS.Timeout>>({});

  // Function to refresh tasks from database (for PiP sync)
  const refreshTasksFromDB = useCallback(async () => {
    if (tasks.length === 0) return;
    
    try {
      const taskIds = tasks.map(t => t.id);
      const { data, error } = await supabase
        .from('tasks')
        .select('id, notes')
        .in('id', taskIds);

      if (error) {
        console.error('Error refreshing tasks:', error);
        return;
      }

      if (data) {
        setTasks(prevTasks => 
          prevTasks.map(task => {
            const dbTask = data.find(d => d.id === task.id);
            return dbTask ? { ...task, notes: dbTask.notes || '' } : task;
          })
        );
      }
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
    }
  }, [tasks]);

  // Function to update task notes
  const updateTaskNotes = useCallback((taskId: string, notes: string) => {
    // Update local state immediately for responsive UI
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, notes }
          : task
      )
    );

    // Clear existing timer for this task
    setNotesSaveTimers(prev => {
      if (prev[taskId]) {
        clearTimeout(prev[taskId]);
      }

      // Set new timer to save after 1 second of no typing
      const newTimer = setTimeout(async () => {
        try {
          const { error } = await supabase
            .from('tasks')
            .update({ notes })
            .eq('id', taskId);

          if (error) {
            console.error('Error saving task notes:', error);
          }
        } catch (error) {
          console.error('Failed to save task notes:', error);
        }
        
        // Clean up timer
        setNotesSaveTimers(current => {
          const newTimers = { ...current };
          delete newTimers[taskId];
          return newTimers;
        });
      }, 1000);

      // Store the new timer
      return {
        ...prev,
        [taskId]: newTimer
      };
    });
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(notesSaveTimers).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [notesSaveTimers]);

  // Reward card data from Supabase
  const [rewardCards, setRewardCards] = useState<RewardCardData[]>([]);
  const [nextRewardCard, setNextRewardCard] = useState<{
    card: RewardCardData;
    cardId: string;
    cardNumber: number;
    collectionId: string;
  } | null>(null);

  useEffect(() => {
    const loadRewardCards = async () => {
      const cardData = await getRewardCardData();
      setRewardCards(cardData);
    };
    loadRewardCards();
  }, []);

  // Function to load next reward card
  const loadNextRewardCard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const nextCard = await getNextSequentialCard(user.id);
      setNextRewardCard(nextCard);
      console.log('🎴 Next reward card loaded:', nextCard);
    }
  };

  // Load the next reward card for the user on mount
  useEffect(() => {
    loadNextRewardCard();
  }, []);

  const sunsetImages = rewardCards.map(card => card.imageUrl);

  // PiP Manager
  const { setOnPiPClose } = usePiP();
  const pipManager = usePictureInPictureManager({
    tasks,
    isLoading,
    isProcessing
  });

  // Set up refresh callback for when PiP closes
  useEffect(() => {
    setOnPiPClose(refreshTasksFromDB);
    return () => setOnPiPClose(null);
  }, [setOnPiPClose, refreshTasksFromDB]);

  // Define handleCommitToCurrentTask first since other hooks need it
  const handleCommitToCurrentTask = useCallback(() => {
    // Don't allow action if already committed to avoid conflicts with PiP
    if (gameState.hasCommittedToTask && pipManager.isPiPActive) return;
    
    const currentTask = tasks[gameState.currentViewingIndex];
    if (!currentTask) return;
    
    // Check if this task was previously paused
    const pausedTime = gameState.pausedTasks.get(currentTask.id) || 0;
    const isResumingPausedTask = pausedTime > 0;
    
    gameState.setHasCommittedToTask(true);
    gameState.setActiveCommittedIndex(gameState.currentViewingIndex);
    gameState.setFlowStartTime(Date.now());
    gameState.setFlowProgress(0);
    
    if (isResumingPausedTask) {
      // Resume from paused time - adjust start time to account for time already spent
      const adjustedStartTime = Date.now() - (pausedTime * 60000);
      
      gameState.setTaskStartTimes(prev => ({
        ...prev,
        [currentTask.id]: adjustedStartTime
      }));
      
      // Remove from paused tasks since we're resuming
      gameState.setPausedTasks(prev => {
        const newMap = new Map(prev);
        newMap.delete(currentTask.id);
        return newMap;
      });
    } else {
      // Fresh start for new task (only if it doesn't already have a start time)
      gameState.setTaskStartTimes(prev => ({
        ...prev,
        [currentTask.id]: prev[currentTask.id] || Date.now()
      }));
      
      // Save start time and update status to incomplete for fresh starts
      if (!gameState.taskStartTimes[currentTask.id]) {
        const saveStartTime = async () => {
          try {
            await supabase
              .from('tasks')
              .update({ 
                started_at: new Date().toISOString(),
                task_status: 'incomplete'
              })
              .eq('id', currentTask.id);
          } catch (error) {
            console.error('Error saving task start time:', error);
          }
        };
        saveStartTime();
      }
    }
  }, [
    gameState.hasCommittedToTask,
    pipManager.isPiPActive,
    tasks,
    gameState.currentViewingIndex,
    gameState.pausedTasks,
    gameState.setHasCommittedToTask,
    gameState.setActiveCommittedIndex,
    gameState.setFlowStartTime,
    gameState.setFlowProgress,
    gameState.setTaskStartTimes,
    gameState.setPausedTasks
  ]);

  // Wrapper for task completion that also refreshes next card
  const handleTaskCompleteWithCardRefresh = async (taskId: string) => {
    await progressManager.handleTaskComplete(taskId);
    // Refresh the next reward card after completion
    await loadNextRewardCard();
  };

  // Wrapper for made progress that also refreshes next card
  const handleMadeProgressWithCardRefresh = async (taskId: string) => {
    await progressManager.handleMadeProgress(taskId);
    // Refresh the next reward card after made progress
    await loadNextRewardCard();
  };

  // Task Progress Manager
  const progressManager = useTaskProgressManager({
    tasks,
    timerRef: gameState.timerRef,
    taskStartTimes: gameState.taskStartTimes,
    pausedTasks: gameState.pausedTasks,
    lastCompletedTask: gameState.lastCompletedTask,
    currentViewingIndex: gameState.currentViewingIndex,
    activeCommittedIndex: gameState.activeCommittedIndex,
    sunsetImages,
    nextRewardCard,
    setFlowProgress: gameState.setFlowProgress,
    setHasCommittedToTask: gameState.setHasCommittedToTask,
    setIsInitialLoad: gameState.setIsInitialLoad,
    setCompletedTasks: gameState.setCompletedTasks,
    setLastCompletedTask: gameState.setLastCompletedTask,
    setTodaysCompletedTasks: gameState.setTodaysCompletedTasks,
    setPausedTasks: gameState.setPausedTasks,
    setTaskStartTimes: gameState.setTaskStartTimes,
    setActiveCommittedIndex: gameState.setActiveCommittedIndex,
    setFlowStartTime: gameState.setFlowStartTime,
    onTaskComplete
  });

  // Navigation Manager
  const navigationManager = useTaskNavigationManager({
    tasks,
    currentViewingIndex: gameState.currentViewingIndex,
    activeCommittedIndex: gameState.activeCommittedIndex,
    hasCommittedToTask: gameState.hasCommittedToTask,
    completedTasks: gameState.completedTasks,
    swiperRef: gameState.swiperRef,
    setCurrentViewingIndex: gameState.setCurrentViewingIndex,
    setShowTaskList: gameState.setShowTaskList,
    onCommitToCurrentTask: handleCommitToCurrentTask,
    onTaskComplete: handleTaskCompleteWithCardRefresh
  });

  // Essential effect for task loading (moved from TaskTimerManager)
  useEffect(() => {
    // Essential useEffect that app depends on for proper task loading
    // (removed 20-minute timer logic but kept dependency structure)
    
    return () => {
      if (gameState.timerRef.current) clearInterval(gameState.timerRef.current);
    };
  }, [gameState.flowStartTime, gameState.hasCommittedToTask, gameState.activeCommittedIndex, tasks, gameState.timerRef, gameState.setFlowProgress, gameState.setIsInitialLoad]);

  // Auto-activate first card on initial load (skip "Play Card" step)
  useEffect(() => {
    if (tasks.length > 0 && gameState.isInitialLoad && !gameState.hasCommittedToTask) {
      // Reset timers for new game session
      progressManager.resetGameSession();
      handleCommitToCurrentTask();
    }
  }, [tasks, gameState.isInitialLoad, gameState.hasCommittedToTask, handleCommitToCurrentTask, progressManager]);

  // Show loading state if tasks are being processed
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full px-4">
          <ShuffleAnimation
            isProcessing={isProcessing}
            onLoadingComplete={onLoadingComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Picture-in-Picture Manager */}
      <PictureInPictureManager
        tasks={tasks}
        onComplete={async (completedTasks) => {
          // Save time for incomplete tasks before finishing session
          const incompleteTasks = tasks
            .filter(task => !completedTasks.has(task.id))
            .map(task => task.id);
          
          if (incompleteTasks.length > 0) {
            await progressManager.saveTimeForIncompleteTasks(incompleteTasks);
          }
          
          // Reset timers for next session when game completes through PiP
          progressManager.resetGameSession();
          onComplete(completedTasks);
        }}
        onTaskComplete={handleTaskCompleteWithCardRefresh}
        onMadeProgress={handleMadeProgressWithCardRefresh}
        onPauseTask={progressManager.handlePauseTask}
        onCommitToCurrentTask={handleCommitToCurrentTask}
        onCarryOn={progressManager.handleCarryOn}
        onSkip={progressManager.handleSkip}
        onNotesChange={updateTaskNotes}
        onRefreshTasks={refreshTasksFromDB}
        nextRewardCard={nextRewardCard}
        isLoading={isLoading}
        isProcessing={isProcessing}
        onLoadingComplete={onLoadingComplete}
        gameState={gameState}
        pipManager={pipManager}
        progressManager={progressManager}
      />

      {/* Main Interface - Hide when PiP is active */}
      {!pipManager.isPiPActive && (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-full px-4">
            <div className="w-full animate-in fade-in-0 duration-500 ease-out">
              {/* Main Card Display */}
              <div className="relative">
                <TaskSwiper
                  ref={gameState.swiperRef}
                  tasks={tasks}
                  gameState={gameState}
                  rewardCards={rewardCards}
                  nextRewardCard={nextRewardCard}
                  onSlideChange={(activeIndex) => gameState.setCurrentViewingIndex(activeIndex)}
                  onCommit={handleCommitToCurrentTask}
                  onComplete={handleTaskCompleteWithCardRefresh}
                  onMadeProgress={handleMadeProgressWithCardRefresh}
                  onMoveOn={progressManager.handlePauseTask}
                  onCarryOn={progressManager.handleCarryOn}
                  onSkip={progressManager.handleSkip}
                  onBackToActive={navigationManager.handleBackToActiveCard}
                  onAddToCollection={progressManager.handleAddToCollectionDB}
                  onNotesChange={updateTaskNotes}
                  formatTime={formatTime}
                  progressManager={progressManager}
                />

                {/* Navigation Dots */}
                <NavigationDots
                  tasks={tasks}
                  currentViewingIndex={gameState.currentViewingIndex}
                  activeCommittedIndex={gameState.activeCommittedIndex}
                  hasCommittedToTask={gameState.hasCommittedToTask}
                  completedTasks={gameState.completedTasks}
                  pausedTasks={gameState.pausedTasks}
                />

                {/* Bottom Actions */}
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-4">
                  {/* What's Ahead Eye Icon */}
                  <Button
                    variant="ghost"
                    size="lg"
                    onMouseDown={() => setShowWhatsAhead(true)}
                    onMouseUp={() => setShowWhatsAhead(false)}
                    onTouchStart={() => setShowWhatsAhead(true)}
                    onTouchEnd={() => setShowWhatsAhead(false)}
                    className="bg-transparent hover:bg-blue-500 hover:text-white text-gray-400 border border-gray-600 transition-all duration-300 px-4"
                  >
                    <Eye className="h-5 w-5" />
                  </Button>
                  
                  {/* Finish Session */}
                  <Button 
                    onClick={async () => {
                      // Save time for incomplete tasks before finishing session
                      const incompleteTasks = tasks
                        .filter(task => !gameState.completedTasks.has(task.id))
                        .map(task => task.id);
                      
                      if (incompleteTasks.length > 0) {
                        await progressManager.saveTimeForIncompleteTasks(incompleteTasks);
                      }
                      
                      // Reset timers for next session
                      progressManager.resetGameSession();
                      onComplete(gameState.completedTasks);
                    }} 
                    size="lg" 
                    className="bg-transparent hover:bg-yellow-500 hover:text-white text-gray-400 border border-gray-600 transition-all duration-300 px-8"
                  >
                    Finish Session
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* What's Ahead Overlay */}
      <WhatsAheadOverlay 
        tasks={tasks}
        gameState={gameState}
        isVisible={showWhatsAhead}
        onClose={() => setShowWhatsAhead(false)}
      />
    </>
  );
};