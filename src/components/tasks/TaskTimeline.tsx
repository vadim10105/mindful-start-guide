import React, { useState, useEffect } from 'react';
import { calculateTimelineBlocks, type TimelineBlock } from '@/utils/timeUtils';
import { supabase } from '@/integrations/supabase/client';

interface TaskTimelineProps {
  tasks: string[];
  timeEstimates: Record<string, string>;
  hoveredTaskIndex?: number;
  className?: string;
}

export function TaskTimeline({ 
  tasks, 
  timeEstimates, 
  hoveredTaskIndex, 
  className = "" 
}: TaskTimelineProps) {
  const [simplifiedTasks, setSimplifiedTasks] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch simplified task descriptions with caching
  useEffect(() => {
    if (tasks.length === 0) return;

    const fetchSimplifiedTasks = async () => {
      // Check cache first - use sorted copy for cache key without modifying original
      const cacheKey = `simplified_tasks_${JSON.stringify([...tasks].sort())}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          setSimplifiedTasks(cachedData);
          return;
        } catch (e) {
          // Invalid cache, continue to fetch
        }
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('process-brain-dump', {
          body: { 
            simplifyTasks: true,
            tasks: tasks
          }
        });

        if (error) {
          console.error('Error simplifying tasks:', error);
          return;
        }

        if (data?.simplifiedTasks) {
          setSimplifiedTasks(data.simplifiedTasks);
          // Cache the result
          localStorage.setItem(cacheKey, JSON.stringify(data.simplifiedTasks));
        }
      } catch (error) {
        console.error('Failed to simplify tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSimplifiedTasks();
  }, [tasks]);

  const blocks = calculateTimelineBlocks(tasks, timeEstimates);
  
  if (blocks.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="text-xs font-medium text-muted-foreground mb-4 text-center">
          DAY TIMELINE
        </div>
        <div className="text-xs text-muted-foreground/60 text-center">
          Add tasks to see timeline
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card/30 rounded-lg h-full flex flex-col ${className}`}>
      {/* Timeline Blocks - Fit to available space */}
      <div className="flex-1 flex flex-col px-4 py-4 gap-3">
        {blocks.map((block, index) => {
          // Calculate proportional height based on duration
          const totalMinutes = blocks.reduce((sum, b) => sum + b.durationMinutes, 0);
          const proportion = block.durationMinutes / totalMinutes;
          const isLastTask = index === blocks.length - 1;
          
          return (
            <TimelineBlockItem
              key={`${block.taskName}-${index}`}
              block={block}
              isHovered={hoveredTaskIndex === index}
              index={index}
              simplifiedName={simplifiedTasks[block.taskName]}
              isLoadingSimplified={isLoading}
              totalTasks={blocks.length}
              heightProportion={proportion}
              showEndTime={isLastTask}
            />
          );
        })}
      </div>
    </div>
  );
}

interface TimelineBlockItemProps {
  block: TimelineBlock;
  isHovered: boolean;
  index: number;
  simplifiedName?: string;
  isLoadingSimplified?: boolean;
  totalTasks: number;
  heightProportion: number;
  showEndTime?: boolean;
}

function TimelineBlockItem({ block, isHovered, simplifiedName, isLoadingSimplified, totalTasks, heightProportion, showEndTime }: TimelineBlockItemProps) {
  // Use proportional height based on task duration
  
  return (
    <div 
      className="flex items-start gap-3" 
      style={{ flex: `${heightProportion} 0 0` }}
    >
      {/* Task Block */}
      <div 
        className={`flex-1 rounded-lg px-4 py-4 bg-muted/20 transition-all duration-200 flex h-full ${
          isHovered ? 'bg-primary/20 border border-primary/30' : ''
        }`}
      >
        <div className="flex flex-col justify-center w-full h-full">
          <div className="text-sm text-foreground/65 leading-tight font-normal">
            {isLoadingSimplified ? (
              <div className="animate-pulse bg-muted/40 rounded h-4 w-20"></div>
            ) : (
              simplifiedName || block.simplifiedName
            )}
          </div>
        </div>
      </div>
      
      {/* Time Marker */}
      <div className="w-12 flex-shrink-0 text-left flex flex-col justify-between h-full">
        <div className="text-xs text-muted-foreground/60 font-mono">
          {block.startTimeString}
        </div>
        {showEndTime && (
          <div className="text-xs text-muted-foreground/60 font-mono">
            {block.endTimeString}
          </div>
        )}
      </div>
    </div>
  );
}