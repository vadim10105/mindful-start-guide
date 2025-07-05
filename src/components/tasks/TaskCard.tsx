import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Clock, Zap, Check } from "lucide-react";
import { ProgressBorder } from "@/components/ui/progress-border";
import { TaskActions } from "./TaskActions";

interface TaskCardData {
  id: string;
  title: string;
  priority_score: number;
  explanation: string;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  ai_effort: 'quick' | 'medium' | 'long';
}

interface TaskCardProps {
  task: TaskCardData;
  index: number;
  totalTasks: number;
  isCompleted: boolean;
  isPaused: boolean;
  pausedTime: number;
  isActiveCommitted: boolean;
  hasCommittedToTask: boolean;
  isCurrentTask: boolean;
  activeCommittedIndex: number;
  flowProgress: number;
  sunsetImageUrl: string;
  onCommit: () => void;
  onComplete: (taskId: string) => void;
  onMoveOn: (taskId: string) => void;
  onCarryOn: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  onBackToActive: () => void;
  onShowCompletionModal: () => void;
  navigationUnlocked: boolean;
  formatTime: (minutes: number) => string;
}

export const TaskCard = ({
  task,
  index,
  totalTasks,
  isCompleted,
  isPaused,
  pausedTime,
  isActiveCommitted,
  hasCommittedToTask,
  isCurrentTask,
  activeCommittedIndex,
  flowProgress,
  sunsetImageUrl,
  onCommit,
  onComplete,
  onMoveOn,
  onCarryOn,
  onSkip,
  onBackToActive,
  onShowCompletionModal,
  navigationUnlocked,
  formatTime
}: TaskCardProps) => {
  return (
    <div className={`w-full h-full transition-transform duration-700 ${
      isCompleted ? '[transform:rotateY(180deg)]' : ''
    }`} style={{ transformStyle: 'preserve-3d' }}>
      
      {/* Progress Border - Only show when committed and not completed */}
      {isActiveCommitted && hasCommittedToTask && !isCompleted && (
        <ProgressBorder
          progress={flowProgress / 100}
          width={320}
          height={447}
          stroke={6}
          color="hsl(var(--primary))"
          className="pointer-events-none z-[15]"
        />
      )}
      
      {/* Front of Card */}
      <Card className={`w-full h-full border-2 shadow-xl bg-card/95 backdrop-blur-sm text-card-foreground z-[10] ${
        isCompleted
          ? 'border-green-500' 
          : !isActiveCommitted && hasCommittedToTask
          ? 'border-muted-foreground/50'
          : 'border-primary/30 hover:border-primary/50'
      }`} style={{ backfaceVisibility: 'hidden' }}>
        <div className="h-full flex flex-col">
          <CardHeader className="text-center pb-4 flex-shrink-0">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                !isActiveCommitted && hasCommittedToTask
                  ? 'bg-muted text-muted-foreground' 
                  : 'bg-primary text-primary-foreground'
              }`}>
                {index + 1}
              </div>
              <div className="text-sm text-muted-foreground">
                of {totalTasks}
              </div>
            </div>
            <CardTitle className="text-lg leading-tight text-foreground">
              {task.title}
            </CardTitle>
            {!isActiveCommitted && hasCommittedToTask && (
              <p className="text-xs text-muted-foreground mt-2">
                (Currently active: Task {activeCommittedIndex + 1})
              </p>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col justify-between space-y-4 px-4 pb-4">
            {/* Task Tags */}
            <div className="flex flex-wrap gap-1 justify-center">
              {task.is_liked && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300">
                  <Heart className="w-3 h-3 mr-1" />
                  Love
                </Badge>
              )}
              {task.is_urgent && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-300">
                  <Clock className="w-3 h-3 mr-1" />
                  Urgent
                </Badge>
              )}
              {task.is_quick && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-green-500/20 text-green-700 dark:text-green-300 border border-green-300">
                  <Zap className="w-3 h-3 mr-1" />
                  Quick
                </Badge>
              )}
              <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
                AI: {task.ai_effort || 'medium'} effort
              </Badge>
            </div>

            {/* Task Actions */}
            <TaskActions
              task={task}
              isCompleted={isCompleted}
              isPaused={isPaused}
              pausedTime={pausedTime}
              isActiveCommitted={isActiveCommitted}
              hasCommittedToTask={hasCommittedToTask}
              isCurrentTask={isCurrentTask}
              activeCommittedIndex={activeCommittedIndex}
              onCommit={onCommit}
              onComplete={onComplete}
              onMoveOn={onMoveOn}
              onCarryOn={onCarryOn}
              onSkip={onSkip}
              onBackToActive={onBackToActive}
              navigationUnlocked={navigationUnlocked}
              formatTime={formatTime}
            />
          </CardContent>
        </div>
      </Card>

      {/* Back of Card (Sunset Image) */}
      {isCompleted && (
        <div 
          className="absolute inset-0 rounded-lg shadow-xl border-2 border-green-500 [transform:rotateY(180deg)]"
          style={{ 
            backfaceVisibility: 'hidden',
            background: `linear-gradient(45deg, rgba(251,146,60,0.8), rgba(249,115,22,0.8)), url('${sunsetImageUrl}') center/cover`
          }}
        >
          <div className="h-full flex flex-col justify-between p-6 text-white">
            <div className="text-center">
              <h3 className="text-lg font-bold mb-2">Task Complete!</h3>
              <p className="text-sm opacity-90">{task.title}</p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                <p className="text-sm mb-2">🌅 Beautiful work!</p>
                <p className="text-xs opacity-75">You've earned this sunset moment</p>
              </div>
              
              <button 
                onClick={onShowCompletionModal}
                className="w-full bg-white/20 hover:bg-white/30 border border-white/30 rounded-md py-2 px-4 text-sm transition-colors"
              >
                View Completion Stats
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};