import { useState, useEffect } from 'react';
import { parseTimeToMinutes } from '@/utils/timeUtils';

interface TaskTimeDisplayProps {
  taskId: string;
  startTime: number;
  estimatedTime?: string;
  isActiveCommitted: boolean;
  isUltraCompact?: boolean;
  pausedTasks?: Map<string, number>;
  totalPausedTime?: number; // Total time this task has been paused (in ms)
  isPaused?: boolean;
}

export const TaskTimeDisplay = ({ 
  taskId, 
  startTime, 
  estimatedTime, 
  isActiveCommitted,
  isUltraCompact = false,
  pausedTasks,
  totalPausedTime = 0,
  isPaused = false
}: TaskTimeDisplayProps) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every minute, but only for active committed card
  useEffect(() => {
    if (!isActiveCommitted) return;

    // Set initial current time when becoming active
    setCurrentTime(Date.now());

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isActiveCommitted]);

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
      <span className="text-xs" style={{ color: isPaused ? '#FFFFFF' : '#7C7C7C' }}>
        {startTimeFormatted}
      </span>
    );
  }

  // Normal state: show start → adjusted estimated finish (accounts for paused time)
  if (!isOvertime) {
    return (
      <span className="text-xs" style={{ color: isPaused ? '#FFFFFF' : '#7C7C7C' }}>
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
            color: isPaused ? '#FFFFFF' : 'hsl(220 10% 40%)',
            fontSize: '10px'
          }}
        >
          {overtimeDisplay}
        </span>
        <span style={{ color: isPaused ? '#FFFFFF' : 'hsl(220 10% 50%)' }}>
          {startTimeFormatted} → {adjustedEstimatedFinishTimeFormatted}
        </span>
      </div>
    );
  }

  // Normal view: inline overtime
  return (
    <span className="text-xs" style={{ color: isPaused ? '#FFFFFF' : '#7C7C7C' }}>
      {startTimeFormatted} → {adjustedEstimatedFinishTimeFormatted}
      <span style={{ color: isPaused ? '#FFFFFF' : 'hsl(220 10% 50%)' }}>  </span>
      <span 
        style={{ 
          color: isPaused ? '#FFFFFF' : 'hsl(220 10% 45%)', 
          opacity: 0.6
        }}
      >
        {overtimeDisplay}
      </span>
    </span>
  );
};