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
  formatTime
}: TaskActionsProps) => {
  if (isCompleted) {
    return (
      <div className="flex items-center justify-center gap-2 text-green-400">
        <Check className="w-4 h-4" />
        <span className="font-medium text-sm">Completed!</span>
      </div>
    );
  }

  if (isPaused) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-amber-400 font-medium">
          Paused • {formatTime(pausedTime)} spent
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => onCarryOn(task.id)}
            size="sm"
            className="flex-1 bg-amber-500 text-white hover:bg-amber-600"
          >
            <Play className="w-4 h-4 mr-1" />
            Carry On
          </Button>
          <Button 
            onClick={() => onSkip(task.id)}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <SkipForward className="w-4 h-4 mr-1" />
            Skip
          </Button>
        </div>
      </div>
    );
  }

  if (!isActiveCommitted && hasCommittedToTask) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-card-foreground/70">
          Currently active: Task {activeCommittedIndex + 1}
        </div>
        <Button
          onClick={onBackToActive}
          variant="outline"
          size="sm"
          className="w-full flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Back to Active Card
        </Button>
      </div>
    );
  }

  if (!isCurrentTask) {
    return (
      <div className="text-sm text-card-foreground/70">
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
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Play className="w-4 h-4 mr-2" />
          Play this card
        </Button>
      );
    }
    // During navigation lock, cards should auto-activate (no button shown)
    return (
      <div className="text-sm text-card-foreground/70 text-center">
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
          className="flex-1 bg-green-600 text-white hover:bg-green-700"
        >
          <Check className="w-4 h-4 mr-1" />
          Mark Complete
        </Button>
        <Button 
          onClick={() => onMoveOn(task.id)}
          size="sm"
          variant="outline"
          className="flex-1"
        >
          <Pause className="w-4 h-4 mr-1" />
          Move On
        </Button>
      </div>
    </div>
  );
};