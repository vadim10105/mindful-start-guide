
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Zap, Clock, CheckCircle, Pause, Play, Eye } from "lucide-react";

interface TaskCardData {
  id: string;
  title: string;
  priority_score: number;
  explanation: string;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
}

interface TaskListOverlayProps {
  showTaskList: boolean;
  tasks: TaskCardData[];
  getTaskStatus: (task: TaskCardData, index: number) => string;
  getTaskTimeSpent: (task: TaskCardData, index: number) => number;
  formatTime: (minutes: number) => string;
  onSeeAheadPress: () => void;
  onSeeAheadRelease: () => void;
}

export const TaskListOverlay = ({
  showTaskList,
  tasks,
  getTaskStatus,
  getTaskTimeSpent,
  formatTime,
  onSeeAheadPress,
  onSeeAheadRelease
}: TaskListOverlayProps) => {
  return (
    <>
      {/* See What's Ahead Button */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <Button
          variant="secondary"
          size="lg"
          className="bg-card/80 backdrop-blur-sm border border-border hover:bg-muted/50 transition-all duration-200 shadow-lg"
          onMouseDown={onSeeAheadPress}
          onMouseUp={onSeeAheadRelease}
          onMouseLeave={onSeeAheadRelease}
          onTouchStart={onSeeAheadPress}
          onTouchEnd={onSeeAheadRelease}
        >
          <Eye className="mr-2 h-4 w-4" />
          See what's Ahead
        </Button>
      </div>

      {/* Task List Overlay */}
      {showTaskList && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-center">What's Ahead</h3>
              <p className="text-sm text-muted-foreground text-center mt-1">
                {tasks.length} tasks total
              </p>
            </div>
            <div className="p-4 space-y-3">
              {tasks.map((task, index) => {
                const status = getTaskStatus(task, index);
                const timeSpent = getTaskTimeSpent(task, index);
                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border transition-all ${
                      status === 'current' 
                        ? 'bg-primary/10 border-primary shadow-sm' 
                        : status === 'completed'
                        ? 'bg-green-500/10 border-green-500/20 opacity-75'
                        : status === 'paused'
                        ? 'bg-orange-500/10 border-orange-500/20 opacity-75'
                        : status === 'passed'
                        ? 'bg-muted/50 border-muted opacity-60'
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">#{index + 1}</span>
                          {status === 'completed' && <CheckCircle className="h-3 w-3 text-green-500" />}
                          {status === 'paused' && <Pause className="h-3 w-3 text-orange-500" />}
                          {status === 'current' && <Play className="h-3 w-3 text-primary" />}
                          {timeSpent > 0 && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatTime(timeSpent)}
                            </span>
                          )}
                        </div>
                        <h4 className={`text-sm font-medium mb-2 line-clamp-2 ${
                          status === 'completed' || status === 'paused' || status === 'passed' 
                            ? 'text-muted-foreground' 
                            : ''
                        }`}>
                          {task.title}
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {task.is_liked && (
                            <Badge variant="outline" className="text-xs h-5 px-1.5">
                              <Heart className="h-2.5 w-2.5 mr-1 fill-current" />
                              Fun
                            </Badge>
                          )}
                          {task.is_urgent && (
                            <Badge variant="outline" className="text-xs h-5 px-1.5">
                              <Zap className="h-2.5 w-2.5 mr-1" />
                              Urgent
                            </Badge>
                          )}
                          {task.is_quick && (
                            <Badge variant="outline" className="text-xs h-5 px-1.5">
                              <Clock className="h-2.5 w-2.5 mr-1" />
                              Quick
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
