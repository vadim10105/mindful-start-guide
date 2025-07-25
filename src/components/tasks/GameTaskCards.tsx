
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TodaysCollection } from "./TodaysCollection";
import { TaskSwiper } from "./TaskSwiper";
import { NavigationDots } from "./NavigationDots";
import { TaskListOverlay } from "./TaskListOverlay";
import { CharacterDisplay, useCharacterMessages } from "./CharacterMessages";
import { useGameState, TaskCardData, CompletedTask } from "./GameState";
import { useTaskTimer } from "./TaskTimer";
import { ShuffleAnimation } from "./ShuffleAnimation";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

interface GameTaskCardsProps {
  tasks: TaskCardData[];
  onComplete: () => void;
  onTaskComplete?: (taskId: string) => void;
  isLoading?: boolean;
  isProcessing?: boolean;
  onLoadingComplete?: () => void;
}

export const GameTaskCards = ({ tasks, onComplete, onTaskComplete, isLoading = false, isProcessing = false, onLoadingComplete }: GameTaskCardsProps) => {
  const gameState = useGameState(tasks);
  const characterMessages = useCharacterMessages();
  const { toast } = useToast();

  // Sunset images for card backs
  const sunsetImages = [
    'https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=600&fit=crop',
  ];

  // Timer hook
  useTaskTimer({
    flowStartTime: gameState.flowStartTime,
    hasCommittedToTask: gameState.hasCommittedToTask,
    navigationUnlocked: gameState.navigationUnlocked,
    activeCommittedIndex: gameState.activeCommittedIndex,
    tasks,
    timerRef: gameState.timerRef,
    setFlowProgress: gameState.setFlowProgress,
    setNavigationUnlocked: gameState.setNavigationUnlocked,
    setIsInitialLoad: gameState.setIsInitialLoad,
    onNavigationUnlock: characterMessages.showMessage
  });

  // Auto-activate first card on initial load (skip "Play Card" step)
  useEffect(() => {
    if (tasks.length > 0 && gameState.isInitialLoad && !gameState.hasCommittedToTask && !gameState.navigationUnlocked) {
      console.log('Auto-activating first card on initial load');
      handleCommitToCurrentTask();
    }
  }, [tasks, gameState.isInitialLoad, gameState.hasCommittedToTask, gameState.navigationUnlocked]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (gameState.swiperRef.current?.swiper) {
          e.preventDefault();
          if (e.key === 'ArrowLeft') {
            gameState.swiperRef.current.swiper.slidePrev();
          } else if (e.key === 'ArrowRight') {
            gameState.swiperRef.current.swiper.slideNext();
          }
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentTask = tasks[gameState.currentViewingIndex];
        if (!currentTask) return;
        
        if (gameState.isTaskCommitted && !gameState.completedTasks.has(currentTask.id)) {
          handleTaskComplete(currentTask.id);
        } else if (!gameState.hasCommittedToTask || gameState.currentViewingIndex !== gameState.activeCommittedIndex) {
          handleCommitToCurrentTask();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.currentViewingIndex, gameState.activeCommittedIndex, gameState.hasCommittedToTask, gameState.completedTasks, gameState.isNavigationLocked]);

  const handleCommitToCurrentTask = () => {
    const currentTask = tasks[gameState.currentViewingIndex];
    if (!currentTask) return;
    
    gameState.setHasCommittedToTask(true);
    gameState.setActiveCommittedIndex(gameState.currentViewingIndex);
    gameState.setFlowStartTime(Date.now());
    gameState.setFlowProgress(0);
    gameState.setNavigationUnlocked(false);
    
    gameState.setTaskStartTimes(prev => ({
      ...prev,
      [currentTask.id]: Date.now()
    }));
    
    const message = characterMessages.getRandomMessage(characterMessages.getCommitMessages(currentTask.title));
    characterMessages.showMessage(message);
  };

  const handleTaskComplete = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const startTime = gameState.taskStartTimes[taskId];
    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 60000) : 0;
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57']
    });

    if (gameState.timerRef.current) {
      clearInterval(gameState.timerRef.current);
    }
    gameState.setFlowProgress(0);
    gameState.setNavigationUnlocked(true);
    gameState.setHasCommittedToTask(false);
    gameState.setIsInitialLoad(false);
    
    gameState.setCompletedTasks(prev => new Set([...prev, taskId]));
    gameState.setLastCompletedTask({ id: taskId, title: task.title, timeSpent });
    
    // Immediately add to collection (UI state update)
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    const newCollectedTask: CompletedTask = {
      id: taskId,
      title: task.title,
      timeSpent: timeSpent,
      completedAt: new Date(),
      sunsetImageUrl: sunsetImages[taskIndex % sunsetImages.length]
    };
    gameState.setTodaysCompletedTasks(prev => [...prev, newCollectedTask]);
    
    // Handle database operations asynchronously (don't block UI)
    handleAddToCollectionDB();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tasks')
          .update({ 
            status: 'completed',
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

  const handleAddToCollectionDB = async () => {
    if (!gameState.lastCompletedTask) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tasks')
          .update({ collection_added_at: new Date().toISOString() })
          .eq('id', gameState.lastCompletedTask.id);

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

  const handleBackToActiveCard = () => {
    gameState.setCurrentViewingIndex(gameState.activeCommittedIndex);
  };

  const handleMoveOnForNow = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const startTime = gameState.taskStartTimes[taskId];
    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 60000) : 0;
    
    // Clear current timer
    if (gameState.timerRef.current) {
      clearInterval(gameState.timerRef.current);
    }
    gameState.setFlowProgress(0);
    
    // Mark current task as paused
    gameState.setPausedTasks(prev => new Map(prev.set(taskId, timeSpent)));
    
    // Find next available task
    const nextIndex = gameState.currentViewingIndex + 1;
    const hasNextTask = nextIndex < tasks.length;
    
    if (hasNextTask && !gameState.navigationUnlocked) {
      // Navigation still locked - auto-activate next card and restart timer
      console.log('Moving to next card during lock period - auto-activating');
      gameState.setCurrentViewingIndex(nextIndex);
      gameState.setActiveCommittedIndex(nextIndex);
      gameState.setHasCommittedToTask(true); // Ensure task is marked as committed
      
      // Restart timer for new card
      gameState.setFlowStartTime(Date.now());
      gameState.setTaskStartTimes(prev => ({
        ...prev,
        [tasks[nextIndex].id]: Date.now()
      }));
      
      // Navigate to next card
      if (gameState.swiperRef.current?.swiper) {
        gameState.swiperRef.current.swiper.slideNext();
      }
    } else {
      // Navigation unlocked OR no more tasks - just pause and unlock navigation
      gameState.setNavigationUnlocked(true);
      gameState.setIsInitialLoad(false);
      gameState.setHasCommittedToTask(false); // Reset commitment when navigation unlocks
      gameState.setFlowStartTime(null); // Clear flow timer
      
      if (hasNextTask) {
        // Navigate to next card but don't auto-activate it
        gameState.setCurrentViewingIndex(nextIndex);
        if (gameState.swiperRef.current?.swiper) {
          gameState.swiperRef.current.swiper.slideNext();
        }
      }
    }
    
    // Save pause state to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tasks')
          .update({ 
            status: 'paused',
            paused_at: new Date().toISOString(),
            time_spent_minutes: timeSpent
          })
          .eq('id', taskId);
      }
    } catch (error) {
      console.error('Error pausing task:', error);
    }
    
    // Show appropriate Mr Intent message
    if (hasNextTask && !gameState.navigationUnlocked) {
      const nextTask = tasks[nextIndex];
      const message = characterMessages.getRandomMessage(characterMessages.getMoveOnMessages(nextTask.title));
      characterMessages.showMessage(message);
    } else {
      const message = characterMessages.getRandomMessage(characterMessages.getPauseMessages(task.title));
      characterMessages.showMessage(message);
    }
  };

  const handleCarryOn = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const pausedTime = gameState.pausedTasks.get(taskId) || 0;
    
    gameState.setHasCommittedToTask(true);
    gameState.setActiveCommittedIndex(gameState.currentViewingIndex);
    gameState.setFlowStartTime(Date.now());
    gameState.setFlowProgress(0);
    gameState.setNavigationUnlocked(false);
    
    gameState.setTaskStartTimes(prev => ({
      ...prev,
      [taskId]: Date.now() - (pausedTime * 60000)
    }));
    
    gameState.setPausedTasks(prev => {
      const newMap = new Map(prev);
      newMap.delete(taskId);
      return newMap;
    });
    
    const message = characterMessages.getRandomMessage(characterMessages.getContinueMessages(task.title));
    characterMessages.showMessage(message);
  };

  const handleSkip = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    gameState.setPausedTasks(prev => {
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
    
    const message = characterMessages.getRandomMessage(characterMessages.getSkipMessages(task.title));
    characterMessages.showMessage(message);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handleSeeAheadPress = () => {
    gameState.setShowTaskList(true);
  };

  const handleSeeAheadRelease = () => {
    gameState.setShowTaskList(false);
  };

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
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full px-4">
        <div className="w-full animate-in fade-in-0 duration-500 ease-out">
          {/* Main Card Display */}
          <div className="relative">
            <TaskSwiper
              ref={gameState.swiperRef}
              tasks={tasks}
              currentViewingIndex={gameState.currentViewingIndex}
              activeCommittedIndex={gameState.activeCommittedIndex}
              hasCommittedToTask={gameState.hasCommittedToTask}
              completedTasks={gameState.completedTasks}
              pausedTasks={gameState.pausedTasks}
              isNavigationLocked={gameState.isNavigationLocked}
              flowProgress={gameState.flowProgress}
              sunsetImages={sunsetImages}
              taskStartTimes={gameState.taskStartTimes}
              navigationUnlocked={gameState.navigationUnlocked}
              onSlideChange={(activeIndex) => gameState.setCurrentViewingIndex(activeIndex)}
              onCommit={handleCommitToCurrentTask}
              onComplete={handleTaskComplete}
              onMoveOn={handleMoveOnForNow}
              onCarryOn={handleCarryOn}
              onSkip={handleSkip}
              onBackToActive={handleBackToActiveCard}
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
            {gameState.completedTasks.size === tasks.length && (
              <div className="text-center">
                <Button onClick={onComplete} size="lg" className="w-full max-w-xs">
                  Finish Session
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Collection */}
      <TodaysCollection 
        completedTasks={gameState.todaysCompletedTasks}
        isVisible={gameState.todaysCompletedTasks.length > 0}
      />

      {/* Task List Overlay */}
      <TaskListOverlay
        showTaskList={gameState.showTaskList}
        tasks={tasks}
        getTaskStatus={gameState.getTaskStatus}
        getTaskTimeSpent={gameState.getTaskTimeSpent}
        formatTime={formatTime}
        onSeeAheadPress={handleSeeAheadPress}
        onSeeAheadRelease={handleSeeAheadRelease}
      />

      {/* Mr Intent Character */}
      <CharacterDisplay
        showCharacter={characterMessages.showCharacter}
        characterMessage={characterMessages.characterMessage}
        onClose={() => characterMessages.setShowCharacter(false)}
      />

    </div>
  );
};
