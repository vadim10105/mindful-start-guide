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

  // Calculate estimated finish time
  const getEstimatedFinishTime = (): number | null => {
    if (!estimatedTime) return null;
    const durationMinutes = parseTimeToMinutes(estimatedTime);
    if (!durationMinutes) return null;
    
    // Calculate elapsed time since the (possibly adjusted) start time
    const elapsedMs = currentTime - startTime;
    const elapsedMinutes = elapsedMs / 60000;
    
    // Calculate remaining time
    const remainingMinutes = Math.max(0, durationMinutes - elapsedMinutes);
    
    // Estimated finish time = current time + remaining time  
    return currentTime + (remainingMinutes * 60000);
  };

  // Check if we're in overtime
  const estimatedFinishTime = getEstimatedFinishTime();
  const isOvertime = estimatedFinishTime && currentTime > estimatedFinishTime;

  // For active tasks, show current time as start time for better UX
  // For inactive tasks, show the actual start time
  const displayStartTime = isActiveCommitted ? currentTime : startTime;
  const startTimeFormatted = formatTime(displayStartTime);
  const estimatedFinishTimeFormatted = estimatedFinishTime ? formatTime(estimatedFinishTime) : null;
  const currentTimeFormatted = formatTime(currentTime);

  // If no estimated time, show simple start time
  if (!estimatedTime || !estimatedFinishTimeFormatted) {
    return (
      <span className="text-sm">
        {startTimeFormatted}
      </span>
    );
  }

  // Normal state: show start → estimated finish
  if (!isOvertime) {
    return (
      <span className="text-sm">
        {startTimeFormatted} → {estimatedFinishTimeFormatted}
      </span>
    );
  }

  // Overtime state: show start → current ~~estimated~~
  return (
    <span className="text-sm">
      <span style={{ color: '#fbbf24' }}>
        {startTimeFormatted}
      </span>
      <span style={{ color: '#fbbf24' }}> → </span>
      <span style={{ color: '#fbbf24' }}>
        {currentTimeFormatted}
      </span>
      <span style={{ color: 'hsl(220 10% 50%)' }}>  </span>
      <span 
        style={{ 
          color: 'hsl(220 10% 60%)', 
          textDecoration: 'line-through' 
        }}
      >
        ({estimatedFinishTimeFormatted})
      </span>
    </span>
  );
};