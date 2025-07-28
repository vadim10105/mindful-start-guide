import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { TaskCard } from "../TaskCard";
import { TaskCardData, CompletedTask, GameStateType } from "../GameState";
import { useTaskTimer } from "../TaskTimer";
import { ShuffleAnimation } from "../ShuffleAnimation";


interface PiPCardProps {
  tasks: TaskCardData[];
  onComplete: () => void;
  onTaskComplete?: (taskId: string) => Promise<void>;
  onPauseTask?: (taskId: string) => Promise<void>;
  onCommitToCurrentTask?: () => void;
  onCarryOn?: (taskId: string) => void;
  onSkip?: (taskId: string) => Promise<void>;
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
  onPauseTask,
  onCommitToCurrentTask,
  onCarryOn,
  onSkip,
  isLoading = false, 
  isProcessing = false, 
  onLoadingComplete,
  pipWindow,
  initialCardIndex = 0,
  gameState
}: PiPCardProps) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | null>(null);
  
  // Drag state
  const isDragging = useRef(false);
  const startX = useRef(0);
  const dragThreshold = 50; // pixels

  // Sunset images for card backs
  const sunsetImages = [
    '/reward-1.jpg',
    '/reward-2.jpeg',
    '/reward-3.jpeg',
    '/reward-4.jpeg',
  ];

  // Show active committed task if there is one, otherwise show current viewing index
  const currentCardIndex = gameState.hasCommittedToTask && gameState.activeCommittedIndex >= 0 
    ? gameState.activeCommittedIndex 
    : gameState.currentViewingIndex;

  // Focus the PiP window to receive keyboard events
  useEffect(() => {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.focus();
      // Set up the document to handle keyboard events but don't interfere with input focus
      pipWindow.document.body.tabIndex = -1; // Allow focus but not tab navigation
      
      // Ensure input elements can be focused properly
      const style = pipWindow.document.createElement('style');
      style.textContent = `
        input, textarea, [contenteditable] {
          -webkit-user-select: text !important;
          user-select: text !important;
          pointer-events: auto !important;
        }
      `;
      pipWindow.document.head.appendChild(style);
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
    // Don't interfere with input elements
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
      return;
    }
    
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Don't interfere with input elements
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
      return;
    }
    
    handleDragEnd(e.clientX);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't interfere with input elements
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
      return;
    }
    
    const touch = e.touches[0];
    handleDragStart(touch.clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Don't interfere with input elements
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
      return;
    }
    
    const touch = e.changedTouches[0];
    handleDragEnd(touch.clientX);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input elements
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
        return;
      }

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


  // Use main window handlers directly
  const handleCommitToCurrentTask = () => {
    onCommitToCurrentTask?.();
  };

  const handleTaskComplete = async (taskId: string) => {
    await onTaskComplete?.(taskId);
  };

  const handlePauseTask = async (taskId: string) => {
    await onPauseTask?.(taskId);
  };

  const handleCarryOn = (taskId: string) => {
    onCarryOn?.(taskId);
  };

  const handleSkip = async (taskId: string) => {
    await onSkip?.(taskId);
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