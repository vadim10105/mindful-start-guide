import { useState, useEffect } from 'react';
import { parseTimeToMinutes } from '@/utils/timeUtils';

interface TaskProgressBarProps {
  taskId: string;
  startTime?: number;
  estimatedTime?: string;
  isActiveCommitted: boolean;
}

export const TaskProgressBar = ({ 
  taskId, 
  startTime, 
  estimatedTime, 
  isActiveCommitted 
}: TaskProgressBarProps) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every minute, but only for active committed card
  useEffect(() => {
    if (!isActiveCommitted || !startTime) return;

    // Set initial current time when becoming active
    setCurrentTime(Date.now());

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isActiveCommitted, startTime]);

  // Don't render if no start time or estimated time
  if (!startTime || !estimatedTime) {
    return null;
  }

  const estimatedMinutes = parseTimeToMinutes(estimatedTime);
  if (!estimatedMinutes) return null;

  // Calculate elapsed time in minutes and seconds
  const elapsedMs = currentTime - startTime;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const elapsedSeconds = elapsedMs / 1000; // Total elapsed time in seconds
  const estimatedSeconds = estimatedMinutes * 60; // Convert estimated minutes to seconds
  
  // Calculate progress percentage (capped at 100% for visual)
  const progressPercentage = Math.min((elapsedSeconds / estimatedSeconds) * 100, 100);
  
  // Check if we're overtime
  const isOvertime = elapsedMinutes > estimatedMinutes;

  return (
    <div className="mx-4 mb-4">
      {/* Progress Bar with Text Inside */}
      <div 
        className="w-full rounded-full h-8 relative transition-all duration-300"
        style={{
          background: `linear-gradient(to right, ${
            isOvertime ? '#f59e0b' : '#9ca3af'
          } ${progressPercentage}%, rgba(107, 114, 128, 0.3) ${progressPercentage}%)`
        }}
      >
        {/* Text inside the bar - positioned on the right */}
        <div className="absolute inset-0 flex items-center justify-end pr-3">
          <span className={`text-xs font-medium ${
            isOvertime ? 'text-white' : 'text-gray-200'
          }`}>
            {elapsedMinutes}m of progress
          </span>
        </div>
      </div>
    </div>
  );
};