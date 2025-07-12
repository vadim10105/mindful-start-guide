import { Button } from "@/components/ui/button";
import { Check, Play, ArrowRight, SkipForward, ArrowLeft, Archive } from "lucide-react";

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
  // Show archive button for completed tasks
  if (isCompleted && onArchive) {
    return (
      <div className="space-y-3">
        <Button
          onClick={() => onArchive(task.id)}
          variant="outline"
          size="sm"
          className="w-full border-primary/30 hover:border-primary/50"
        >
          <Archive className="w-4 h-4 mr-2" />
          Archive Task
        </Button>
      </div>
    );
  }

  // Existing logic for non-completed tasks
  if (!isActiveCommitted && hasCommittedToTask) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground text-center">
          Task {activeCommittedIndex + 1} is currently active
        </p>
        {navigationUnlocked && (
          <Button
            onClick={onBackToActive}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Active
          </Button>
        )}
      </div>
    );
  }

  if (!hasCommittedToTask) {
    return (
      <div className="space-y-3">
        <Button
          onClick={onCommit}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          size="lg"
        >
          <Play className="w-4 h-4 mr-2" />
          Start Task
        </Button>
      </div>
    );
  }

  if (isPaused) {
    return (
      <div className="space-y-3">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Paused for {formatTime(pausedTime)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => onCarryOn(task.id)}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Play className="w-4 h-4 mr-1" />
            Resume
          </Button>
          <Button
            onClick={() => onMoveOn(task.id)}
            variant="outline"
            size="sm"
          >
            <ArrowRight className="w-4 h-4 mr-1" />
            Move On
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => onComplete(task.id)}
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Check className="w-4 h-4 mr-1" />
          Done!
        </Button>
        <Button
          onClick={() => onSkip(task.id)}
          variant="outline"
          size="sm"
        >
          <SkipForward className="w-4 h-4 mr-1" />
          Skip
        </Button>
      </div>
    </div>
  );
};
