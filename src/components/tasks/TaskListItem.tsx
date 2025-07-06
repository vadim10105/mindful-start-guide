import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
      {...attributes} 
      className="flex items-center gap-4 p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors"
    >
      {/* Drag Handle */}
      <div {...listeners} className="flex-shrink-0 cursor-grab">
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
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`liked-${index}`}
            checked={isLiked}
            onCheckedChange={(checked) => setIsLiked(checked === true)}
            className="data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
          />
          <Label 
            htmlFor={`liked-${index}`} 
            className="text-xs flex items-center gap-1 cursor-pointer"
          >
            <Heart className="h-3 w-3" />
            Love
          </Label>
        </div>
        
        <div className="flex items-center gap-2">
          <Checkbox
            id={`urgent-${index}`}
            checked={isUrgent}
            onCheckedChange={(checked) => setIsUrgent(checked === true)}
            className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
          />
          <Label 
            htmlFor={`urgent-${index}`} 
            className="text-xs flex items-center gap-1 cursor-pointer"
          >
            <Clock className="h-3 w-3" />
            Urgent
          </Label>
        </div>
        
        <div className="flex items-center gap-2">
          <Checkbox
            id={`quick-${index}`}
            checked={isQuick}
            onCheckedChange={(checked) => setIsQuick(checked === true)}
            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
          />
          <Label 
            htmlFor={`quick-${index}`} 
            className="text-xs flex items-center gap-1 cursor-pointer"
          >
            <Zap className="h-3 w-3" />
            Quick
          </Label>
        </div>
      </div>
      
      {/* Visual Tags - No Emojis */}
      <div className="flex gap-1">
        {isLiked && (
          <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700">
            Love
          </Badge>
        )}
        {isUrgent && (
          <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700">
            Urgent
          </Badge>
        )}
        {isQuick && (
          <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-green-100 text-green-700">
            Quick
          </Badge>
        )}
      </div>
    </div>
  );
};