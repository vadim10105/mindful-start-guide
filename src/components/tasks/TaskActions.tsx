import { Button } from "@/components/ui/button";
import { Check, Play, Pause, SkipForward, RotateCcw } from "lucide-react";

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
  onMoveOn: (taskId: string) => void;
  onCarryOn: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  onBackToActive: () => void;
  navigationUnlocked: boolean;
  formatTime: (minutes: number) => string;
  onPauseHover?: (isHovering: boolean) => void;
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
  onMoveOn,
  onCarryOn,
  onSkip,
  onBackToActive,
  navigationUnlocked,
  formatTime,
  onPauseHover
}: TaskActionsProps) => {
  if (isCompleted) {
    return (
      <div className="flex items-center justify-center gap-2" style={{ color: 'hsl(142 70% 45%)' }}>
        <Check className="w-4 h-4" />
        <span className="font-medium text-sm">Completed!</span>
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

  if (!isActiveCommitted && hasCommittedToTask && activeCommittedIndex >= 0) {
    return (
      <div className="space-y-2">
        <Button
          onClick={onBackToActive}
          size="sm"
          className="w-full flex items-center gap-2 bg-gray-300 hover:bg-primary hover:text-white transition-all duration-700"
          style={{ color: 'hsl(220 10% 30%)' }}
        >
          <RotateCcw className="w-4 h-4" />
          Back to Active Card
        </Button>
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

  // Committed task - show both buttons 
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button 
          onClick={() => onComplete(task.id)}
          size="sm"
          className="bg-gray-300 hover:bg-green-600 hover:text-white px-3 transition-all duration-700"
          style={{ color: 'hsl(220 10% 30%)' }}
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button 
          onClick={() => onMoveOn(task.id)}
          onMouseEnter={() => onPauseHover?.(true)}
          onMouseLeave={() => onPauseHover?.(false)}
          size="sm"
          className="flex-1 bg-gray-300 hover:bg-primary hover:text-white transition-all duration-700"
          style={{ color: 'hsl(220 10% 30%)' }}
        >
          <Pause className="w-4 h-4 mr-1" />
          Pause
        </Button>
      </div>
    </div>
  );
};