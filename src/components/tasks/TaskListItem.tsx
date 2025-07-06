import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { Heart, Clock, Zap, GripVertical } from "lucide-react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskListItemProps {
  task: string;
  index: number;
  onTaskUpdate: (updatedTask: { is_liked?: boolean; is_urgent?: boolean; is_quick?: boolean }) => void;
  // onReorder is no longer directly used by TaskListItem, but by the parent DndContext
}

export const TaskListItem = ({ task, index, onTaskUpdate }: TaskListItemProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isQuick, setIsQuick] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Update parent whenever any tag changes
  useEffect(() => {
    onTaskUpdate({ is_liked: isLiked, is_urgent: isUrgent, is_quick: isQuick });
  }, [isLiked, isUrgent, isQuick, onTaskUpdate]);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="flex items-center gap-4 p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors select-none"
    >
      {/* Drag Handle */}
      <div {...listeners} {...attributes} className="flex-shrink-0 cursor-grab">
        <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </div>
      
      {/* Task Number */}
      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
        {index + 1}
      </div>
      
      {/* Task Title */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-6 text-foreground truncate">
          {task}
        </p>
      </div>
      
      {/* Tag Controls */}
      <div className="flex items-center gap-2">
        <Toggle
          pressed={isLiked}
          onPressedChange={(pressed) => setIsLiked(pressed)}
          aria-label="Toggle love"
          onClick={(e) => e.stopPropagation()} // Prevent drag from triggering
          className={`data-[state=on]:bg-rose-500 data-[state=on]:text-white ${isLiked ? 'bg-rose-500 text-white' : ''} hover:bg-rose-200`}
        >
          <Heart className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          pressed={isUrgent}
          onPressedChange={(pressed) => setIsUrgent(pressed)}
          aria-label="Toggle urgent"
          onClick={(e) => e.stopPropagation()} // Prevent drag from triggering
          className={`data-[state=on]:bg-orange-500 data-[state=on]:text-white ${isUrgent ? 'bg-orange-500 text-white' : ''} hover:bg-orange-200`}
        >
          <Clock className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          pressed={isQuick}
          onPressedChange={(pressed) => setIsQuick(pressed)}
          aria-label="Toggle quick"
          onClick={(e) => e.stopPropagation()} // Prevent drag from triggering
          className={`data-[state=on]:bg-amber-500 data-[state=on]:text-white ${isQuick ? 'bg-amber-500 text-white' : ''} hover:bg-amber-200`}
        >
          <Zap className="h-4 w-4" />
        </Toggle>
      </div>
      
      
    </div>
  );
};