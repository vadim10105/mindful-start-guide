import { Button } from "@/components/ui/button";
import { Check, Play, Pause, SkipForward, RotateCcw, ArrowLeft, TrendingUp, Wand2, Minimize2, Loader2, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { taskTimers } from "./TaskProgressManager";

interface TaskCardData {
  id: string;
  title: string;
  priority_score: number;
  explanation: string;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
}

interface TaskActionsProps {
  task: TaskCardData;
  isCompleted: boolean;
  isPaused: boolean;
  pausedTime: number;
  isActiveCommitted: boolean;
  hasCommittedToTask: boolean;
  isCurrentTask: boolean;
  activeCommittedIndex: number;
  onCommit: () => void;
  onComplete: (taskId: string) => void;
  onMadeProgress: (taskId: string) => void;
  onMoveOn: (taskId: string) => void;
  onCarryOn: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  onBackToActive: () => void;
  onBreakdown?: () => void;
  onMinify?: () => void;
  isGenerating?: boolean;
  navigationUnlocked: boolean;
  formatTime: (minutes: number) => string;
  onPauseHover?: (isHovering: boolean) => void;
  onPlayHover?: (isHovering: boolean) => void;
  pipWindow?: Window;
  taskStartTimes?: Record<string, number>;
  hasAnyPausedTask?: boolean;
}

export const TaskActions = ({
  task,
  isCompleted,
  isPaused,
  pausedTime,
  isActiveCommitted,
  hasCommittedToTask,
  isCurrentTask,
  activeCommittedIndex,
  onCommit,
  onComplete,
  onMadeProgress,
  onMoveOn,
  onCarryOn,
  onSkip,
  onBackToActive,
  onBreakdown,
  onMinify,
  isGenerating = false,
  navigationUnlocked,
  formatTime,
  onPauseHover,
  onPlayHover,
  pipWindow,
  taskStartTimes = {},
  hasAnyPausedTask = false
}: TaskActionsProps) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isPlayButtonHovered, setIsPlayButtonHovered] = useState(false);

  // Initialize timer state for this task if it doesn't exist (like progress bar does)
  if (!taskTimers.has(task.id)) {
    taskTimers.set(task.id, {
      baseElapsedMs: 0,
      currentSessionStart: null,
      sessionStartElapsedMs: 0
    });
  }

  // Update timer like the progress bar does
  useEffect(() => {
    if (isActiveCommitted) {
      const timerState = taskTimers.get(task.id)!;
      // Start timer if not already started
      if (!timerState.currentSessionStart) {
        const now = Date.now();
        timerState.currentSessionStart = now;
        setCurrentTime(now);
      }
      
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isActiveCommitted, task.id]);

  if (isCompleted) {
    return null;
  }

  // Check if this paused card should show "Pause Card to View" instead of regular buttons
  if (!isActiveCommitted && hasCommittedToTask && activeCommittedIndex >= 0) {
    return (
      <div className="flex gap-2 justify-center">
        <button
          onClick={onBackToActive}
          className="group relative w-10 h-10 hover:w-auto rounded-full transition-all duration-500 ease-out flex items-center justify-center hover:justify-start hover:px-3 hover:gap-2 border border-gray-200/50 hover:border-gray-600/50 hover:bg-gray-600 hover:shadow-lg overflow-hidden"
          style={{ backgroundColor: 'transparent' }}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out" />
          <Pause className="w-4 h-4 flex-shrink-0 text-white group-hover:text-white transition-colors duration-300 relative z-10" />
          <span className="max-w-0 group-hover:max-w-[150px] overflow-hidden whitespace-nowrap text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out relative z-10">
            Pause Card to View
          </span>
        </button>
      </div>
    );
  }

  if (!isCurrentTask) {
    return (
      <div className="text-sm" style={{ color: 'hsl(220 10% 50%)' }}>
        Swipe to view this task
      </div>
    );
  }

  // Always show expandable action buttons for current task
  const handlePlayPause = () => {
    if (isPaused) {
      onCarryOn(task.id);
    } else if (isActiveCommitted) {
      onMoveOn(task.id);
    } else if (isCurrentTask && !hasCommittedToTask) {
      onCommit();
    }
  };

  // Get session elapsed time to determine play/pause icon
  const getSessionElapsedMs = () => {
    const timerState = taskTimers.get(task.id);
    if (!timerState) return 0;
    
    return timerState.currentSessionStart 
      ? (timerState.baseElapsedMs - timerState.sessionStartElapsedMs) + (currentTime - timerState.currentSessionStart)
      : (timerState.baseElapsedMs - timerState.sessionStartElapsedMs);
  };

  const sessionElapsedMs = getSessionElapsedMs();
  const shouldShowPlay = isPaused || !isActiveCommitted;

  // Format elapsed time for timer display in MM:SS
  const formatElapsedTime = (elapsedMs: number): string => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex gap-2 justify-center">
      {/* Play/Pause Button */}
      <button
        onClick={handlePlayPause}
        onMouseEnter={() => {
          if (shouldShowPlay) {
            onPlayHover?.(true);
          } else {
            onPauseHover?.(true);
          }
        }}
        onMouseLeave={() => {
          if (shouldShowPlay) {
            onPlayHover?.(false);
          } else {
            onPauseHover?.(false);
          }
        }}
        className="group relative w-10 h-10 hover:w-auto rounded-full transition-all duration-500 ease-out flex items-center justify-center hover:justify-start hover:px-3 hover:gap-2 border border-gray-200/50 hover:border-yellow-400/50 hover:bg-yellow-400 hover:shadow-lg overflow-hidden"
        style={{ 
          backgroundColor: isPaused ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
          backdropFilter: isPaused ? 'blur(10px)' : 'none'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/0 to-yellow-500/0 group-hover:from-yellow-400 group-hover:to-yellow-500 transition-all duration-500 ease-out opacity-90" />
        {shouldShowPlay ? (
          <Play className={`w-4 h-4 flex-shrink-0 ${isPaused ? 'text-white' : 'text-gray-600'} group-hover:text-white transition-colors duration-300 relative z-10`} />
        ) : (
          <Pause className={`w-4 h-4 flex-shrink-0 ${isPaused ? 'text-white' : 'text-gray-600'} group-hover:text-white transition-colors duration-300 relative z-10`} />
        )}
        <span className="max-w-0 group-hover:max-w-[100px] overflow-hidden whitespace-nowrap text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out relative z-10">
          {shouldShowPlay ? 'Start' : formatElapsedTime(sessionElapsedMs || 0)}
        </span>
      </button>

      {/* Made Progress Button - Hidden when paused or when there's any paused task */}
      {!isPaused && !hasAnyPausedTask && (
        <button
          onClick={() => onMadeProgress(task.id)}
          className="group relative w-10 h-10 hover:w-auto rounded-full transition-all duration-500 ease-out flex items-center justify-center hover:justify-start hover:px-3 hover:gap-2 border border-gray-200/50 hover:border-amber-400/50 hover:shadow-lg overflow-hidden"
          style={{ backgroundColor: 'transparent' }}
        >
          <div className="absolute inset-0 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out" />
          <TrendingUp className="w-4 h-4 flex-shrink-0 text-gray-600 group-hover:text-white transition-colors duration-300 relative z-10" />
          <span className="max-w-0 group-hover:max-w-[100px] overflow-hidden whitespace-nowrap text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out relative z-10">
            Progressed
          </span>
        </button>
      )}

      {/* Complete Button - Hidden when paused or when there's any paused task */}
      {!isPaused && !hasAnyPausedTask && (
        <button
          onClick={() => onComplete(task.id)}
          className="group relative w-10 h-10 hover:w-auto rounded-full transition-all duration-500 ease-out flex items-center justify-center hover:justify-start hover:px-3 hover:gap-2 border border-gray-200/50 hover:border-green-500/50 hover:shadow-lg overflow-hidden"
          style={{ backgroundColor: 'transparent' }}
        >
          <div className="absolute inset-0 bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out" />
          <Check className="w-4 h-4 flex-shrink-0 text-gray-600 group-hover:text-white transition-colors duration-300 relative z-10" />
          <span className="max-w-0 group-hover:max-w-[100px] overflow-hidden whitespace-nowrap text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out relative z-10">
            Complete
          </span>
        </button>
      )}

      {/* Break it down Button - Hidden when paused or when there's any paused task */}
      {!isPaused && !hasAnyPausedTask && (
        <button
          onClick={() => onBreakdown?.()}
          disabled={isGenerating}
          className="group relative w-10 h-10 hover:w-auto rounded-full transition-all duration-500 ease-out flex items-center justify-center hover:justify-start hover:px-3 hover:gap-2 border border-gray-200/50 hover:border-purple-500/50 hover:shadow-lg overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'transparent' }}
        >
          <div className="absolute inset-0 bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out" />
          {isGenerating ? (
            <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin text-gray-600 group-hover:text-white transition-colors duration-300 relative z-10" />
          ) : (
            <Wand2 className="w-4 h-4 flex-shrink-0 text-gray-600 group-hover:text-white transition-colors duration-300 relative z-10" />
          )}
          <span className="max-w-0 group-hover:max-w-[100px] overflow-hidden whitespace-nowrap text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out relative z-10">
            Break down
          </span>
        </button>
      )}

      {/* Focus/Minify Button */}
      <button
        onClick={() => onMinify?.()}
        className="group relative w-10 h-10 hover:w-auto rounded-full transition-all duration-500 ease-out flex items-center justify-center hover:justify-start hover:px-3 hover:gap-2 border border-gray-200/50 hover:border-gray-600/50 hover:bg-gray-600 hover:shadow-lg overflow-hidden"
        style={{ 
          backgroundColor: isPaused ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
          backdropFilter: isPaused ? 'blur(10px)' : 'none'
        }}
      >
        <div className="absolute inset-0 bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out" />
        {pipWindow ? (
          <Minimize2 className={`w-4 h-4 flex-shrink-0 ${isPaused ? 'text-white' : 'text-gray-600'} group-hover:text-white transition-colors duration-300 relative z-10`} />
        ) : (
          <ExternalLink className={`w-4 h-4 flex-shrink-0 ${isPaused ? 'text-white' : 'text-gray-600'} group-hover:text-white transition-colors duration-300 relative z-10`} />
        )}
        <span className="max-w-0 group-hover:max-w-[100px] overflow-hidden whitespace-nowrap text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out relative z-10">
          {pipWindow ? 'Mini' : 'Focus'}
        </span>
      </button>
    </div>
  );
};