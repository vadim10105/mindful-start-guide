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
  
  onAddToCollection: () => void;
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
  
  onAddToCollection,
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
      <Card className={`w-full h-full border-2 shadow-xl z-[10] ${
        isCompleted
          ? 'border-green-500' 
          : !isActiveCommitted && hasCommittedToTask
          ? 'border-muted-foreground/50'
          : 'border-primary/30 hover:border-primary/50'
      }`} style={{ 
        backfaceVisibility: 'hidden',
        backgroundColor: 'hsl(202 10% 16%)',
        color: 'hsl(48 100% 96%)'
      }}>
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
              <div className="text-sm" style={{ color: 'hsl(48 100% 96% / 0.7)' }}>
                of {totalTasks}
              </div>
            </div>
            <CardTitle className="text-lg leading-tight" style={{ color: 'hsl(48 100% 96%)' }}>
              {task.title}
            </CardTitle>
            {!isActiveCommitted && hasCommittedToTask && (
              <p className="text-xs mt-2" style={{ color: 'hsl(48 100% 96% / 0.7)' }}>
                (Currently active: Task {activeCommittedIndex + 1})
              </p>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col justify-between space-y-4 px-4 pb-4">
            {/* Task Tags */}
            <div className="flex flex-wrap gap-1 justify-center">
              {task.is_liked && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-300">
                  <Heart className="w-3 h-3 mr-1" />
                  Love
                </Badge>
              )}
              {task.is_urgent && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-300 border border-orange-300">
                  <Clock className="w-3 h-3 mr-1" />
                  Urgent
                </Badge>
              )}
              {task.is_quick && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-green-500/20 text-green-300 border border-green-300">
                  <Zap className="w-3 h-3 mr-1" />
                  Quick
                </Badge>
              )}
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
          className="absolute inset-0 rounded-lg shadow-xl border-2 border-green-500 [transform:rotateY(180deg)] z-20"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div 
            className="absolute inset-0 bg-cover bg-center rounded-lg"
            style={{ 
              backgroundImage: `url('${sunsetImageUrl}')` 
            }}
          />
          <div className="absolute inset-0 bg-black/40 rounded-lg" />
          <div className="relative h-full flex flex-col justify-between p-6 text-white z-10">
            <div className="text-center">
              <h3 className="text-lg font-bold mb-2">Task Complete!</h3>
              <p className="text-sm opacity-90">{task.title}</p>
            </div>
            
            <div className="text-center">
              <button 
                onClick={onAddToCollection}
                className="w-full bg-white/20 hover:bg-white/30 border border-white/30 rounded-md py-2 px-4 text-sm transition-colors"
              >
                Add to Collection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};