import { useState, useEffect } from 'react';
import { parseTimeToMinutes } from '@/utils/timeUtils';
import { taskTimers } from './TaskProgressManager';

interface TaskTimeDisplayProps {
  taskId: string;
  startTime: number;
  estimatedTime?: string;
  isActiveCommitted: boolean;
  isUltraCompact?: boolean;
  pausedTasks?: Map<string, number>;
  totalPausedTime?: number; // Total time this task has been paused (in ms)
  isPaused?: boolean;
  timeSpentMinutes?: number; // Time spent from database
}

export const TaskTimeDisplay = ({ 
  taskId, 
  startTime, 
  estimatedTime, 
  isActiveCommitted,
  isUltraCompact = false,
  pausedTasks,
  totalPausedTime = 0,
  isPaused = false,
  timeSpentMinutes = 0
}: TaskTimeDisplayProps) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showTimerFormat, setShowTimerFormat] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Update current time and handle format switching for active tasks
  useEffect(() => {
    if (!isActiveCommitted) return;

    // Set initial current time when becoming active
    setCurrentTime(Date.now());

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000); // Update every second for smooth timer

    return () => clearInterval(interval);
  }, [isActiveCommitted]);

  // Switch between formats every 30 seconds for active tasks with smooth transition
  useEffect(() => {
    if (!isActiveCommitted || isPaused) return;

    const formatSwitchInterval = setInterval(() => {
      setIsTransitioning(true);
      
      // After fade out, switch format and fade back in
      setTimeout(() => {
        setShowTimerFormat(prev => !prev);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 150); // Half transition time for fade in
      }, 150); // Half transition time for fade out
    }, 30000); // Switch every 30 seconds

    return () => clearInterval(formatSwitchInterval);
  }, [isActiveCommitted, isPaused]);

  // Helper function to format timestamp to HH:MM format
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Calculate original estimated finish time (fixed, doesn't change)
  const getOriginalEstimatedFinishTime = (): number | null => {
    if (!estimatedTime) return null;
    const durationMinutes = parseTimeToMinutes(estimatedTime);
    if (!durationMinutes) return null;
    
    // Original estimated finish = start time + estimated duration
    return startTime + (durationMinutes * 60000);
  };

  // Calculate adjusted finish time accounting for paused time
  const getAdjustedEstimatedFinishTime = (): number | null => {
    const originalFinishTime = getOriginalEstimatedFinishTime();
    if (!originalFinishTime) return null;
    
    // Add total paused time to extend the finish time
    return originalFinishTime + totalPausedTime;
  };

  // Helper function to format elapsed time duration
  const formatElapsedTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Helper function to calculate elapsed time from start (in minutes)
  const getElapsedMinutes = (): number => {
    const elapsedMs = currentTime - startTime - totalPausedTime;
    return Math.max(0, Math.floor(elapsedMs / 60000));
  };

  // Get session elapsed time using taskTimers (same as TaskActions)
  const getSessionElapsedMs = (): number => {
    const timerState = taskTimers.get(taskId);
    if (!timerState) return 0;
    
    // If paused, return the frozen elapsed time
    if (isPaused) {
      return timerState.baseElapsedMs - timerState.sessionStartElapsedMs;
    }
    
    return timerState.currentSessionStart 
      ? (timerState.baseElapsedMs - timerState.sessionStartElapsedMs) + (currentTime - timerState.currentSessionStart)
      : (timerState.baseElapsedMs - timerState.sessionStartElapsedMs);
  };

  // Format elapsed time for timer display (like TaskActions)
  const formatElapsedTimer = (elapsedMs: number): string => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // If task is not active but has time spent, show elapsed time vs estimate
  if (!isActiveCommitted && timeSpentMinutes > 0) {
    const estimatedMinutes = estimatedTime ? parseTimeToMinutes(estimatedTime) : null;
    if (estimatedMinutes) {
      return (
        <span className="text-xs" style={{ color: (isUltraCompact || isPaused) ? '#989898' : '#989898' }}>
          {formatElapsedTime(timeSpentMinutes)} of {formatElapsedTime(estimatedMinutes)}
        </span>
      );
    }
    return (
      <span className="text-xs" style={{ color: (isUltraCompact || isPaused) ? '#989898' : '#989898' }}>
        {formatElapsedTime(timeSpentMinutes)} spent
      </span>
    );
  }

  // Check if we're in overtime (1 minute past adjusted estimated finish time)
  const originalEstimatedFinishTime = getOriginalEstimatedFinishTime();
  const adjustedEstimatedFinishTime = getAdjustedEstimatedFinishTime();
  const isOvertime = adjustedEstimatedFinishTime && currentTime > (adjustedEstimatedFinishTime + 60000);

  // Always show the actual start time (when the task was started)
  const displayStartTime = startTime;
  const startTimeFormatted = formatTime(displayStartTime);
  const adjustedEstimatedFinishTimeFormatted = adjustedEstimatedFinishTime ? formatTime(adjustedEstimatedFinishTime) : null;
  const currentTimeFormatted = formatTime(currentTime);

  // If no estimated time, show simple start time
  if (!estimatedTime || !adjustedEstimatedFinishTimeFormatted) {
    return (
      <span className="text-xs" style={{ color: (isUltraCompact || isPaused) ? '#989898' : '#989898' }}>
        {startTimeFormatted}
      </span>
    );
  }

  // For active committed tasks, alternate between formats with smooth transition
  if (isActiveCommitted && estimatedTime) {
    const estimatedMinutes = parseTimeToMinutes(estimatedTime);
    const sessionElapsedMs = getSessionElapsedMs();
    const timerDisplay = formatElapsedTimer(sessionElapsedMs);
    const estimatedFormatted = formatElapsedTime(estimatedMinutes);
    
    // Determine which format to show (hover overrides the automatic switching)
    const shouldShowTimerFormat = isHovered ? !showTimerFormat : showTimerFormat;
    
    // Calculate opacity based on transition state
    const opacity = isTransitioning ? 0 : (isHovered ? 0.8 : 1);
    
    if (shouldShowTimerFormat && estimatedMinutes) {
      // Show timer format: "3:45 of 30m"
      return (
        <span 
          className="text-xs cursor-pointer transition-opacity duration-300 ease-in-out" 
          style={{ 
            color: (isUltraCompact || isPaused) ? '#989898' : '#989898',
            opacity: opacity
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {timerDisplay} of {estimatedFormatted}
          {isOvertime && (() => {
            const overtimeMs = currentTime - adjustedEstimatedFinishTime!;
            const overtimeMinutes = Math.floor(overtimeMs / 60000);
            const overtimeHours = Math.floor(overtimeMinutes / 60);
            const remainingMinutes = overtimeMinutes % 60;
            
            let overtimeDisplay = '';
            if (overtimeHours > 0) {
              overtimeDisplay = `+${overtimeHours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
            } else {
              overtimeDisplay = `+${overtimeMinutes}m`;
            }
            
            return (
              <span style={{ 
                color: '#f59e0b',
                marginLeft: '4px',
                fontWeight: '600'
              }}>
                ({overtimeDisplay})
              </span>
            );
          })()}
        </span>
      );
    } else {
      // Show time format: "11:00 → 11:30"
      return (
        <span 
          className="text-xs cursor-pointer transition-opacity duration-300 ease-in-out" 
          style={{ 
            color: (isUltraCompact || isPaused) ? '#989898' : '#989898',
            opacity: opacity
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {startTimeFormatted} → {adjustedEstimatedFinishTimeFormatted}
          {isOvertime && (() => {
            const overtimeMs = currentTime - adjustedEstimatedFinishTime!;
            const overtimeMinutes = Math.floor(overtimeMs / 60000);
            const overtimeHours = Math.floor(overtimeMinutes / 60);
            const remainingMinutes = overtimeMinutes % 60;
            
            let overtimeDisplay = '';
            if (overtimeHours > 0) {
              overtimeDisplay = `+${overtimeHours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
            } else {
              overtimeDisplay = `+${overtimeMinutes}m`;
            }
            
            return (
              <span style={{ 
                color: '#f59e0b',
                marginLeft: '4px',
                fontWeight: '600'
              }}>
                ({overtimeDisplay})
              </span>
            );
          })()}
        </span>
      );
    }
  }

  // Normal state: show start → adjusted estimated finish (accounts for paused time)
  if (!isOvertime) {
    return (
      <span 
        className="text-xs transition-opacity duration-1000 ease-in-out" 
        style={{ color: (isUltraCompact || isPaused) ? '#989898' : '#989898' }}
      >
        {startTimeFormatted} → {adjustedEstimatedFinishTimeFormatted}
      </span>
    );
  }

  // Overtime state: show start → adjusted estimated +overtime
  const overtimeMs = currentTime - adjustedEstimatedFinishTime!;
  const overtimeMinutes = Math.floor(overtimeMs / 60000);
  const overtimeHours = Math.floor(overtimeMinutes / 60);
  const remainingMinutes = overtimeMinutes % 60;
  
  let overtimeDisplay = '';
  if (overtimeHours > 0) {
    overtimeDisplay = `+${overtimeHours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
  } else {
    overtimeDisplay = `+${overtimeMinutes}m`;
  }
  
  if (isUltraCompact) {
    // Ultra-compact: stack overtime above the main time
    return (
      <div className="flex flex-col items-end text-xs">
        <span 
          style={{ 
            color: (isUltraCompact || isPaused) ? '#989898' : '#7C7C7C',
            backgroundColor: (isUltraCompact || isPaused) ? 'rgba(255, 193, 7, 0.3)' : 'rgba(255, 193, 7, 0.6)',
            padding: '3px 6px',
            borderRadius: '2px',
            fontWeight: '600',
            fontSize: '10px'
          }}
        >
          {overtimeDisplay}
        </span>
        <span style={{ color: (isUltraCompact || isPaused) ? '#989898' : '#989898' }}>
          {startTimeFormatted} → {adjustedEstimatedFinishTimeFormatted}
        </span>
      </div>
    );
  }

  // Normal view: inline overtime
  return (
    <span className="text-xs" style={{ color: (isUltraCompact || isPaused) ? '#989898' : '#7C7C7C' }}>
      {startTimeFormatted} → {adjustedEstimatedFinishTimeFormatted}
      <span style={{ color: (isUltraCompact || isPaused) ? '#989898' : '#989898' }}>  </span>
      <span 
        style={{ 
          color: (isUltraCompact || isPaused) ? '#989898' : '#7C7C7C',
          backgroundColor: (isUltraCompact || isPaused) ? 'rgba(255, 193, 7, 0.3)' : 'rgba(255, 193, 7, 0.6)',
          padding: '1px 6px',
          borderRadius: '2px',
          fontWeight: '600'
        }}
      >
        {overtimeDisplay}
      </span>
    </span>
  );
};