import { useState } from "react";
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
  totalTimeSpent?: string | null; // Total time spent on linked tasks
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
  taskTitle,
  totalTimeSpent
}: TaskListItemProps) => {
  const [isHovering, setIsHovering] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({ 
    id: task
  });

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
    } else {
      // Stop propagation for all other keys to prevent global handlers from interfering
      e.stopPropagation();
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
      className={`group task-item ${!isLastInSection ? 'border-b border-[#AAAAAA]/20' : ''} rounded-lg overflow-hidden transition-all ${
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
      <div className="block sm:hidden group-hover:rounded-lg">
        <div className="flex items-center gap-3 p-3 relative group">
          {/* Hover-only Drag Handle */}
          <div 
            {...attributes}
            {...listeners}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-3 h-8 bg-white/40 rounded-sm cursor-grab hover:cursor-grabbing hover:bg-white/60 opacity-100 transition-all duration-200 touch-manipulation"
            aria-label="Drag to reorder"
          >
            <div className="w-full h-full flex flex-col justify-center items-center gap-1">
              <div className="w-1 h-1 bg-current rounded-full"></div>
              <div className="w-1 h-1 bg-current rounded-full"></div>
              <div className="w-1 h-1 bg-current rounded-full"></div>
              <div className="w-1 h-1 bg-current rounded-full"></div>
            </div>
          </div>
          
          {/* Task Number (no longer draggable) */}
          <div className="flex-shrink-0 w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs font-medium">
            {showNumber ? index + 1 : ''}
          </div>
          
          {/* Task Title - Full width, no truncation */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                ref={editInputRef}
                value={editingText || ''}
                onChange={(e) => onEditingTextChange?.(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={handleEditBlur}
                className="text-base font-normal leading-6 bg-transparent border-none outline-none p-0 w-full ui-input"
                style={{ pointerEvents: 'auto', color: 'var(--text-primary)' }}
                autoFocus
              />
            ) : (
              <div>
                <p 
                  className="text-base font-normal leading-6 break-words cursor-text"
                  style={{ color: 'var(--text-primary)' }}
                  onDoubleClick={handleDoubleClick}
                >
                  {taskTitle || 'Untitled Task'}
                </p>
                {totalTimeSpent && (
                  <p className="text-xs mt-1" style={{ color: 'var(--tag-icon-inactive)' }}>
                    Time Spent: {totalTimeSpent}
                  </p>
                )}
              </div>
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
                isLiked ? 'border-border text-red-500' : 'border-border'
              }`}
              style={!isLiked ? { color: 'var(--tag-icon-inactive)' } : {}}
              onClick={() => onTagUpdate('liked', !isLiked)}
              aria-label={isLiked ? "Remove loved" : "Mark as loved"}
            >
              <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            
            {/* Warning Triangle - always in second position */}
            <button
              className={`p-3 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center bg-card border ${
                isUrgent ? 'border-border text-yellow-500' : 'border-border'
              }`}
              style={!isUrgent ? { color: 'var(--tag-icon-inactive)' } : {}}
              onClick={() => onTagUpdate('urgent', !isUrgent)}
              aria-label={isUrgent ? "Remove urgent" : "Mark as urgent"}
            >
              <AlertTriangle className={`h-5 w-5 ${isUrgent ? 'fill-current' : ''}`} />
            </button>
            
            {/* Lightning Bolt - always in third position */}
            <button
              className={`p-3 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center bg-card border ${
                isQuick ? 'border-border text-green-500' : 'border-border'
              }`}
              style={!isQuick ? { color: 'var(--tag-icon-inactive)' } : {}}
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
      <div className="hidden sm:flex items-center gap-4 p-4 relative group group-hover:rounded-lg">
        {/* Hover-only Drag Handle */}
        <div 
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-6 bg-white/40 rounded-sm cursor-grab hover:cursor-grabbing hover:bg-white/60 opacity-100 transition-all duration-200"
          aria-label="Drag to reorder"
        >
          <div className="w-full h-full flex flex-col justify-center items-center gap-0.5">
            <div className="w-0.5 h-0.5 bg-current rounded-full"></div>
            <div className="w-0.5 h-0.5 bg-current rounded-full"></div>
            <div className="w-0.5 h-0.5 bg-current rounded-full"></div>
            <div className="w-0.5 h-0.5 bg-current rounded-full"></div>
          </div>
        </div>
        
        {/* Task Number (no longer draggable) */}
        <div className="flex-shrink-0 w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs font-medium">
          {showNumber ? index + 1 : ''}
        </div>
        
        {/* Task Title */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={editInputRef}
              value={editingText || ''}
              onChange={(e) => onEditingTextChange?.(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={handleEditBlur}
              className="text-base font-medium leading-6 bg-transparent border-none outline-none p-0 w-full ui-input"
              style={{ pointerEvents: 'auto', color: 'var(--inline-muted-color)' }}
              autoFocus
            />
          ) : (
            <div>
              <p 
                className="text-base font-normal leading-6 truncate cursor-text"
                style={{ color: 'var(--text-primary)' }}
                onDoubleClick={handleDoubleClick}
              >
                {taskTitle || 'Untitled Task'}
              </p>
              {totalTimeSpent && (
                <p className="text-xs text-gray-500 mt-1">
                  Time Spent: {totalTimeSpent}
                </p>
              )}
            </div>
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
                  isLiked ? 'text-red-500 fill-red-500' : 'hover:text-red-400'
                }`}
                style={!isLiked ? { color: 'var(--tag-icon-inactive)' } : {}}
                onClick={() => onTagUpdate('liked', !isLiked)}
              />
              
              {/* Warning Triangle - always in second position */}
              <AlertTriangle
                className={`h-5 w-5 cursor-pointer transition-colors duration-200 hover:scale-110 ${
                  isUrgent ? 'text-yellow-500 fill-yellow-500' : 'hover:text-yellow-400'
                }`}
                style={!isUrgent ? { color: 'var(--tag-icon-inactive)' } : {}}
                onClick={() => onTagUpdate('urgent', !isUrgent)}
              />
              
              {/* Lightning Bolt - always in third position */}
              <Zap
                className={`h-5 w-5 cursor-pointer transition-colors duration-200 hover:scale-110 ${
                  isQuick ? 'text-green-500 fill-green-500' : 'hover:text-green-400'
                }`}
                style={!isQuick ? { color: 'var(--tag-icon-inactive)' } : {}}
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