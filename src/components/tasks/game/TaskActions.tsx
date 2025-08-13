import { Button } from "@/components/ui/button";
import { Check, Play, Pause, SkipForward, RotateCcw, ArrowLeft, TrendingUp, Wand2, Minimize2, Loader2, ExternalLink } from "lucide-react";
import { useState } from "react";

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
  pipWindow?: Window;
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
  pipWindow
}: TaskActionsProps) => {
  if (isCompleted) {
    return null;
  }

  // Check if this paused card should show "Back to Active Card" instead of "Play"
  if (!isActiveCommitted && hasCommittedToTask && activeCommittedIndex >= 0) {
    return (
      <div className="space-y-2">
        <Button
          onClick={onBackToActive}
          size="sm"
          className="w-full flex items-center gap-2 bg-gray-200 hover:bg-primary hover:text-white transition-all duration-700"
          style={{ color: 'hsl(220 10% 30%)' }}
        >
          <RotateCcw className="w-4 h-4" />
          Back to Active Card
        </Button>
      </div>
    );
  }

  if (isPaused) {
    return (
      <Button 
        onClick={() => onCarryOn(task.id)}
        size="sm"
        className="w-full bg-primary hover:bg-primary/90 transition-all duration-700"
        style={{ color: '#434343' }}
      >
        <Play className="w-4 h-4 mr-2" />
        Play
      </Button>
    );
  }

  if (!isCurrentTask) {
    return (
      <div className="text-sm" style={{ color: 'hsl(220 10% 50%)' }}>
        Swipe to view this task
      </div>
    );
  }

  if (!hasCommittedToTask || !isActiveCommitted) {
    // Only show "Play Card" button when navigation is unlocked
    if (navigationUnlocked) {
      return (
        <Button 
          onClick={onCommit}
          size="sm"
          className="w-full bg-primary hover:bg-primary/90 transition-all duration-700"
          style={{ color: '#434343' }}
        >
          <Play className="w-4 h-4 mr-2" />
          Play
        </Button>
      );
    }
    // During navigation lock, cards should auto-activate (no button shown)
    return (
      <div className="text-sm text-center" style={{ color: 'hsl(220 10% 50%)' }}>
        Starting task...
      </div>
    );
  }

  // Committed task - show expandable action buttons
  return (
    <div className="flex gap-2 justify-center">
      {/* Made Progress Button */}
      <button
        onClick={() => onMadeProgress(task.id)}
        className="group w-10 h-10 hover:w-auto rounded-lg transition-all duration-700 ease-in-out flex items-center justify-center hover:justify-start hover:!bg-yellow-500 hover:text-white hover:px-2 hover:gap-2"
        style={{ backgroundColor: 'rgba(152, 152, 152, 0.2)' }}
      >
        <TrendingUp className="w-5 h-5 flex-shrink-0" />
        <span className="w-0 group-hover:w-auto overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-500 ease-in-out">
          Made Progress
        </span>
      </button>

      {/* Complete Button */}
      <button
        onClick={() => onComplete(task.id)}
        className="group w-10 h-10 hover:w-auto rounded-lg transition-all duration-700 ease-in-out flex items-center justify-center hover:justify-start hover:!bg-green-600 hover:text-white hover:px-2 hover:gap-2"
        style={{ backgroundColor: 'rgba(152, 152, 152, 0.2)' }}
      >
        <Check className="w-5 h-5 flex-shrink-0" />
        <span className="w-0 group-hover:w-auto overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-500 ease-in-out">
          Complete
        </span>
      </button>

      {/* Break it down Button */}
      <button
        onClick={() => onBreakdown?.()}
        disabled={isGenerating}
        className="group w-10 h-10 hover:w-auto rounded-lg transition-all duration-700 ease-in-out flex items-center justify-center hover:justify-start hover:!bg-purple-500 hover:text-white hover:px-2 hover:gap-2 disabled:opacity-50"
        style={{ backgroundColor: 'rgba(152, 152, 152, 0.2)' }}
      >
        {isGenerating ? (
          <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
        ) : (
          <Wand2 className="w-5 h-5 flex-shrink-0" />
        )}
        <span className="w-0 group-hover:w-auto overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-500 ease-in-out">
          Break it down
        </span>
      </button>

      {/* Focus/Minify Button */}
      <button
        onClick={() => onMinify?.()}
        className="group w-10 h-10 hover:w-auto rounded-lg transition-all duration-700 ease-in-out flex items-center justify-center hover:justify-start hover:!bg-gray-600 hover:text-white hover:px-2 hover:gap-2"
        style={{ backgroundColor: 'rgba(152, 152, 152, 0.2)' }}
      >
        {pipWindow ? (
          <Minimize2 className="w-5 h-5 flex-shrink-0" />
        ) : (
          <ExternalLink className="w-5 h-5 flex-shrink-0" />
        )}
        <span className="w-0 group-hover:w-auto overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-500 ease-in-out">
          {pipWindow ? 'Minify' : 'Focus'}
        </span>
      </button>
    </div>
  );
};