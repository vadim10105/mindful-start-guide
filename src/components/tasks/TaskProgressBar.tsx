import { useState, useEffect } from 'react';
import { parseTimeToMinutes } from '@/utils/timeUtils';

interface TaskProgressBarProps {
  taskId: string;
  startTime?: number;
  estimatedTime?: string;
  isActiveCommitted: boolean;
  isPauseHovered?: boolean;
}

export const TaskProgressBar = ({ 
  taskId, 
  startTime, 
  estimatedTime, 
  isActiveCommitted,
  isPauseHovered = false
}: TaskProgressBarProps) => {
  // Don't render if no start time or estimated time - do this BEFORE any hooks
  if (!startTime || !estimatedTime) {
    return null;
  }

  const estimatedMinutes = parseTimeToMinutes(estimatedTime);
  if (!estimatedMinutes) return null;

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

  // Calculate elapsed time in minutes and seconds
  const elapsedMs = currentTime - startTime;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const elapsedSeconds = elapsedMs / 1000; // Total elapsed time in seconds
  const estimatedSeconds = estimatedMinutes * 60; // Convert estimated minutes to seconds
  
  // Calculate progress percentage (capped at 100% for visual)
  const progressPercentage = Math.min((elapsedSeconds / estimatedSeconds) * 100, 100);
  
  // Check if we're overtime
  const isOvertime = elapsedMinutes > estimatedMinutes;

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
  const estimatedFinishTime = startTime + (estimatedMinutes * 60000);
  const startTimeFormatted = formatTime(startTime);
  const estimatedFinishTimeFormatted = formatTime(estimatedFinishTime);

  // Segmentation logic for tasks 39+ minutes
  const shouldSegment = estimatedMinutes >= 39;
  const segments: number[] = [];
  
  if (shouldSegment) {
    const fullSegments = Math.floor(estimatedMinutes / 20);
    const remainingMinutes = estimatedMinutes % 20;
    
    // Add 20-minute segments
    for (let i = 0; i < fullSegments; i++) {
      segments.push(20);
    }
    
    // Add remaining time as last segment if any
    if (remainingMinutes > 0) {
      segments.push(remainingMinutes);
    }
  }

  // Calculate which segments are filled and how much
  const getSegmentProgress = () => {
    if (!shouldSegment) return [];
    
    const segmentProgress: number[] = [];
    let remainingElapsedMinutes = elapsedMinutes;
    
    for (const segmentDuration of segments) {
      if (remainingElapsedMinutes <= 0) {
        segmentProgress.push(0);
      } else if (remainingElapsedMinutes >= segmentDuration) {
        segmentProgress.push(100);
        remainingElapsedMinutes -= segmentDuration;
      } else {
        segmentProgress.push((remainingElapsedMinutes / segmentDuration) * 100);
        remainingElapsedMinutes = 0;
      }
    }
    
    return segmentProgress;
  };

  const segmentProgress = getSegmentProgress();

  return (
    <div className="mx-4 mb-4">
      {/* Progress Bar with Text Inside */}
      {shouldSegment ? (
        // Segmented progress bar for tasks 39+ minutes
        <div className="w-full h-8 relative flex rounded-full overflow-hidden">
          {segments.map((segmentDuration, index) => {
            const segmentWidth = (segmentDuration / estimatedMinutes) * 100;
            const segmentFillPercentage = segmentProgress[index] || 0;
            
            return (
              <div
                key={index}
                className="h-full relative flex-shrink-0 transition-all duration-700"
                style={{ width: `${segmentWidth}%` }}
              >
                {/* Segment background and fill */}
                <div className="w-full h-full relative">
                  {/* Normal state background */}
                  <div 
                    className={`absolute inset-0 transition-opacity duration-700 ease-out ${isPauseHovered ? 'opacity-0' : 'opacity-100'}`}
                    style={{
                      background: `linear-gradient(to right, ${
                        isOvertime ? '#f59e0b' : 
                        isActiveCommitted ? 'hsl(48 100% 50%)' : '#9ca3af'
                      } ${segmentFillPercentage}%, ${
                        isOvertime ? 'rgba(245, 158, 11, 0.3)' : 
                        isActiveCommitted ? 'hsl(48 100% 85%)' : 'rgba(107, 114, 128, 0.3)'
                      } ${segmentFillPercentage}%)`
                    }}
                  />
                  {/* Pause hover state background */}
                  <div 
                    className={`absolute inset-0 transition-opacity duration-700 ease-out ${isPauseHovered ? 'opacity-100' : 'opacity-0'}`}
                    style={{
                      background: `linear-gradient(to right, #6b7280 ${segmentFillPercentage}%, rgba(107, 114, 128, 0.3) ${segmentFillPercentage}%)`
                    }}
                  />
                </div>
                
                {/* Segment divider (except for last segment) */}
                {index < segments.length - 1 && (
                  <div className="absolute right-0 top-0 w-px h-full bg-gray-300 opacity-30" />
                )}
              </div>
            );
          })}
          
          {/* Text inside the bar - positioned on the right */}
          <div className="absolute inset-0 flex items-center justify-end pr-3">
            <span className={`text-xs font-medium ${
              isOvertime ? 'text-white' : 'text-gray-700'
            }`}>
              {startTimeFormatted} → {estimatedFinishTimeFormatted}
            </span>
          </div>
        </div>
      ) : (
        // Single progress bar for tasks under 39 minutes
        <div className="w-full rounded-full h-8 relative">
          {/* Normal state background */}
          <div 
            className={`absolute inset-0 rounded-full transition-opacity duration-700 ease-out ${isPauseHovered ? 'opacity-0' : 'opacity-100'}`}
            style={{
              background: `linear-gradient(to right, ${
                isOvertime ? '#f59e0b' : 
                isActiveCommitted ? 'hsl(48 100% 50%)' : '#9ca3af'
              } ${progressPercentage}%, ${
                isOvertime ? 'rgba(245, 158, 11, 0.3)' : 
                isActiveCommitted ? 'hsl(48 100% 85%)' : 'rgba(107, 114, 128, 0.3)'
              } ${progressPercentage}%)`
            }}
          />
          {/* Pause hover state background */}
          <div 
            className={`absolute inset-0 rounded-full transition-opacity duration-700 ease-out ${isPauseHovered ? 'opacity-100' : 'opacity-0'}`}
            style={{
              background: `linear-gradient(to right, #6b7280 ${progressPercentage}%, rgba(107, 114, 128, 0.3) ${progressPercentage}%)`
            }}
          />
          {/* Text inside the bar - positioned on the right */}
          <div className="absolute inset-0 flex items-center justify-end pr-3">
            <span className={`text-xs font-medium ${
              isOvertime ? 'text-white' : 'text-gray-700'
            }`}>
              {startTimeFormatted} → {estimatedFinishTimeFormatted}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};