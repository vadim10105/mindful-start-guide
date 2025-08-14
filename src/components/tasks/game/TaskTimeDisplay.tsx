import { useState, useEffect } from 'react';
import { parseTimeToMinutes } from '@/utils/timeUtils';

interface TaskTimeDisplayProps {
  taskId: string;
  startTime: number;
  estimatedTime?: string;
  isActiveCommitted: boolean;
  isUltraCompact?: boolean;
}

export const TaskTimeDisplay = ({ 
  taskId, 
  startTime, 
  estimatedTime, 
  isActiveCommitted,
  isUltraCompact = false
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
      <span className="text-xs" style={{ color: '#7C7C7C' }}>
        {startTimeFormatted}
      </span>
    );
  }

  // Normal state: show start → estimated finish
  if (!isOvertime) {
    return (
      <span className="text-xs" style={{ color: '#7C7C7C' }}>
        {startTimeFormatted} → {originalEstimatedFinishTimeFormatted}
      </span>
    );
  }

  // Overtime state: show start → original estimated +overtime
  const overtimeMs = currentTime - originalEstimatedFinishTime;
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
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '10px'
          }}
        >
          {overtimeDisplay}
        </span>
        <span style={{ color: 'white' }}>
          {startTimeFormatted} → {originalEstimatedFinishTimeFormatted}
        </span>
      </div>
    );
  }

  // Normal view: inline overtime
  return (
    <span className="text-xs" style={{ color: '#7C7C7C' }}>
      {startTimeFormatted} → {originalEstimatedFinishTimeFormatted}
      <span style={{ color: 'hsl(220 10% 50%)' }}>  </span>
      <span 
        style={{ 
          color: 'hsl(220 10% 45%)', 
          opacity: 0.6
        }}
      >
        {overtimeDisplay}
      </span>
    </span>
  );
};