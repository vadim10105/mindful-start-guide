import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Heart, AlertTriangle, Zap } from "lucide-react";
import { InlineTimeEditor } from "@/components/ui/InlineTimeEditor";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TaskListItemProps {
  task: string; // Now expects task ID for ID-based system, or task title for legacy system
  index: number;
  isLiked: boolean;
  isUrgent: boolean;
  isQuick: boolean;
  estimatedTime?: string;
  isLoadingTime?: boolean;
  isLastInSection?: boolean;
  onTagUpdate: (tag: 'liked' | 'urgent' | 'quick', value: boolean) => void;
  onTimeUpdate?: (newTime: string) => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onHover?: (index: number | undefined) => void;
  isEditing?: boolean;
  editingText?: string;
  editInputRef?: React.RefObject<HTMLInputElement>;
  onTaskEdit?: (taskId: string, taskTitle: string) => void;
  onTaskSave?: (taskId: string, newTitle: string) => void;
  onTaskCancel?: () => void;
  onEditingTextChange?: (text: string) => void;
  showNumber?: boolean;
  taskTitle?: string; // Optional task title for display when task prop is an ID
}

export const TaskListItem = ({ 
  task, 
  index, 
  isLiked, 
  isUrgent, 
  isQuick, 
  estimatedTime, 
  isLoadingTime, 
  isLastInSection, 
  onTagUpdate, 
  onTimeUpdate, 
  onReorder, 
  onHover,
  isEditing,
  editingText,
  editInputRef,
  onTaskEdit,
  onTaskSave,
  onTaskCancel,
  onEditingTextChange,
  showNumber = true,
  taskTitle
}: TaskListItemProps) => {
  const [isHovering, setIsHovering] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Handle editing key events
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onTaskSave?.(task, editingText || '');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onTaskCancel?.();
    } else if (e.key === 'Backspace' && editingText === '') {
      // Delete task when backspace is pressed on empty field
      e.preventDefault();
      onTaskSave?.(task, ''); // This will trigger deletion in handleTaskSave
    }
  };

  const handleEditBlur = () => {
    onTaskSave?.(task, editingText || '');
  };

  const handleDoubleClick = () => {
    onTaskEdit?.(task, taskTitle || 'Untitled');
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`${!isLastInSection ? 'border-b border-border/30' : ''} hover:bg-muted/20 transition-colors ${
        isDragging ? 'bg-card border border-border rounded-lg shadow-sm opacity-80' : ''
      }`}
      onMouseEnter={() => {
        setIsHovering(true);
        onHover?.(index);
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        onHover?.(undefined);
      }}
    >
      {/* Mobile Layout */}
      <div className="block sm:hidden">
        <div className="flex items-center gap-3 p-3">
          {/* Draggable Task Number */}
          <div 
            {...attributes}
            {...listeners}
            className="flex-shrink-0 w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs font-medium cursor-grab hover:cursor-grabbing hover:scale-110 transition-transform touch-manipulation"
            aria-label="Drag to reorder"
          >
            {showNumber ? index + 1 : ''}
          </div>
          
          {/* Task Title - Full width, no truncation */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                ref={editInputRef}
                value={editingText || ''}
                onChange={(e) => onEditingTextChange?.(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={handleEditBlur}
                className="text-sm font-medium leading-5 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
                autoFocus
              />
            ) : (
              <p 
                className="text-sm font-medium leading-5 text-foreground break-words cursor-text"
                onDoubleClick={handleDoubleClick}
              >
                {taskTitle || 'Untitled Task'}
              </p>
            )}
          </div>
        </div>
        
        {/* Mobile Tag Controls - Position-aware display with animations */}
        <div className="flex items-center justify-center gap-3 px-3 pb-3 pt-1 relative">
          {/* Hover state: All tags in original positions */}
          <div className={`absolute inset-0 flex items-center justify-center gap-3 transition-all duration-300 ease-in-out transform ${
            isHovering 
              ? 'translate-x-0 opacity-100' 
              : 'translate-x-4 opacity-0 pointer-events-none'
          }`}>
            {/* Heart - always in first position */}
            <button
              className={`p-3 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center bg-card border ${
                isLiked ? 'border-border text-red-500' : 'border-border text-gray-400'
              }`}
              onClick={() => onTagUpdate('liked', !isLiked)}
              aria-label={isLiked ? "Remove loved" : "Mark as loved"}
            >
              <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            
            {/* Warning Triangle - always in second position */}
            <button
              className={`p-3 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center bg-card border ${
                isUrgent ? 'border-border text-yellow-500' : 'border-border text-gray-400'
              }`}
              onClick={() => onTagUpdate('urgent', !isUrgent)}
              aria-label={isUrgent ? "Remove urgent" : "Mark as urgent"}
            >
              <AlertTriangle className={`h-5 w-5 ${isUrgent ? 'fill-current' : ''}`} />
            </button>
            
            {/* Lightning Bolt - always in third position */}
            <button
              className={`p-3 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center bg-card border ${
                isQuick ? 'border-border text-green-500' : 'border-border text-gray-400'
              }`}
              onClick={() => onTagUpdate('quick', !isQuick)}
              aria-label={isQuick ? "Remove quick" : "Mark as quick"}
            >
              <Zap className={`h-5 w-5 ${isQuick ? 'fill-current' : ''}`} />
            </button>
          </div>
          
          {/* Non-hover state: Only selected tags grouped to the right */}
          <div className={`absolute inset-0 flex items-center justify-end gap-3 pr-3 transition-all duration-300 ease-in-out transform ${
            !isHovering && (isLiked || isUrgent || isQuick)
              ? 'translate-x-0 opacity-100' 
              : 'translate-x-4 opacity-0 pointer-events-none'
          }`}>
            {isLiked && (
              <button
                className="p-3 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center bg-card border border-border text-red-500"
                onClick={() => onTagUpdate('liked', false)}
                aria-label="Remove loved"
              >
                <Heart className="h-5 w-5 fill-current" />
              </button>
            )}
            
            {isUrgent && (
              <button
                className="p-3 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center bg-card border border-border text-yellow-500"
                onClick={() => onTagUpdate('urgent', false)}
                aria-label="Remove urgent"
              >
                <AlertTriangle className="h-5 w-5 fill-current" />
              </button>
            )}
            
            {isQuick && (
              <button
                className="p-3 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center bg-card border border-border text-green-500"
                onClick={() => onTagUpdate('quick', false)}
                aria-label="Remove quick"
              >
                <Zap className="h-5 w-5 fill-current" />
              </button>
            )}
          </div>
          
          {/* Spacer to maintain height */}
          <div className="invisible flex items-center gap-3">
            <div className="p-3 min-w-[44px] min-h-[44px]"></div>
          </div>
        </div>
        
        {/* Time Estimate - Mobile */}
        {(estimatedTime || isLoadingTime) && (
          <div className="flex justify-center px-3 pb-2">
            <InlineTimeEditor
              value={estimatedTime}
              isLoading={isLoadingTime}
              onChange={onTimeUpdate}
              placeholder="15m"
            />
          </div>
        )}
      </div>

      {/* Desktop Layout - Original */}
      <div className="hidden sm:flex items-center gap-4 p-4">
        {/* Draggable Task Number */}
        <div 
          {...attributes}
          {...listeners}
          className="flex-shrink-0 w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs font-medium cursor-grab hover:cursor-grabbing hover:scale-110 transition-transform"
          aria-label="Drag to reorder"
        >
          {showNumber ? index + 1 : ''}
        </div>
        
        {/* Task Title */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              ref={editInputRef}
              value={editingText || ''}
              onChange={(e) => onEditingTextChange?.(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={handleEditBlur}
              className="text-sm font-medium leading-6 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
              autoFocus
            />
          ) : (
            <p 
              className="text-sm font-medium leading-6 text-foreground truncate cursor-text"
              onDoubleClick={handleDoubleClick}
            >
              {taskTitle || 'Untitled Task'}
            </p>
          )}
        </div>
        
        {/* Tag Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            {/* Hover state: All tags in original positions */}
            <div className={`flex items-center gap-2 transition-all duration-300 ease-in-out transform ${
              isHovering 
                ? 'translate-x-0 opacity-100' 
                : 'translate-x-4 opacity-0 pointer-events-none'
            }`}>
              {/* Heart - always in first position */}
              <Heart
                className={`h-5 w-5 cursor-pointer transition-colors duration-200 hover:scale-110 ${
                  isLiked ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-400'
                }`}
                onClick={() => onTagUpdate('liked', !isLiked)}
              />
              
              {/* Warning Triangle - always in second position */}
              <AlertTriangle
                className={`h-5 w-5 cursor-pointer transition-colors duration-200 hover:scale-110 ${
                  isUrgent ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400 hover:text-yellow-400'
                }`}
                onClick={() => onTagUpdate('urgent', !isUrgent)}
              />
              
              {/* Lightning Bolt - always in third position */}
              <Zap
                className={`h-5 w-5 cursor-pointer transition-colors duration-200 hover:scale-110 ${
                  isQuick ? 'text-green-500 fill-green-500' : 'text-gray-400 hover:text-green-400'
                }`}
                onClick={() => onTagUpdate('quick', !isQuick)}
              />
            </div>
            
            {/* Non-hover state: Only selected tags */}
            <div className={`absolute top-0 right-0 flex items-center gap-2 transition-all duration-300 ease-in-out transform ${
              !isHovering && (isLiked || isUrgent || isQuick)
                ? 'translate-x-0 opacity-100' 
                : 'translate-x-4 opacity-0 pointer-events-none'
            }`}>
              {isLiked && (
                <Heart
                  className="h-5 w-5 cursor-pointer transition-colors duration-200 hover:scale-110 text-red-500 fill-red-500"
                  onClick={() => onTagUpdate('liked', false)}
                />
              )}
              
              {isUrgent && (
                <AlertTriangle
                  className="h-5 w-5 cursor-pointer transition-colors duration-200 hover:scale-110 text-yellow-500 fill-yellow-500"
                  onClick={() => onTagUpdate('urgent', false)}
                />
              )}
              
              {isQuick && (
                <Zap
                  className="h-5 w-5 cursor-pointer transition-colors duration-200 hover:scale-110 text-green-500 fill-green-500"
                  onClick={() => onTagUpdate('quick', false)}
                />
              )}
            </div>
          </div>
          
          {/* Time Estimate - Always visible, separate from animated tags */}
          {(estimatedTime || isLoadingTime) && (
            <InlineTimeEditor
              value={estimatedTime}
              isLoading={isLoadingTime}
              onChange={onTimeUpdate}
              placeholder="15m"
              className="ml-3"
            />
          )}
        </div>
      </div>
    </div>
  );
};