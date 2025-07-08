import { useEffect, useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Heart, AlertCircle, Zap, GripVertical } from "lucide-react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskListItemProps {
  task: string;
  index: number;
  onTaskUpdate: (taskId: string, updatedTask: { is_liked?: boolean; is_urgent?: boolean; is_quick?: boolean }) => void;
}

export const TaskListItem = ({ task, index, onTaskUpdate }: TaskListItemProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isQuick, setIsQuick] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    onTaskUpdate(task, { is_liked: isLiked, is_urgent: isUrgent, is_quick: isQuick });
  }, [isLiked, isUrgent, isQuick, onTaskUpdate, task]);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      className="flex items-center gap-4 p-4 bg-card border rounded-lg select-none touch-none"
    >
      {/* Drag Handle */}
      <div {...listeners} className="flex-shrink-0 cursor-grab">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
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
          onPressedChange={setIsLiked}
          aria-label="Toggle love"
          className="data-[state=on]:bg-rose-500 data-[state=on]:text-white hover:bg-rose-600/90"
        >
          <Heart className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          pressed={isUrgent}
          onPressedChange={setIsUrgent}
          aria-label="Toggle urgent"
          className="data-[state=on]:bg-orange-500 data-[state=on]:text-white hover:bg-orange-600/90"
        >
          <AlertCircle className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          pressed={isQuick}
          onPressedChange={setIsQuick}
          aria-label="Toggle quick"
          className="data-[state=on]:bg-amber-500 data-[state=on]:text-white hover:bg-amber-600/90"
        >
          <Zap className="h-4 w-4" />
        </Toggle>
      </div>
    </div>
  );
};