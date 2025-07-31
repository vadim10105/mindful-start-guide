import { useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { TodaysCollection } from "./TodaysCollection";
import { TaskSwiper } from "./TaskSwiper";
import { NavigationDots } from "./NavigationDots";
import { useGameState, TaskCardData } from "./GameState";
import { ShuffleAnimation } from "./ShuffleAnimation";

// New decomposed managers
import { useTaskTimerManager, useTaskTimerHelpers } from "./TaskTimerManager";
import { useTaskNavigationManager } from "./TaskNavigationManager";
import { useTaskProgressTracker } from "./TaskProgressTracker";
import { usePictureInPictureManager, PictureInPictureManager } from "./PictureInPictureManager";
import { getRewardCardData, RewardCardData } from "@/services/cardService";

// External dependencies
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const { formatTime } = useTaskTimerHelpers();

  // Function to update task notes
  const updateTaskNotes = useCallback((taskId: string, notes: string) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, notes }
          : task
      )
    );
  }, []);

  // Reward card data from Supabase
  const [rewardCards, setRewardCards] = useState<RewardCardData[]>([]);

  useEffect(() => {
    const loadRewardCards = async () => {
      const cardData = await getRewardCardData();
      setRewardCards(cardData);
    };
    loadRewardCards();
  }, []);

  const sunsetImages = rewardCards.map(card => card.imageUrl);

  // PiP Manager
  const pipManager = usePictureInPictureManager({
    tasks,
    isLoading,
    isProcessing
  });

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

  // Task Progress Tracker
  const progressTracker = useTaskProgressTracker({
    tasks,
    timerRef: gameState.timerRef,
    taskStartTimes: gameState.taskStartTimes,
    pausedTasks: gameState.pausedTasks,
    lastCompletedTask: gameState.lastCompletedTask,
    currentViewingIndex: gameState.currentViewingIndex,
    activeCommittedIndex: gameState.activeCommittedIndex,
    sunsetImages,
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
    onTaskComplete: progressTracker.handleTaskComplete
  });

  // Timer Manager
  useTaskTimerManager({
    flowStartTime: gameState.flowStartTime,
    hasCommittedToTask: gameState.hasCommittedToTask,
    activeCommittedIndex: gameState.activeCommittedIndex,
    tasks,
    timerRef: gameState.timerRef,
    setFlowProgress: gameState.setFlowProgress,
    setIsInitialLoad: gameState.setIsInitialLoad
  });

  // Auto-activate first card on initial load (skip "Play Card" step)
  useEffect(() => {
    if (tasks.length > 0 && gameState.isInitialLoad && !gameState.hasCommittedToTask) {
      console.log('Auto-activating first card on initial load');
      handleCommitToCurrentTask();
    }
  }, [tasks, gameState.isInitialLoad, gameState.hasCommittedToTask, handleCommitToCurrentTask]);

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
        onComplete={onComplete}
        onTaskComplete={progressTracker.handleTaskComplete}
        onMadeProgress={progressTracker.handleMadeProgress}
        onPauseTask={progressTracker.handlePauseTask}
        onCommitToCurrentTask={handleCommitToCurrentTask}
        onCarryOn={progressTracker.handleCarryOn}
        onSkip={progressTracker.handleSkip}
        onNotesChange={updateTaskNotes}
        isLoading={isLoading}
        isProcessing={isProcessing}
        onLoadingComplete={onLoadingComplete}
        gameState={gameState}
        pipManager={pipManager}
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
                  onSlideChange={(activeIndex) => gameState.setCurrentViewingIndex(activeIndex)}
                  onCommit={handleCommitToCurrentTask}
                  onComplete={progressTracker.handleTaskComplete}
                  onMadeProgress={progressTracker.handleMadeProgress}
                  onMoveOn={progressTracker.handlePauseTask}
                  onCarryOn={progressTracker.handleCarryOn}
                  onSkip={progressTracker.handleSkip}
                  onBackToActive={navigationManager.handleBackToActiveCard}
                  onAddToCollection={progressTracker.handleAddToCollectionDB}
                  onNotesChange={updateTaskNotes}
                  formatTime={formatTime}
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

                {/* Completion */}
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
                  <Button 
                    onClick={() => onComplete(gameState.completedTasks)} 
                    size="lg" 
                    className="w-full max-w-xs bg-transparent hover:bg-yellow-500 hover:text-white text-gray-400 border border-gray-600 transition-all duration-300"
                  >
                    Finish Session
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Collection */}
          <TodaysCollection 
            completedTasks={gameState.todaysCompletedTasks}
            isVisible={gameState.todaysCompletedTasks.length > 0}
          />


        </div>
      )}
    </>
  );
};