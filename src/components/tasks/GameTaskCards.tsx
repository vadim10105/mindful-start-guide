
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TodaysCollection } from "./TodaysCollection";
import { TaskSwiper } from "./TaskSwiper";
import { NavigationDots } from "./NavigationDots";
import { TaskListOverlay } from "./TaskListOverlay";
import { CharacterDisplay, useCharacterMessages } from "./CharacterMessages";
import { useGameState, TaskCardData, CompletedTask } from "./GameState";
import { useTaskTimer } from "./TaskTimer";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

interface GameTaskCardsProps {
  tasks: TaskCardData[];
  onComplete: () => void;
  onTaskComplete?: (taskId: string) => void;
}

export const GameTaskCards = ({ tasks, onComplete, onTaskComplete }: GameTaskCardsProps) => {
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (!gameState.isNavigationLocked && gameState.swiperRef.current?.swiper) {
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

  const handleAddToCollection = async () => {
    if (!gameState.lastCompletedTask) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tasks')
          .update({ collection_added_at: new Date().toISOString() })
          .eq('id', gameState.lastCompletedTask.id);

        const newCollectedTask: CompletedTask = {
          id: gameState.lastCompletedTask.id,
          title: gameState.lastCompletedTask.title,
          timeSpent: gameState.lastCompletedTask.timeSpent,
          completedAt: new Date(),
          sunsetImageUrl: sunsetImages[Math.floor(Math.random() * sunsetImages.length)]
        };
        
        gameState.setTodaysCompletedTasks(prev => [...prev, newCollectedTask]);

        await supabase.rpc('update_daily_stats', {
          p_user_id: user.id,
          p_date: new Date().toISOString().split('T')[0],
          p_cards_collected: 1
        });

        toast({
          title: "Card Added to Collection!",
          description: "Your sunset card has been saved to your collection.",
        });
      }
    } catch (error) {
      console.error('Error adding to collection:', error);
      toast({
        title: "Error",
        description: "Failed to add card to collection",
        variant: "destructive",
      });
    }
    
    // Move to next task after adding to collection
    const nextIndex = gameState.currentViewingIndex + 1;
    
    if (nextIndex < tasks.length) {
      gameState.setCurrentViewingIndex(nextIndex);
      gameState.setActiveCommittedIndex(nextIndex);
      gameState.setHasCommittedToTask(false);
      gameState.setNavigationUnlocked(false);
      gameState.setFlowStartTime(null);
      gameState.setFlowProgress(0);
      
      const nextTask = tasks[nextIndex];
      const message = characterMessages.getRandomMessage(characterMessages.getNewCardMessages(nextTask?.title || ''));
      characterMessages.showMessage(message);
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
    
    if (gameState.timerRef.current) {
      clearInterval(gameState.timerRef.current);
    }
    gameState.setFlowProgress(0);
    gameState.setNavigationUnlocked(true);
    gameState.setIsInitialLoad(false);
    
    gameState.setPausedTasks(prev => new Map(prev.set(taskId, timeSpent)));
    
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
    
    const nextTask = tasks.find((t, index) => 
      index > gameState.currentViewingIndex && 
      !gameState.completedTasks.has(t.id) && 
      !gameState.pausedTasks.has(t.id)
    );

    if (nextTask) {
      const nextIndex = tasks.indexOf(nextTask);
      gameState.setCurrentViewingIndex(nextIndex);
      gameState.setActiveCommittedIndex(nextIndex);
      gameState.setHasCommittedToTask(false);
      gameState.setNavigationUnlocked(true);
      gameState.setFlowStartTime(null);
      
      const message = characterMessages.getRandomMessage(characterMessages.getMoveOnMessages(nextTask.title));
      characterMessages.showMessage(message);
    } else {
      gameState.setHasCommittedToTask(false);
      gameState.setNavigationUnlocked(false);
      gameState.setFlowStartTime(null);
      
      const message = characterMessages.getRandomMessage(characterMessages.getPauseMessages(task.title));
      characterMessages.showMessage(message);
    }
    
    toast({
      title: "Task Paused", 
      description: nextTask ? `Moving on to "${nextTask.title}"` : `You can continue "${task.title}" later or skip it entirely.`,
    });
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
    
    toast({
      title: "Task Skipped",
      description: `"${task.title}" has been removed from your list.`,
    });
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full px-4">
        <div className="w-full">
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
              navigationUnlocked={gameState.navigationUnlocked}
              onSlideChange={(activeIndex) => gameState.setCurrentViewingIndex(activeIndex)}
              onCommit={handleCommitToCurrentTask}
              onComplete={handleTaskComplete}
              onMoveOn={handleMoveOnForNow}
              onCarryOn={handleCarryOn}
              onSkip={handleSkip}
              onBackToActive={handleBackToActiveCard}
              onAddToCollection={handleAddToCollection}
              formatTime={formatTime}
            />

            {/* Navigation Status */}
            <div className="text-center mb-6">
              <div className="text-sm text-muted-foreground">
                {gameState.isNavigationLocked ? (
                  gameState.hasCommittedToTask ? (
                    (() => {
                      const minutesRemaining = Math.max(0, Math.ceil((5 * 60 * 1000 - (Date.now() - (gameState.flowStartTime || 0))) / 60000));
                      const hasTimeElapsed = gameState.flowStartTime && (Date.now() - gameState.flowStartTime) >= 5 * 60 * 1000;
                      
                      if (hasTimeElapsed || minutesRemaining === 0) {
                        return "Swipe, use arrow keys (←/→), or press ↓ to commit";
                      }
                      return `Navigation unlocks in ${minutesRemaining} minutes. Focus first, swipe later.`;
                    })()
                  ) : (
                    "Start your focus session by playing this card."
                  )
                ) : (
                  "Swipe, use arrow keys (←/→), or press ↓ to commit"
                )}
              </div>
            </div>

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
