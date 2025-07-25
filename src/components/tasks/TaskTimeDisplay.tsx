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
    return startTime + (durationMinutes * 60000); // Convert minutes to milliseconds
  };

  // Check if we're in overtime
  const estimatedFinishTime = getEstimatedFinishTime();
  const isOvertime = estimatedFinishTime && currentTime > estimatedFinishTime;

  // Format start time
  const startTimeFormatted = formatTime(startTime);
  const estimatedFinishTimeFormatted = estimatedFinishTime ? formatTime(estimatedFinishTime) : null;
  const currentTimeFormatted = formatTime(currentTime);

  // If no estimated time, show simple start time
  if (!estimatedTime || !estimatedFinishTimeFormatted) {
    return (
      <span className="text-sm" style={{ color: 'hsl(48 100% 96% / 0.7)' }}>
        {startTimeFormatted}
      </span>
    );
  }

  // Normal state: show start → estimated finish
  if (!isOvertime) {
    return (
      <span className="text-sm" style={{ color: 'hsl(48 100% 96% / 0.7)' }}>
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
      <span style={{ color: 'hsl(48 100% 96% / 0.7)' }}>  </span>
      <span 
        style={{ 
          color: 'hsl(48 100% 96% / 0.5)', 
          textDecoration: 'line-through' 
        }}
      >
        ({estimatedFinishTimeFormatted})
      </span>
    </span>
  );
};