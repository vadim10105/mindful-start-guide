import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GameLoadingScreen } from "@/components/tasks/GameLoadingScreen";
import { GameTaskCards } from "@/components/tasks/GameTaskCards";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PrioritizedTask {
  id: string;
  title: string;
  priority_score: number;
  explanation: string;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  ai_effort: 'quick' | 'medium' | 'long';
}

const GamePage = () => {
  const [prioritizedTasks, setPrioritizedTasks] = useState<PrioritizedTask[]>([]);
  const [isLoadingGame, setIsLoadingGame] = useState(true);
  const [showTaskList, setShowTaskList] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const storedTasks = localStorage.getItem('prioritizedTasks');
    if (storedTasks && storedTasks !== 'undefined' && storedTasks !== 'null') {
      try {
        setPrioritizedTasks(JSON.parse(storedTasks));
      } catch (error) {
        console.error('Failed to parse stored tasks:', error);
        localStorage.removeItem('prioritizedTasks');
      }
    } else {
      toast({
        title: "No tasks found",
        description: "Please go back and create some tasks first.",
        variant: "destructive",
      });
      navigate('/tasks'); // Redirect to brain dump if no tasks
    }
  }, [navigate, toast]);

  const handleGameComplete = () => {
    toast({
      title: "Session Complete!",
      description: "Great work on focusing through your tasks!",
    });
    localStorage.removeItem('prioritizedTasks'); // Clear tasks after completion
    navigate('/tasks'); // Go back to brain dump
  };

  const handleTaskComplete = (taskId: string) => {
    console.log('Task completed:', taskId);
    // Additional logic for individual task completion if needed
  };

  const handleMouseDown = () => {
    holdTimerRef.current = setTimeout(() => {
      setShowTaskList(true);
    }, 500); // 500ms hold to show list
  };

  const handleMouseUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setShowTaskList(false); // Close the dialog immediately on mouse up
  };

  if (isLoadingGame) {
    return (
      <GameLoadingScreen
        taskCount={prioritizedTasks.length}
        onLoadingComplete={() => setIsLoadingGame(false)}
      />
    );
  }

  return (
    <div className="relative">
      <GameTaskCards
        tasks={prioritizedTasks}
        onComplete={handleGameComplete}
        onTaskComplete={handleTaskComplete}
      />
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <Button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} // Clear timer if mouse leaves button while holding
          variant="outline"
          className="px-6 py-3 text-lg"
        >
          View Tasks
        </Button>
      </div>

      <Dialog open={showTaskList} onOpenChange={setShowTaskList}>
        <DialogContent className="max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Your Prioritized Tasks</DialogTitle>
            <DialogDescription>
              Here's your current task list, ordered by priority.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[calc(80vh-120px)] pr-4">
            <ul className="space-y-2">
              {prioritizedTasks.map((task, index) => (
                <li key={task.id} className="p-2 border rounded-md bg-muted/20 text-sm">
                  <span className="font-semibold">{index + 1}. {task.title}</span>
                  <p className="text-muted-foreground text-xs">Score: {task.priority_score.toFixed(2)}</p>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GamePage;
