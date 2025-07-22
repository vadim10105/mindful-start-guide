import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Heart, Clock, Zap, Check, Wand2 } from "lucide-react";
import { TaskActions } from "./TaskActions";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface TaskCardData {
  id: string;
  title: string;
  priority_score: number;
  explanation: string;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  notes?: string;
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
  navigationUnlocked,
  formatTime
}: TaskCardProps) => {
  const [notes, setNotes] = useState(task.notes || "");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleNotesClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const clickPos = textarea.selectionStart;
    const text = textarea.value;
    const lines = text.split('\n');
    
    let currentPos = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineStart = currentPos;
      const lineEnd = currentPos + line.length;
      
      // Check if click is within this line
      if (clickPos >= lineStart && clickPos <= lineEnd) {
        // Calculate relative position within the line
        const relativePos = clickPos - lineStart;
        
        // Find checkbox positions in the line
        const uncheckedPos = line.indexOf('☐');
        const checkedPos = line.indexOf('☑');
        
        // Only toggle if click is precisely on a checkbox character (☐ or ☑)
        // Allow a small tolerance of 1 character before/after for easier clicking
        if (uncheckedPos !== -1 && relativePos >= uncheckedPos && relativePos <= uncheckedPos + 1) {
          lines[i] = line.replace('☐', '☑');
          setNotes(lines.join('\n'));
          break;
        } else if (checkedPos !== -1 && relativePos >= checkedPos && relativePos <= checkedPos + 1) {
          lines[i] = line.replace('☑', '☐');
          setNotes(lines.join('\n'));
          break;
        }
      }
      currentPos = lineEnd + 1; // +1 for the newline character
    }
  };

  const generateSubtasks = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('breakdown-task', {
        body: {
          task: task.title,
          context: `Break down this task into actionable subtasks for someone with ADHD/neurodivergent traits. Make steps clear, specific, and not overwhelming.`
        }
      });

      if (error) throw error;

      // Format the AI response into checkbox list
      const subtasks = data.subtasks.map((subtask: any) => `☐ ${subtask.subtask}`);
      setNotes(subtasks.join('\n'));
      
    } catch (error) {
      console.error('Error generating subtasks:', error);
      // Fallback to simple breakdown
      const fallbackSubtasks = [
        "☐ Break down the task",
        "☐ Complete the first step", 
        "☐ Review progress",
        "☐ Finish and wrap up"
      ];
      setNotes(fallbackSubtasks.join('\n'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`w-full h-full transition-transform duration-700 ${
      isCompleted ? '[transform:rotateY(180deg)]' : ''
    }`} style={{ transformStyle: 'preserve-3d' }}>
      
      
      {/* Front of Card */}
      <Card className={`w-full h-full border-2 border-transparent shadow-xl z-[10] overflow-visible`} style={{ 
        backfaceVisibility: 'hidden',
        backgroundColor: 'hsl(202 10% 16%)',
        color: 'hsl(48 100% 96%)'
      }}>
        <div className="h-full flex flex-col">
          <CardHeader className="text-center pb-4 flex-shrink-0 relative overflow-visible">
            {/* Magic Wand - Top Right */}
            <Button
              variant="ghost"
              size="sm"
              onClick={generateSubtasks}
              disabled={isGenerating}
              className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-muted/20 disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'hsl(48 100% 96% / 0.6)' }} />
              ) : (
                <Wand2 className="w-3 h-3" style={{ color: 'hsl(48 100% 96% / 0.6)' }} />
              )}
            </Button>
            
            <div className="flex items-center justify-center gap-1 mb-3">
              <span className="text-sm" style={{ color: 'hsl(48 100% 96% / 0.7)' }}>
                {index + 1}
              </span>
              <span className="text-sm" style={{ color: 'hsl(48 100% 96% / 0.7)' }}>
                of {totalTasks}
              </span>
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

            {/* Separator */}
            <div className="mx-4">
              <div className="h-px bg-border"></div>
            </div>

            {/* Notes Section */}
            <div className="flex-1 flex flex-col">
              <div className="bg-card focus-within:bg-muted/20 transition-all duration-300 rounded-md relative flex-1">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onClick={handleNotesClick}
                  placeholder="Add notes..."
                  className="resize-none !text-sm leading-relaxed border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[hsl(48_100%_96%)] placeholder:text-[hsl(48_100%_96%_/_0.5)] h-full min-h-[80px] cursor-text hover:cursor-pointer"
                  style={{ backgroundColor: 'transparent' }}
                />
              </div>
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
          className="absolute inset-0 rounded-lg shadow-xl border-2 border-transparent [transform:rotateY(180deg)] z-20"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div 
            className="absolute inset-0 bg-cover bg-center rounded-lg"
            style={{ 
              backgroundImage: `url('${sunsetImageUrl}')` 
            }}
          />
          <div className="absolute inset-0 bg-black/40 rounded-lg" />
          <div className="relative h-full flex flex-col justify-center p-6 text-white z-10">
            <div className="text-center">
              <h3 className="text-lg font-bold mb-2">Task Complete!</h3>
              <p className="text-sm opacity-90">{task.title}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};