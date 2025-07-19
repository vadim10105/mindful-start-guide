
import { useEffect } from 'react';

interface TaskTimerProps {
  flowStartTime: number | null;
  hasCommittedToTask: boolean;
  navigationUnlocked: boolean;
  activeCommittedIndex: number;
  tasks: any[];
  timerRef: React.MutableRefObject<NodeJS.Timeout | undefined>;
  setFlowProgress: (progress: number) => void;
  setNavigationUnlocked: (unlocked: boolean) => void;
  setIsInitialLoad: (isInitial: boolean) => void;
  onNavigationUnlock: (message: string) => void;
}

export const useTaskTimer = ({
  flowStartTime,
  hasCommittedToTask,
  navigationUnlocked,
  activeCommittedIndex,
  tasks,
  timerRef,
  setFlowProgress,
  setNavigationUnlocked,
  setIsInitialLoad,
  onNavigationUnlock
}: TaskTimerProps) => {
  useEffect(() => {
    const updateProgress = () => {
      if (!flowStartTime || !hasCommittedToTask) return;
      
      const elapsed = Date.now() - flowStartTime;
      const progress = Math.min((elapsed / (20 * 60 * 1000)) * 100, 100);
      setFlowProgress(progress);
      
      if (elapsed >= 5 * 60 * 1000 && !navigationUnlocked) {
        console.log('Timer unlocking navigation after 5 minutes');
        setNavigationUnlocked(true);
        setIsInitialLoad(false);
        const currentTask = tasks[activeCommittedIndex];
        onNavigationUnlock(`Wow, you actually stuck with "${currentTask?.title}" longer than I would have! Feel free to browse around now.`);
      }
    };

    if (hasCommittedToTask && flowStartTime) {
      updateProgress();
      timerRef.current = setInterval(updateProgress, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [flowStartTime, navigationUnlocked, hasCommittedToTask, activeCommittedIndex, tasks, timerRef, setFlowProgress, setNavigationUnlocked, setIsInitialLoad, onNavigationUnlock]);
};
