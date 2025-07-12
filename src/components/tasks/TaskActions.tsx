import { Button } from "@/components/ui/button";
import { Check, Play, Pause, SkipForward, RotateCcw, Archive } from "lucide-react";

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
  onArchive?: (taskId: string) => void;
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
  onArchive,
  navigationUnlocked,
  formatTime
}: TaskActionsProps) => {
  if (isCompleted) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
          <Check className="w-4 h-4" />
          <span className="font-medium text-sm">Completed!</span>
        </div>
        {onArchive && (
          <Button
            onClick={() => onArchive(task.id)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Archive className="w-4 h-4 mr-2" />
            Archive Task
          </Button>
        )}
      </div>
    );
  }

  if (isPaused) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
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
        <div className="text-xs text-muted-foreground">
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
      <div className="text-sm text-muted-foreground">
        Swipe to view this task
      </div>
    );
  }

  if (!hasCommittedToTask || !isActiveCommitted) {
    return (
      <Button 
        onClick={onCommit}
        size="sm"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Play className="w-4 h-4 mr-2" />
        Commit to Task
      </Button>
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
        {navigationUnlocked && (
          <Button 
            onClick={() => onMoveOn(task.id)}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <Pause className="w-4 h-4 mr-1" />
            Move On
          </Button>
        )}
      </div>
    </div>
  );
};