import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GameLoadingScreen } from "@/components/tasks/GameLoadingScreen";
import { GameTaskCards } from "@/components/tasks/GameTaskCards";
import { useToast } from "@/hooks/use-toast";

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
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const storedTasks = localStorage.getItem('prioritizedTasks');
    if (storedTasks) {
      setPrioritizedTasks(JSON.parse(storedTasks));
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

  if (isLoadingGame) {
    return (
      <GameLoadingScreen
        taskCount={prioritizedTasks.length}
        onLoadingComplete={() => setIsLoadingGame(false)}
      />
    );
  }

  return (
    <GameTaskCards
      tasks={prioritizedTasks}
      onComplete={handleGameComplete}
      onTaskComplete={handleTaskComplete}
    />
  );
};

export default GamePage;
