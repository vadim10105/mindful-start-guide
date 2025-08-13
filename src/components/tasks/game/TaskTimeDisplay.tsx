import { useState, useEffect } from 'react';
import { parseTimeToMinutes } from '@/utils/timeUtils';

interface TaskTimeDisplayProps {
  taskId: string;
  startTime: number;
  estimatedTime?: string;
  isActiveCommitted: boolean;
}

export const TaskTimeDisplay = ({ 
  taskId, 
  startTime, 
  estimatedTime, 
  isActiveCommitted 
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

  // Check if we're in overtime (1 minute past original estimated finish time)
  const originalEstimatedFinishTime = getOriginalEstimatedFinishTime();
  const isOvertime = originalEstimatedFinishTime && currentTime > (originalEstimatedFinishTime + 60000);

  // Always show the actual start time (when the task was started)
  const displayStartTime = startTime;
  const startTimeFormatted = formatTime(displayStartTime);
  const originalEstimatedFinishTimeFormatted = originalEstimatedFinishTime ? formatTime(originalEstimatedFinishTime) : null;
  const currentTimeFormatted = formatTime(currentTime);

  // If no estimated time, show simple start time
  if (!estimatedTime || !originalEstimatedFinishTimeFormatted) {
    return (
      <span className="text-xs">
        {startTimeFormatted}
      </span>
    );
  }

  // Normal state: show start → estimated finish
  if (!isOvertime) {
    return (
      <span className="text-xs">
        {startTimeFormatted} → {originalEstimatedFinishTimeFormatted}
      </span>
    );
  }

  // Overtime state: show start → current ~~original estimated~~
  return (
    <span className="text-sm">
      {startTimeFormatted} → {currentTimeFormatted}
      <span style={{ color: 'hsl(220 10% 50%)' }}>  </span>
      <span 
        style={{ 
          color: 'hsl(220 10% 45%)', 
          textDecoration: 'line-through',
          opacity: 0.6
        }}
      >
        ({originalEstimatedFinishTimeFormatted})
      </span>
    </span>
  );
};