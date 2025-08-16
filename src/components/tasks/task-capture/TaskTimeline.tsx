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
    <div 
      className={`h-full flex flex-col ${className}`}
      style={{
        background: 'var(--toggle-bg)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        border: '1px solid var(--toggle-border)'
      }}
    >
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
  heightProportion: number;
  showEndTime?: boolean;
}

function TimelineBlockItem({ block, isHovered, simplifiedName, isLoadingSimplified, heightProportion, showEndTime }: TimelineBlockItemProps) {
  // Use proportional height based on task duration
  
  return (
    <div 
      className="flex items-start gap-3" 
      style={{ flex: `${heightProportion} 0 0` }}
    >
      {/* Task Block */}
      <div 
        className="flex-1 px-4 py-4 transition-all duration-200 flex h-full"
        style={{
          borderRadius: '12px',
          background: isHovered ? 'var(--toggle-active-bg)' : 'rgba(255, 255, 255, 0.1)',
          backdropFilter: isHovered ? 'blur(5px)' : 'none',
          border: isHovered ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent'
        }}
      >
        <div className="flex flex-col justify-center w-full h-full">
          <div className="text-sm leading-tight font-normal" style={{ color: 'white' }}>
            {isLoadingSimplified ? (
              <div className="animate-pulse rounded h-4 w-20" style={{ background: 'rgba(255, 255, 255, 0.2)' }}></div>
            ) : (
              simplifiedName || block.simplifiedName
            )}
          </div>
        </div>
      </div>
      
      {/* Time Marker */}
      <div className="w-12 flex-shrink-0 text-left flex flex-col justify-between h-full">
        <div className="text-xs font-mono" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          {block.startTimeString}
        </div>
        {showEndTime && (
          <div className="text-xs font-mono" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            {block.endTimeString}
          </div>
        )}
      </div>
    </div>
  );
}