import { useEffect } from 'react';
import { TaskCardData } from './GameState';

interface TaskTimerManagerProps {
  flowStartTime: number | null;
  hasCommittedToTask: boolean;
  navigationUnlocked: boolean;
  activeCommittedIndex: number;
  tasks: TaskCardData[];
  timerRef: React.MutableRefObject<NodeJS.Timeout | undefined>;
  setFlowProgress: (progress: number) => void;
  setNavigationUnlocked: (unlocked: boolean) => void;
  setIsInitialLoad: (isInitial: boolean) => void;
}

export const useTaskTimerManager = ({
  flowStartTime,
  hasCommittedToTask,
  navigationUnlocked,
  activeCommittedIndex,
  tasks,
  timerRef,
  setFlowProgress,
  setNavigationUnlocked,
  setIsInitialLoad
}: TaskTimerManagerProps) => {
  useEffect(() => {
    const updateProgress = () => {
      if (!flowStartTime || !hasCommittedToTask) return;
      
      const elapsed = Date.now() - flowStartTime;
      const progress = Math.min((elapsed / (20 * 60 * 1000)) * 100, 100);
      setFlowProgress(progress);
      
      // Unlock navigation after 5 minutes
      if (elapsed >= 5 * 60 * 1000 && !navigationUnlocked) {
        console.log('Timer unlocking navigation after 5 minutes');
        setNavigationUnlocked(true);
        setIsInitialLoad(false);
      }
    };

    if (hasCommittedToTask && flowStartTime) {
      updateProgress();
      timerRef.current = setInterval(updateProgress, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [flowStartTime, navigationUnlocked, hasCommittedToTask, activeCommittedIndex, tasks, timerRef, setFlowProgress, setNavigationUnlocked, setIsInitialLoad]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  return {
    clearTimer
  };
};

export interface TaskTimerHelpers {
  formatTime: (minutes: number) => string;
  calculateTimeSpent: (startTime: number) => number;
}

export const useTaskTimerHelpers = (): TaskTimerHelpers => {
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const calculateTimeSpent = (startTime: number) => {
    return Math.round((Date.now() - startTime) / 60000);
  };

  return {
    formatTime,
    calculateTimeSpent
  };
};