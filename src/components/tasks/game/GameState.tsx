
import { useState, useRef } from 'react';

export interface TaskCardData {
  id: string;
  title: string;
  priority_score: number;
  explanation: string;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  notes?: string;
  estimated_time?: string;
  time_spent_minutes?: number;
  task_status?: 'task_list' | 'not_started' | 'incomplete' | 'made_progress' | 'complete';
}

export interface CompletedTask {
  id: string;
  title: string;
  timeSpent: number;
  completedAt: Date;
  sunsetImageUrl: string;
  attribution?: string;
  attributionUrl?: string;
  description?: string;
  caption?: string;
  cardNumber?: number;
}

export const useGameState = (tasks: TaskCardData[]) => {
  const [currentViewingIndex, setCurrentViewingIndex] = useState(0);
  const [activeCommittedIndex, setActiveCommittedIndex] = useState(0);
  const [flowStartTime, setFlowStartTime] = useState<number | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [pausedTasks, setPausedTasks] = useState<Map<string, number>>(new Map());
  const [hasCommittedToTask, setHasCommittedToTask] = useState(false);
  const [taskStartTimes, setTaskStartTimes] = useState<Record<string, number>>({});
  const [lastCompletedTask, setLastCompletedTask] = useState<{id: string, title: string, timeSpent: number} | null>(null);
  const [todaysCompletedTasks, setTodaysCompletedTasks] = useState<CompletedTask[]>([]);
  const [navigationUnlocked, setNavigationUnlocked] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showTaskList, setShowTaskList] = useState(false);
  const [flowProgress, setFlowProgress] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout>();
  const swiperRef = useRef<any>(null);

  // Calculate navigation state
  const isTaskCommitted = hasCommittedToTask && currentViewingIndex === activeCommittedIndex;

  const getTaskStatus = (task: TaskCardData, index: number) => {
    if (completedTasks.has(task.id)) return 'completed';
    if (pausedTasks.has(task.id)) return 'paused';
    if (index === currentViewingIndex) return 'current';
    if (index < currentViewingIndex) return 'passed';
    return 'upcoming';
  };

  const getTaskTimeSpent = (task: TaskCardData, index: number) => {
    const status = getTaskStatus(task, index);
    
    if (status === 'completed') {
      if (lastCompletedTask && lastCompletedTask.id === task.id) {
        return lastCompletedTask.timeSpent;
      }
      const startTime = taskStartTimes[task.id];
      if (startTime) {
        return Math.round((Date.now() - startTime) / 60000);
      }
      return 0;
    }
    
    if (status === 'paused') {
      return pausedTasks.get(task.id) || 0;
    }
    
    if (status === 'current' && hasCommittedToTask && index === activeCommittedIndex) {
      const startTime = taskStartTimes[task.id];
      if (startTime) {
        const currentTime = Math.round((Date.now() - startTime) / 60000);
        return Math.max(0, currentTime);
      }
    }
    
    return 0;
  };

  return {
    // State
    currentViewingIndex,
    setCurrentViewingIndex,
    activeCommittedIndex,
    setActiveCommittedIndex,
    flowStartTime,
    setFlowStartTime,
    completedTasks,
    setCompletedTasks,
    pausedTasks,
    setPausedTasks,
    hasCommittedToTask,
    setHasCommittedToTask,
    taskStartTimes,
    setTaskStartTimes,
    lastCompletedTask,
    setLastCompletedTask,
    todaysCompletedTasks,
    setTodaysCompletedTasks,
    navigationUnlocked,
    setNavigationUnlocked,
    isInitialLoad,
    setIsInitialLoad,
    showTaskList,
    setShowTaskList,
    flowProgress,
    setFlowProgress,
    
    // Refs
    timerRef,
    swiperRef,
    
    // Computed
    isTaskCommitted,
    
    // Helpers
    getTaskStatus,
    getTaskTimeSpent
  };
};
