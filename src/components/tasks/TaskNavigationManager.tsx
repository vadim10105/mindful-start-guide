import { useEffect } from 'react';
import { TaskCardData } from './GameState';

export interface TaskNavigationManagerHook {
  handleKeyboardNavigation: () => void;
  handleBackToActiveCard: () => void;
  handleSeeAheadPress: () => void;
  handleSeeAheadRelease: () => void;
}

interface TaskNavigationManagerProps {
  tasks: TaskCardData[];
  currentViewingIndex: number;
  activeCommittedIndex: number;
  hasCommittedToTask: boolean;
  completedTasks: Set<string>;
  swiperRef: React.MutableRefObject<{ swiper?: { slidePrev: () => void; slideNext: () => void } } | null>;
  setCurrentViewingIndex: (index: number) => void;
  setShowTaskList: (show: boolean) => void;
  onCommitToCurrentTask: () => void;
  onTaskComplete: (taskId: string) => void;
}

export const useTaskNavigationManager = ({
  tasks,
  currentViewingIndex,
  activeCommittedIndex,
  hasCommittedToTask,
  completedTasks,
  swiperRef,
  setCurrentViewingIndex,
  setShowTaskList,
  onCommitToCurrentTask,
  onTaskComplete
}: TaskNavigationManagerProps): TaskNavigationManagerHook => {

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (swiperRef.current?.swiper) {
          e.preventDefault();
          if (e.key === 'ArrowLeft') {
            swiperRef.current.swiper.slidePrev();
          } else if (e.key === 'ArrowRight') {
            swiperRef.current.swiper.slideNext();
          }
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentTask = tasks[currentViewingIndex];
        if (!currentTask) return;
        
        const isTaskCommitted = hasCommittedToTask && currentViewingIndex === activeCommittedIndex;
        
        if (isTaskCommitted && !completedTasks.has(currentTask.id)) {
          onTaskComplete(currentTask.id);
        } else if (!hasCommittedToTask || currentViewingIndex !== activeCommittedIndex) {
          onCommitToCurrentTask();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentViewingIndex, 
    activeCommittedIndex, 
    hasCommittedToTask, 
    completedTasks, 
    tasks,
    swiperRef,
    onCommitToCurrentTask,
    onTaskComplete
  ]);

  const handleKeyboardNavigation = () => {
    // This is handled by the useEffect above
  };

  const handleBackToActiveCard = () => {
    setCurrentViewingIndex(activeCommittedIndex);
  };

  const handleSeeAheadPress = () => {
    setShowTaskList(true);
  };

  const handleSeeAheadRelease = () => {
    setShowTaskList(false);
  };

  return {
    handleKeyboardNavigation,
    handleBackToActiveCard,
    handleSeeAheadPress,
    handleSeeAheadRelease
  };
};