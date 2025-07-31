import { useState, useEffect, useRef } from 'react';

interface UseSimpleTimerProps {
  taskId: string;
  isActive: boolean; // true when task is actively running, false when paused/stopped
}

interface SimpleTimerState {
  totalElapsedMs: number;
  isRunning: boolean;
}

// Global timer state per task ID
const taskTimers = new Map<string, {
  baseElapsedMs: number;
  currentSessionStart: number | null;
}>();

export const useSimpleTimer = ({ taskId, isActive }: UseSimpleTimerProps): SimpleTimerState => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize timer state for this task if it doesn't exist
  if (!taskTimers.has(taskId)) {
    taskTimers.set(taskId, {
      baseElapsedMs: 0,
      currentSessionStart: null
    });
  }

  const timerState = taskTimers.get(taskId)!;

  useEffect(() => {
    if (isActive) {
      // Start/resume timer
      if (!timerState.currentSessionStart) {
        const now = Date.now();
        timerState.currentSessionStart = now;
        setCurrentTime(now); // Set immediately to avoid jump
      }
      
      intervalRef.current = setInterval(() => {
        setCurrentTime(Date.now());
      }, 100);
      
    } else {
      // Pause timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Add current session to base when pausing
      if (timerState.currentSessionStart) {
        const now = Date.now();
        const sessionElapsed = now - timerState.currentSessionStart;
        timerState.baseElapsedMs += sessionElapsed;
        timerState.currentSessionStart = null;
        setCurrentTime(now); // Set final time immediately
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, taskId]);

  // Calculate total elapsed time
  const totalElapsedMs = timerState.currentSessionStart 
    ? timerState.baseElapsedMs + (currentTime - timerState.currentSessionStart)
    : timerState.baseElapsedMs;

  return {
    totalElapsedMs,
    isRunning: isActive
  };
};