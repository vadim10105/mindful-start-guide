
import { TaskGameController } from "./TaskGameController";
import { TaskCardData } from "./GameState";

interface GameTaskCardsProps {
  tasks: TaskCardData[];
  onComplete: () => void;
  onTaskComplete?: (taskId: string) => void;
  isLoading?: boolean;
  isProcessing?: boolean;
  onLoadingComplete?: () => void;
}

export const GameTaskCards = (props: GameTaskCardsProps) => {
  return <TaskGameController {...props} />;
};
