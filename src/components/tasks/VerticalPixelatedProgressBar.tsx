import { useEffect, useState } from "react";

interface VerticalPixelatedProgressBarProps {
  progress: number; // 0-100
  isVisible: boolean;
  onMilestone?: (milestone: number) => void;
}

export const VerticalPixelatedProgressBar = ({ 
  progress, 
  isVisible, 
  onMilestone 
}: VerticalPixelatedProgressBarProps) => {
  const [lastMilestone, setLastMilestone] = useState(0);
  
  const totalBlocks = 20; // 20 blocks for 20 minutes (1 block per minute)
  const filledBlocks = Math.floor((progress / 100) * totalBlocks);

  // Check for milestones
  useEffect(() => {
    const currentMilestone = Math.floor(progress / 5) * 5; // 5-minute intervals
    if (currentMilestone > lastMilestone && currentMilestone > 0) {
      setLastMilestone(currentMilestone);
      onMilestone?.(currentMilestone);
    }
  }, [progress, lastMilestone, onMilestone]);

  if (!isVisible) return null;

  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-20">
      <div className="flex flex-col-reverse gap-0.5 p-3 bg-card/90 backdrop-blur-sm border border-border rounded-lg shadow-lg">
        {Array.from({ length: totalBlocks }, (_, index) => {
          const blockIndex = index;
          const isFilled = blockIndex < filledBlocks;
          
          return (
            <div
              key={blockIndex}
              className={`w-4 h-3 transition-all duration-300 ${
                isFilled
                  ? 'bg-primary shadow-sm shadow-primary/50'
                  : 'bg-muted border border-muted-foreground/20'
              }`}
              style={{
                // Pixelated effect
                imageRendering: 'pixelated',
                boxShadow: isFilled 
                  ? '0 0 4px hsl(var(--primary) / 0.3), inset 0 1px 0 hsl(var(--primary) / 0.8)' 
                  : 'none'
              }}
            />
          );
        })}
        
        {/* Progress indicator text */}
        <div className="text-xs text-center text-muted-foreground mt-2 min-w-[2rem]">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
};