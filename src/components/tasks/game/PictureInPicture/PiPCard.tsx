import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { TaskCard } from "../TaskCard";
import { TaskActions } from "../TaskActions";
import { TaskProgressManagerHook } from "../TaskProgressManager";
import { TaskCardData, CompletedTask, GameStateType } from "../GameState";
import { useTaskTimer } from "../TaskTimer";
import { ShuffleAnimation } from "../ShuffleAnimation";
import { getRewardCardData, RewardCardData } from "@/services/cardService";


interface PiPCardProps {
  tasks: TaskCardData[];
  onComplete: () => void;
  onTaskComplete?: (taskId: string) => Promise<void>;
  onMadeProgress?: (taskId: string) => Promise<void>;
  onPauseTask?: (taskId: string) => Promise<void>;
  onCommitToCurrentTask?: () => void;
  onCarryOn?: (taskId: string) => void;
  onSkip?: (taskId: string) => Promise<void>;
  onNotesChange?: (taskId: string, notes: string) => void;
  onRefreshTasks?: () => Promise<void>;
  nextRewardCard: {
    card: any;
    cardId: string;
    cardNumber: number;
    collectionId: string;
  } | null;
  isLoading?: boolean;
  isProcessing?: boolean;
  onLoadingComplete?: () => void;
  pipWindow?: Window;
  initialCardIndex?: number;
  gameState: GameStateType;
  progressManager: TaskProgressManagerHook;
}

