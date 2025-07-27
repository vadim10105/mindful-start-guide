import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { TaskCard } from "../TaskCard";
import { TaskCardData, CompletedTask, GameStateType } from "../GameState";
import { useTaskTimer } from "../TaskTimer";
import { ShuffleAnimation } from "../ShuffleAnimation";

import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";

interface PiPCardProps {
  tasks: TaskCardData[];
  onComplete: () => void;
  onTaskComplete?: (taskId: string) => void;
  isLoading?: boolean;
  isProcessing?: boolean;
  onLoadingComplete?: () => void;
  pipWindow?: Window;
  initialCardIndex?: number;
  gameState: GameStateType;
}

export const PiPCard = ({ 
  tasks, 
  onComplete, 
  onTaskComplete, 
  isLoading = false, 
  isProcessing = false, 
  onLoadingComplete,
  pipWindow,
  initialCardIndex = 0,
  gameState
}: PiPCardProps) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | null>(null);
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  
  // Drag state
  const isDragging = useRef(false);
  const startX = useRef(0);
  const dragThreshold = 50; // pixels

  // Sunset images for card backs
  const sunsetImages = [
    'https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=600&fit=crop',
  ];

  // Show active committed task if there is one, otherwise show current viewing index
  const currentCardIndex = gameState.hasCommittedToTask && gameState.activeCommittedIndex >= 0 
    ? gameState.activeCommittedIndex 
    : gameState.currentViewingIndex;

  // Focus the PiP window to receive keyboard events
  useEffect(() => {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.focus();
      // Also focus the document body to ensure keyboard events work
      pipWindow.document.body.focus();
      pipWindow.document.body.tabIndex = 0;
    }
  }, [pipWindow]);

  // Disable timer in PiP to prevent conflicts - main window handles timing
  // Timer is handled by main window only to prevent sync issues

  // No need for separate sync - PiP uses main window state directly

  // Use main window navigation
  const goToPreviousCard = useCallback(() => {
    if (currentCardIndex > 0) {
      gameState.setCurrentViewingIndex(currentCardIndex - 1);
    }
  }, [currentCardIndex, gameState.setCurrentViewingIndex]);

  const goToNextCard = useCallback(() => {
    if (currentCardIndex < tasks.length - 1) {
      gameState.setCurrentViewingIndex(currentCardIndex + 1);
    }
  }, [currentCardIndex, tasks.length, gameState.setCurrentViewingIndex]);

  // Drag handlers
  const handleDragStart = (clientX: number) => {
    if (isTransitioning) return;
    isDragging.current = true;
    startX.current = clientX;
  };

  const handleDragEnd = (clientX: number) => {
    if (!isDragging.current || isTransitioning) return;
    
    const deltaX = clientX - startX.current;
    
    if (Math.abs(deltaX) > dragThreshold) {
      if (deltaX > 0) {
        // Dragged right - go to previous card
        goToPreviousCard();
      } else {
        // Dragged left - go to next card
        goToNextCard();
      }
    }
    
    isDragging.current = false;
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    handleDragEnd(e.clientX);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    handleDragEnd(touch.clientX);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPreviousCard();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextCard();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentTask = tasks[currentCardIndex];
        if (!currentTask) return;
        
        if (gameState.isTaskCommitted && !gameState.completedTasks.has(currentTask.id)) {
          handleTaskComplete(currentTask.id);
        } else if (!gameState.hasCommittedToTask || currentCardIndex !== gameState.activeCommittedIndex) {
          handleCommitToCurrentTask();
        }
      }
    };

    const targetWindow = pipWindow || window;
    targetWindow.addEventListener('keydown', handleKeyDown);
    return () => targetWindow.removeEventListener('keydown', handleKeyDown);
  }, [currentCardIndex, gameState.activeCommittedIndex, gameState.hasCommittedToTask, gameState.completedTasks, pipWindow, goToPreviousCard, goToNextCard]);


  // Use main window's commit logic - just add action protection
  const handleCommitToCurrentTask = () => {
    if (isActionInProgress) return;
    setIsActionInProgress(true);
    
    const currentTask = tasks[currentCardIndex];
    if (!currentTask) {
      setIsActionInProgress(false);
      return;
    }
    
    // Check if this task was previously paused
    const pausedTime = gameState.pausedTasks.get(currentTask.id) || 0;
    const isResumingPausedTask = pausedTime > 0;
    
    gameState.setHasCommittedToTask(true);
    gameState.setActiveCommittedIndex(currentCardIndex);
    gameState.setFlowStartTime(Date.now());
    gameState.setFlowProgress(0);
    gameState.setNavigationUnlocked(false);
    
    if (isResumingPausedTask) {
      const adjustedStartTime = Date.now() - (pausedTime * 60000);
      gameState.setTaskStartTimes(prev => ({
        ...prev,
        [currentTask.id]: adjustedStartTime
      }));
      gameState.setPausedTasks(prev => {
        const newMap = new Map(prev);
        newMap.delete(currentTask.id);
        return newMap;
      });
    } else {
      gameState.setTaskStartTimes(prev => ({
        ...prev,
        [currentTask.id]: Date.now()
      }));
    }
    
    setTimeout(() => setIsActionInProgress(false), 100);
  };

  const handleTaskComplete = async (taskId: string) => {
    if (isActionInProgress) return;
    setIsActionInProgress(true);
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      setIsActionInProgress(false);
      return;
    }

    const startTime = gameState.taskStartTimes[taskId];
    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 60000) : 0;
    
    // Target confetti to the PiP window if available
    const confettiConfig = {
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57']
    };
    
    if (pipWindow && pipWindow.document) {
      const canvas = pipWindow.document.createElement('canvas');
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '9999';
      pipWindow.document.body.appendChild(canvas);
      
      confetti({
        ...confettiConfig,
        canvas
      });
      
      setTimeout(() => {
        if (canvas && canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      }, 3000);
    } else {
      confetti(confettiConfig);
    }

    if (gameState.timerRef.current) {
      clearInterval(gameState.timerRef.current);
    }
    gameState.setFlowProgress(0);
    gameState.setNavigationUnlocked(true);
    gameState.setHasCommittedToTask(false);
    gameState.setIsInitialLoad(false);
    
    gameState.setCompletedTasks(prev => new Set([...prev, taskId]));
    gameState.setLastCompletedTask({ id: taskId, title: task.title, timeSpent });
    
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    const newCompletedTask: CompletedTask = {
      id: taskId,
      title: task.title,
      timeSpent: timeSpent,
      completedAt: new Date(),
      sunsetImageUrl: sunsetImages[taskIndex % sunsetImages.length]
    };
    gameState.setTodaysCompletedTasks(prev => [...prev, newCompletedTask]);
    
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
    setTimeout(() => setIsActionInProgress(false), 500);
  };

  const handlePauseTask = async (taskId: string) => {
    if (isActionInProgress) return;
    setIsActionInProgress(true);
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      setIsActionInProgress(false);
      return;
    }

    const startTime = gameState.taskStartTimes[taskId];
    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 60000) : 0;
    
    if (gameState.timerRef.current) {
      clearInterval(gameState.timerRef.current);
    }
    gameState.setFlowProgress(0);
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
    
    // Release commitment - allow user to choose next task manually
    gameState.setHasCommittedToTask(false);
    gameState.setActiveCommittedIndex(-1);
    gameState.setNavigationUnlocked(true);
    setTimeout(() => setIsActionInProgress(false), 500);
  };

  // Simplified carry on - navigate to task and use main commit logic
  const handleCarryOn = (taskId: string) => {
    if (isActionInProgress) return;
    setIsActionInProgress(true);
    
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      setIsActionInProgress(false);
      return;
    }
    
    // Navigate to the task first
    gameState.setCurrentViewingIndex(taskIndex);
    
    // Then commit to it (this will handle paused time correctly)
    setTimeout(() => {
      handleCommitToCurrentTask();
      setIsActionInProgress(false);
    }, 50);
  };

  const handleSkip = async (taskId: string) => {
    if (isActionInProgress) return;
    setIsActionInProgress(true);
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      setIsActionInProgress(false);
      return;
    }

    const startTime = gameState.taskStartTimes[taskId];
    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 60000) : 0;
    
    if (gameState.timerRef.current) {
      clearInterval(gameState.timerRef.current);
    }
    gameState.setFlowProgress(0);
    gameState.setNavigationUnlocked(true);
    gameState.setHasCommittedToTask(false);
    gameState.setIsInitialLoad(false);
    
    gameState.setCompletedTasks(prev => new Set([...prev, taskId]));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tasks')
          .update({ 
            status: 'skipped',
            skipped_at: new Date().toISOString(),
            time_spent_minutes: timeSpent
          })
          .eq('id', taskId);
      }
    } catch (error) {
      console.error('Error skipping task:', error);
    }
    
    // Auto-move to next card if available
    if (currentCardIndex < tasks.length - 1) {
      gameState.setCurrentViewingIndex(currentCardIndex + 1);
    }
    setTimeout(() => setIsActionInProgress(false), 500);
  };

  const handleBackToActiveCard = () => {
    if (gameState.activeCommittedIndex >= 0 && gameState.activeCommittedIndex < tasks.length) {
      gameState.setCurrentViewingIndex(gameState.activeCommittedIndex);
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <ShuffleAnimation
          isProcessing={isProcessing}
          onLoadingComplete={onLoadingComplete}
        />
      </div>
    );
  }


  const currentTask = tasks[currentCardIndex];
  if (!currentTask) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-card text-card-foreground">
        <p>No task available (Index: {currentCardIndex}, Total: {tasks.length})</p>
        <br />
        <p>Available tasks: {tasks.map(t => t.title).join(', ')}</p>
      </div>
    );
  }

  return (
    <div 
      className={`relative w-full h-full flex flex-col ${
        isTransitioning ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* The actual task card - full height with transition effects */}
      <div 
        className={`w-full flex-1 transition-all duration-300 ease-out ${
          isTransitioning 
            ? transitionDirection === 'left' 
              ? 'transform -translate-x-2 scale-95 opacity-80' 
              : 'transform translate-x-2 scale-95 opacity-80'
            : 'transform translate-x-0 scale-100 opacity-100'
        }`}
        style={{
          transformStyle: 'preserve-3d',
          perspective: '1000px'
        }}
      >
        <div 
          className={`w-full h-full transition-transform duration-300 ease-out ${
            isTransitioning 
              ? transitionDirection === 'left'
                ? 'transform rotateY(-5deg) translateZ(-20px)'
                : 'transform rotateY(5deg) translateZ(-20px)'
              : 'transform rotateY(0deg) translateZ(0px)'
          }`}
        >
          <TaskCard
          task={currentTask}
          index={currentCardIndex}
          totalTasks={tasks.length}
          isCompleted={gameState.completedTasks.has(currentTask.id)}
          isPaused={gameState.pausedTasks.has(currentTask.id)}
          pausedTime={gameState.pausedTasks.get(currentTask.id) || 0}
          isActiveCommitted={currentCardIndex === gameState.activeCommittedIndex}
          hasCommittedToTask={gameState.hasCommittedToTask}
          isCurrentTask={true}
          activeCommittedIndex={gameState.activeCommittedIndex}
          flowProgress={gameState.flowProgress}
          sunsetImageUrl={sunsetImages[currentCardIndex % sunsetImages.length]}
          taskStartTimes={gameState.taskStartTimes}
          onCommit={handleCommitToCurrentTask}
          onComplete={handleTaskComplete}
          onMoveOn={handlePauseTask}
          onCarryOn={handleCarryOn}
          onSkip={handleSkip}
          onBackToActive={handleBackToActiveCard}
          navigationUnlocked={gameState.navigationUnlocked}
          formatTime={formatTime}
        />
        </div>
      </div>

      {/* Completion button */}
      {gameState.completedTasks.size === tasks.length && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <Button onClick={onComplete} size="sm">
            Finish Session
          </Button>
        </div>
      )}
    </div>
  );
};