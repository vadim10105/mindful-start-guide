import { useState, useEffect } from 'react';
import { parseTimeToMinutes } from '@/utils/timeUtils';

interface TaskProgressBarProps {
  taskId: string;
  startTime?: number;
  estimatedTime?: string;
  isActiveCommitted: boolean;
  isPauseHovered?: boolean;
  pausedTime?: number;
}

export const TaskProgressBar = ({ 
  taskId, 
  startTime, 
  estimatedTime, 
  isActiveCommitted,
  isPauseHovered = false,
  pausedTime = 0
}: TaskProgressBarProps) => {
  // Don't render if no start time or estimated time - do this BEFORE any hooks
  if (!startTime || !estimatedTime) {
    return null;
  }

  const estimatedMinutes = parseTimeToMinutes(estimatedTime);
  if (!estimatedMinutes) return null;

  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for both timer display and progress calculation
  useEffect(() => {
    if (!isActiveCommitted || !startTime) return;

    // Set initial current time when becoming active
    setCurrentTime(Date.now());

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isActiveCommitted, startTime]);

  // Calculate elapsed time in minutes and seconds for progress bar
  const elapsedMs = currentTime - startTime;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const elapsedSeconds = elapsedMs / 1000; // Total elapsed time in seconds
  const estimatedSeconds = estimatedMinutes * 60; // Convert estimated minutes to seconds
  
  // Calculate progress percentage (capped at 100% for visual)
  const progressPercentage = Math.min((elapsedSeconds / estimatedSeconds) * 100, 100);
  
  // Check if we're overtime
  const isOvertime = elapsedMinutes > estimatedMinutes;

  // Format elapsed time for timer display in MM:SS
  const formatElapsedTime = (elapsedMs: number): string => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const elapsedTimeDisplay = formatElapsedTime(elapsedMs);
  
  // Dim text after 1 minute (60 seconds)
  const shouldDimText = elapsedMs > 60000;

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
      {/* Progress Bar with Timer Text Inside */}
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
                  <div className="absolute right-0 top-0 w-1 h-full" style={{ backgroundColor: 'hsl(48 20% 97%)' }} />
                )}
              </div>
            );
          })}
          
          {/* Timer text inside the bar - positioned on the right */}
          <div className="absolute inset-0 flex items-center justify-end pr-3 group">
            <span className={`text-xs font-medium transition-opacity duration-300 ${
              isOvertime ? 'text-white' : 'text-gray-700'
            } ${shouldDimText ? 'opacity-30 group-hover:opacity-100' : 'opacity-100'}`}>
              {elapsedTimeDisplay}
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
          {/* Timer text inside the bar - positioned on the right */}
          <div className="absolute inset-0 flex items-center justify-end pr-3 group">
            <span className={`text-xs font-medium transition-opacity duration-300 ${
              isOvertime ? 'text-white' : 'text-gray-700'
            } ${shouldDimText ? 'opacity-30 group-hover:opacity-100' : 'opacity-100'}`}>
              {elapsedTimeDisplay}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};