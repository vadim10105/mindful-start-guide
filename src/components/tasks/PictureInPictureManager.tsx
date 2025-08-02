import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { PiPController, usePiP } from "./PictureInPicture";
import { TaskCardData } from './GameState';

export interface PictureInPictureManagerHook {
  isPiPActive: boolean;
  isPiPAvailable: boolean;
  enterPiP: () => void;
  renderPiPController: () => React.ReactNode;
  renderPiPIndicator: () => React.ReactNode;
  renderPiPToggleButton: () => React.ReactNode;
  renderPiPNotSupportedMessage: () => React.ReactNode;
}

interface PictureInPictureManagerProps {
  tasks: TaskCardData[];
  isLoading: boolean;
  isProcessing: boolean;
  onComplete: () => void;
  onTaskComplete?: (taskId: string) => Promise<void>;
  onMadeProgress?: (taskId: string) => Promise<void>;
  onPauseTask?: (taskId: string) => Promise<void>;
  onCommitToCurrentTask?: () => void;
  onCarryOn?: (taskId: string) => void;
  onSkip?: (taskId: string) => Promise<void>;
  onNotesChange?: (taskId: string, notes: string) => void;
  onRefreshTasks?: () => Promise<void>;
  nextRewardCard: {
    card: any;
    cardId: string;
    cardNumber: number;
    collectionId: string;
  } | null;
  onLoadingComplete?: () => void;
  gameState: ReturnType<typeof import('./GameState').useGameState>;
}

const usePictureInPictureManager = ({
  tasks,
  isLoading,
  isProcessing
}: Pick<PictureInPictureManagerProps, 'tasks' | 'isLoading' | 'isProcessing'>): PictureInPictureManagerHook => {
  const { isPiPActive, isPiPAvailable, enterPiP, setPiPAvailable } = usePiP();

  // Make PiP available after cards are loaded
  useEffect(() => {
    if (tasks.length > 0 && !isLoading && !isProcessing) {
      setPiPAvailable(true);
    } else {
      setPiPAvailable(false);
    }
  }, [tasks.length, isLoading, isProcessing, setPiPAvailable]);

  const renderPiPController = () => null; // Will be rendered by parent component
  
  const renderPiPIndicator = () => {
    if (!isPiPActive) return null;
    
    return (
      <div className="fixed top-4 left-4 z-50 bg-green-500/10 border border-green-500/20 backdrop-blur-sm px-3 py-2 rounded-md">
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Picture-in-Picture Active</span>
        </div>
      </div>
    );
  };

  const renderPiPToggleButton = () => {
    if (!isPiPAvailable) return null;
    
    return (
      <div className="fixed top-4 right-4 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={enterPiP}
          className="bg-background/80 backdrop-blur-sm border border-border hover:bg-muted/50 transition-all duration-200 shadow-lg p-2 h-8 w-8"
          title="Open in Picture-in-Picture window"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const renderPiPNotSupportedMessage = () => {
    if (isPiPAvailable || !('documentPictureInPicture' in window === false)) return null;
    
    return (
      <div className="fixed top-4 left-4 z-40">
        <div className="bg-background/80 backdrop-blur-sm border border-border px-3 py-2 rounded-md text-sm text-muted-foreground">
          PiP requires Chrome 116+
        </div>
      </div>
    );
  };

  return {
    isPiPActive,
    isPiPAvailable,
    enterPiP,
    renderPiPController,
    renderPiPIndicator,
    renderPiPToggleButton,
    renderPiPNotSupportedMessage
  };
};

interface PictureInPictureManagerComponentProps extends PictureInPictureManagerProps {
  pipManager: PictureInPictureManagerHook;
}

export const PictureInPictureManager = ({ 
  tasks, 
  onComplete, 
  onTaskComplete, 
  onMadeProgress,
  onPauseTask,
  onCommitToCurrentTask,
  onCarryOn,
  onSkip,
  onNotesChange,
  onRefreshTasks,
  nextRewardCard,
  isLoading, 
  isProcessing, 
  onLoadingComplete, 
  gameState,
  pipManager 
}: PictureInPictureManagerComponentProps) => {
  return (
    <>
      {/* PiP Controller */}
      <PiPController
        tasks={tasks}
        onComplete={onComplete}
        onTaskComplete={onTaskComplete}
        onMadeProgress={onMadeProgress}
        onPauseTask={onPauseTask}
        onCommitToCurrentTask={onCommitToCurrentTask}
        onCarryOn={onCarryOn}
        onSkip={onSkip}
        onNotesChange={onNotesChange}
        onRefreshTasks={onRefreshTasks}
        nextRewardCard={nextRewardCard}
        isLoading={isLoading}
        isProcessing={isProcessing}
        onLoadingComplete={onLoadingComplete}
        gameState={gameState}
      />

      {/* PiP Active Status Indicator */}
      {pipManager.renderPiPIndicator()}

      {/* PiP Toggle Button - Fixed position (when not in PiP mode) */}
      {!pipManager.isPiPActive && pipManager.renderPiPToggleButton()}

      {/* PiP Not Supported Message */}
      {!pipManager.isPiPActive && pipManager.renderPiPNotSupportedMessage()}
    </>
  );
};

export { usePictureInPictureManager };