export const PiPCard = ({ 
  tasks, 
  onComplete, 
  onTaskComplete, 
  onMadeProgress,
  onPauseTask,
  onCommitToCurrentTask,
  onCarryOn,
  onSkip,
  onNotesChange,
  onRefreshTasks,
  nextRewardCard,
  isLoading = false, 
  isProcessing = false, 
  onLoadingComplete,
  pipWindow,
  initialCardIndex = 0,
  gameState,
  progressManager
}: PiPCardProps) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Drag state
  const isDragging = useRef(false);
  const startX = useRef(0);
  const dragThreshold = 30; // pixels - reduced for easier swiping

  // Reward card data from Supabase
  const [rewardCards, setRewardCards] = useState<RewardCardData[]>([]);

  useEffect(() => {
    const loadRewardCards = async () => {
      const cardData = await getRewardCardData();
      setRewardCards(cardData);
    };
    loadRewardCards();
  }, []);

  // Fade in effect when component mounts and is not loading
  useEffect(() => {
    if (!isLoading) {
      // Small delay to allow DOM to settle, then fade in
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isLoading]);

  const sunsetImages = rewardCards.map(card => card.imageUrl);

  // PiP always uses currentViewingIndex for free navigation
  const currentCardIndex = gameState.currentViewingIndex;

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
    // Allow going one beyond the last task for summary card
    if (currentCardIndex < tasks.length) {
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
    console.log('PiP drag ended:', { deltaX, threshold: dragThreshold });
    
    if (Math.abs(deltaX) > dragThreshold) {
      if (deltaX > 0) {
        // Dragged right - go to previous card
        console.log('PiP swiping to previous card');
        goToPreviousCard();
      } else {
        // Dragged left - go to next card
        console.log('PiP swiping to next card');
        goToNextCard();
      }
    }
    
    isDragging.current = false;
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't interfere with input elements or buttons
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true' || target.tagName === 'BUTTON' || target.closest('button'))) {
      return;
    }
    
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Don't interfere with input elements or buttons
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true' || target.tagName === 'BUTTON' || target.closest('button'))) {
      return;
    }
    
    handleDragEnd(e.clientX);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't interfere with input elements or buttons
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true' || target.tagName === 'BUTTON' || target.closest('button'))) {
      return;
    }
    
    const touch = e.touches[0];
    handleDragStart(touch.clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Don't interfere with input elements or buttons
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true' || target.tagName === 'BUTTON' || target.closest('button'))) {
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
    // Expand PiP window back to full size on completion
    if (pipWindow && !pipWindow.closed) {
      try {
        pipWindow.resizeTo(368, 514);
      } catch (error) {
        console.warn('Failed to resize PiP window on completion:', error);
      }
    }
    await onTaskComplete?.(taskId);
  };

  const handleMadeProgressWrapper = async (taskId: string) => {
    // Expand PiP window back to full size on progress
    if (pipWindow && !pipWindow.closed) {
      try {
        pipWindow.resizeTo(368, 514);
      } catch (error) {
        console.warn('Failed to resize PiP window on progress:', error);
      }
    }
    await onMadeProgress?.(taskId);
  };

  const handleBreakdown = (taskId: string) => {
    // Expand PiP window back to full size on breakdown
    if (pipWindow && !pipWindow.closed) {
      try {
        pipWindow.resizeTo(368, 514);
      } catch (error) {
        console.warn('Failed to resize PiP window on breakdown:', error);
      }
    }
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

  const calculateSessionStats = () => {
    const completedCount = Array.from(gameState.completedTasks).length;
    const progressedCount = gameState.todaysCompletedTasks.filter(task => 
      !gameState.completedTasks.has(task.id) && gameState.taskStartTimes[task.id]
    ).length;
    
    // Calculate total focus time from database time_spent_minutes
    const totalFocusMinutes = tasks.reduce((total, task) => {
      // Use database stored time if available
      if (task.time_spent_minutes) {
        return total + task.time_spent_minutes;
      }
      
      // Fallback for active tasks not yet saved to database
      const startTime = gameState.taskStartTimes[task.id];
      if (startTime && !gameState.pausedTasks.has(task.id)) {
        const activeTime = Math.round((Date.now() - startTime) / 60000);
        return total + activeTime;
      }
      
      return total;
    }, 0);

    return {
      completedCount,
      progressedCount,
      totalFocusTime: formatTime(totalFocusMinutes)
    };
  };


  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <ShuffleAnimation
          isProcessing={isProcessing}
          onLoadingComplete={onLoadingComplete}
          isPiP={true}
        />
      </div>
    );
  }


  // Check if we're showing the summary card (beyond last task)
  const showingSummaryCard = currentCardIndex >= tasks.length;
  const currentTask = tasks[currentCardIndex];
  
  if (showingSummaryCard) {
    const stats = calculateSessionStats();
    return (
      <div 
        className={`relative w-full h-full flex flex-col transition-all duration-700 ease-out ${
          isTransitioning ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
        } ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Match the same transition structure as TaskCard */}
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
            <div className="w-full h-full bg-[hsl(48_20%_97%)] rounded-2xl shadow-xl border-2 border-transparent p-6 flex flex-col justify-center items-center text-center">
              <h2 className="text-2xl font-bold text-[hsl(220_10%_20%)] mb-6">Session Complete!</h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center px-4 py-2 bg-green-100 rounded-lg">
                  <span className="text-[hsl(220_10%_30%)] font-medium">Completed Tasks:</span>
                  <span className="text-green-600 font-bold text-lg">{stats.completedCount}</span>
                </div>
                
                <div className="flex justify-between items-center px-4 py-2 bg-blue-100 rounded-lg">
                  <span className="text-[hsl(220_10%_30%)] font-medium">Progressed Tasks:</span>
                  <span className="text-blue-600 font-bold text-lg">{stats.progressedCount}</span>
                </div>
                
                <div className="flex justify-between items-center px-4 py-2 bg-purple-100 rounded-lg">
                  <span className="text-[hsl(220_10%_30%)] font-medium">Focus Time:</span>
                  <span className="text-purple-600 font-bold text-lg">{stats.totalFocusTime}</span>
                </div>
              </div>
              
              <button
                onClick={() => {
                  // Close the Picture-in-Picture window programmatically
                  // The "pagehide" event will fire normally
                  if (pipWindow && !pipWindow.closed) {
                    pipWindow.close();
                  }
                  onComplete();
                }}
                className="bg-[hsl(220_10%_20%)] hover:bg-[hsl(220_10%_30%)] text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                Finish Session
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
      className={`relative w-full h-full flex flex-col transition-all duration-700 ease-out ${
        isTransitioning ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      } ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
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
          isCurrentTask={currentCardIndex === gameState.currentViewingIndex}
          activeCommittedIndex={gameState.activeCommittedIndex}
          flowProgress={gameState.flowProgress}
          sunsetImageUrl={(() => {
            if (gameState.completedTasks.has(currentTask.id)) {
              // For completed tasks, use their earned card from todaysCompletedTasks
              const completedTask = gameState.todaysCompletedTasks.find(t => t.id === currentTask.id);
              return completedTask?.sunsetImageUrl || "";
            }
            // For incomplete tasks, show next reward preview
            return nextRewardCard?.card.imageUrl || "";
          })()}
          attribution={(() => {
            if (gameState.completedTasks.has(currentTask.id)) {
              // For completed tasks, get metadata from their earned card
              const completedTask = gameState.todaysCompletedTasks.find(t => t.id === currentTask.id);
              return completedTask?.attribution || "";
            }
            // For incomplete tasks, show nothing
            return "";
          })()}
          attributionUrl={(() => {
            if (gameState.completedTasks.has(currentTask.id)) {
              const completedTask = gameState.todaysCompletedTasks.find(t => t.id === currentTask.id);
              return completedTask?.attributionUrl || "";
            }
            return "";
          })()}
          description={(() => {
            if (gameState.completedTasks.has(currentTask.id)) {
              const completedTask = gameState.todaysCompletedTasks.find(t => t.id === currentTask.id);
              return completedTask?.description || "";
            }
            return "";
          })()}
          caption={(() => {
            if (gameState.completedTasks.has(currentTask.id)) {
              const completedTask = gameState.todaysCompletedTasks.find(t => t.id === currentTask.id);
              return completedTask?.caption || "";
            }
            return "";
          })()}
          cardNumber={(() => {
            if (gameState.completedTasks.has(currentTask.id)) {
              const completedTask = gameState.todaysCompletedTasks.find(t => t.id === currentTask.id);
              return completedTask?.cardNumber;
            }
            return nextRewardCard?.card.cardNumber;
          })()}
          taskStartTimes={gameState.taskStartTimes}
          onCommit={handleCommitToCurrentTask}
          onComplete={handleTaskComplete}
          onMadeProgress={handleMadeProgressWrapper}
          onMoveOn={handlePauseTask}
          onCarryOn={handleCarryOn}
          onSkip={handleSkip}
          onBackToActive={handleBackToActiveCard}
          onNotesChange={onNotesChange}
          onBreakdown={handleBreakdown}
          navigationUnlocked={gameState.navigationUnlocked}
          formatTime={formatTime}
          progressManager={progressManager}
          hideTaskActions={false}
          pipWindow={pipWindow}
        />
        </div>
      </div>


    </div>
  );
};