import { useEffect, useState, useRef } from "react";
import { parseTimeToMinutes, formatMinutesToDisplay } from '@/utils/timeUtils';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Shuffle, ArrowRight, Check, Heart, Zap, ArrowLeft, AlertTriangle, Settings, Plus, Clock, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTypewriter } from "@/hooks/use-typewriter";
import { GameTaskCards } from "@/components/tasks/GameTaskCards";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { convertOnboardingPreferencesToCategoryRatings, categorizeTask, categorizeTasks, getCurrentEnergyState } from "@/utils/taskCategorization";
import { InlineTimeEditor } from "@/components/ui/InlineTimeEditor";
import { validateAndFormatTimeInput } from "@/utils/timeUtils";
import { TaskTimeline } from "@/components/tasks/TaskTimeline";
import { PiPProvider, usePiP } from "@/components/tasks/PictureInPicture";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
  DragOverlay,
  DragStartEvent,
  CollisionDetection,
  rectIntersection,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type FlowStep = 'input' | 'review' | 'prioritized' | 'game-cards';

interface ExtractedTask {
  title: string;
  estimated_time: string;
}

interface Task {
  id: string;
  title: string;
  list_location: 'active' | 'later' | 'collection';
  task_status: 'task_list' | 'not_started' | 'incomplete' | 'made_progress' | 'complete';
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  card_position?: number;
  notes?: string;
  estimated_minutes?: number;
}

interface PrioritizedTask {
  id: string;
  title: string;
  priority_score: number;
  explanation: string;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
}

interface UserProfile {
  task_start_preference?: string;
  task_preferences?: any;
  peak_energy_time?: string;
  lowest_energy_time?: string;
}

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

const TypewriterPlaceholder = ({ isVisible }: { isVisible: boolean }) => {
  const { text, showCursor } = useTypewriter();
  
  return (
    <div className={`absolute top-0 left-0 w-full h-full p-3 text-muted-foreground pointer-events-none flex items-start transition-all duration-300 ease-out ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
    }`}>
      <span className="text-base leading-relaxed">
        {text}
        {showCursor && <span className="animate-pulse">|</span>}
      </span>
    </div>
  );
};

const TaskListItem = ({ 
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

const DroppableZone = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef}
      className={`transition-all duration-200 ${
        isOver ? 'bg-muted/20 rounded-lg min-h-[60px] pb-4' : ''
      }`}
    >
      {children}
    </div>
  );
};

const customCollisionDetection: CollisionDetection = (args) => {
  const { active, droppableContainers } = args;
  
  // Use default collision detection first
  const collisions = rectIntersection(args);
  
  // If we're dragging from later to active, prioritize active zone and active tasks
  if (active.id && typeof active.id === 'string') {
    const activeId = active.id;
    
    // Filter collisions to prevent unwanted cross-zone movements during active dragging
    const filteredCollisions = collisions.filter(collision => {
      const overId = collision.id;
      
      // Always allow dropping on zones
      if (overId === 'active-zone' || overId === 'later-zone') {
        return true;
      }
      
      // If dragging from later to active area, only allow collision with active tasks
      // This prevents active tasks from being displaced into later zone
      return true; // Let the drag logic handle the specifics
    });
    
    return filteredCollisions;
  }
  
  return collisions;
};

const TasksContent = () => {
  const { enterPiP } = usePiP();
  const [currentStep, setCurrentStep] = useState<FlowStep>('input');
  const [brainDumpText, setBrainDumpText] = useState("");
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [reviewedTasks, setReviewedTasks] = useState<string[]>([]); // Now stores task IDs
  const [taggedTasks, setTaggedTasks] = useState<Task[]>([]);
  const [taskTags, setTaskTags] = useState<Record<string, { isLiked: boolean; isUrgent: boolean; isQuick: boolean }>>({});
  const [taskTimeEstimates, setTaskTimeEstimates] = useState<Record<string, string>>({});
  // Add task lookup maps for ID-based system
  const [tasksById, setTasksById] = useState<Record<string, Task>>({});
  const [activeTaskIds, setActiveTaskIds] = useState<string[]>([]);
  const [laterTaskIds, setLaterTaskIds] = useState<string[]>([]);
  const [taskTagsById, setTaskTagsById] = useState<Record<string, { isLiked: boolean; isUrgent: boolean; isQuick: boolean }>>({});
  const [taskTimeEstimatesById, setTaskTimeEstimatesById] = useState<Record<string, string>>({});
  const [prioritizedTasks, setPrioritizedTasks] = useState<PrioritizedTask[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Loading messages
  const loadingMessages = [
    "I guess I'll do something with this",
    "Ok..ok..I'll sort your thoughts", 
    "Woah this is your brain at work?",
    "Cool. Let me wrangle this mess",
    "Alright, let's pretend I know what I'm doing"
  ];
  
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  
  useEffect(() => {
    if (isProcessing || isTransitioning) {
      const interval = setInterval(() => {
        setCurrentMessageIndex(prev => (prev + 1) % loadingMessages.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isProcessing, isTransitioning, loadingMessages.length]);
  const [user, setUser] = useState(null);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inputMode, setInputMode] = useState<'brain-dump' | 'list'>('brain-dump');
  const [cameFromBrainDump, setCameFromBrainDump] = useState(false);
  // Legacy state - will be replaced by activeTaskIds and laterTaskIds
  const [listTasks, setListTasks] = useState<string[]>([]);
  const [laterTasks, setLaterTasks] = useState<string[]>([]);
  const [laterTasksExpanded, setLaterTasksExpanded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [loadingTimeEstimates, setLoadingTimeEstimates] = useState<Set<string>>(new Set());
  const [cardDimensions, setCardDimensions] = useState({ top: 0, height: 0 });
  const [hoveredTaskIndex, setHoveredTaskIndex] = useState<number | undefined>(undefined);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const { toast } = useToast();

  // Refs for global auto-focus functionality
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const taskInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardContentRef = useRef<HTMLDivElement>(null);
  const taskListContentRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Track card dimensions for timeline positioning
  useEffect(() => {
    const updateCardDimensions = () => {
      // Always use the entire card for timeline alignment
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setCardDimensions({
          top: rect.top,
          height: rect.height
        });
      }
    };

    updateCardDimensions();
    
    // Update on resize and when tasks change
    window.addEventListener('resize', updateCardDimensions);
    const observer = new ResizeObserver(updateCardDimensions);
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateCardDimensions);
      observer.disconnect();
    };
  }, [listTasks, inputMode, currentStep]);

  // Enhanced user check with profile creation
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/welcome';
        return;
      }
      setUser(user);
      
      
      // Fetch user profile for prioritization
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('task_start_preference, task_preferences, peak_energy_time, lowest_energy_time')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load your profile.",
          variant: "destructive",
        });
        return;
      }

      if (profile) {
        setUserProfile(profile);
      } else {
        // Create a default profile if one doesn't exist
        console.log('No profile found, creating default profile...');
        const defaultProfile = {
          user_id: user.id,
          id: user.id,
          display_name: user.email?.split('@')[0] || 'User',
          task_start_preference: 'easier_first',
          task_preferences: {},
          peak_energy_time: 'morning',
          lowest_energy_time: 'evening',
          onboarding_completed: false
        };

        const { error: createError } = await supabase
          .from('profiles')
          .insert(defaultProfile);

        if (createError) {
          console.error('Error creating default profile:', createError);
          toast({
            title: "Error",
            description: "Failed to create user profile. Please try refreshing the page.",
            variant: "destructive",
          });
        } else {
          setUserProfile({
            task_start_preference: defaultProfile.task_start_preference,
            task_preferences: defaultProfile.task_preferences,
            peak_energy_time: defaultProfile.peak_energy_time,
            lowest_energy_time: defaultProfile.lowest_energy_time
          });
          toast({
            title: "Profile Created",
            description: "A default profile has been created for you.",
          });
        }
      }
    };
    getUser();
  }, [toast]);

  // Global keyboard auto-focus functionality
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Skip if we're not on the input step (only work on the main input screen)
      if (currentStep !== 'input') return;
      
      // Skip if settings modal is open
      if (isSettingsOpen) return;
      
      // Skip if processing or transitioning
      if (isProcessing || isTransitioning) return;
      
      // Skip if any input is already focused
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      
      // Skip function keys, modifiers, and navigation keys
      if (e.key.length > 1 && !['Space', 'Backspace', 'Delete'].includes(e.key)) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      
      // Only capture printable characters, space, backspace, and delete
      const isPrintableChar = e.key.length === 1 || ['Space', 'Backspace', 'Delete'].includes(e.key);
      if (!isPrintableChar) return;
      
      // Route to the appropriate input based on current mode
      if (inputMode === 'brain-dump' && textareaRef.current) {
        // Focus textarea and add the character
        textareaRef.current.focus();
        
        if (e.key === 'Space') {
          setBrainDumpText(prev => prev + ' ');
        } else if (e.key === 'Backspace') {
          setBrainDumpText(prev => prev.slice(0, -1));
        } else if (e.key === 'Delete') {
          // For Delete key, don't add anything (just focus)
        } else {
          setBrainDumpText(prev => prev + e.key);
        }
      } else if (inputMode === 'list' && taskInputRef.current) {
        // Focus task input and add the character
        taskInputRef.current.focus();
        
        if (e.key === 'Space') {
          setNewTaskInput(prev => prev + ' ');
        } else if (e.key === 'Backspace') {
          setNewTaskInput(prev => prev.slice(0, -1));
        } else if (e.key === 'Delete') {
          // For Delete key, don't add anything (just focus)
        } else {
          setNewTaskInput(prev => prev + e.key);
        }
      }
      
      // Prevent default behavior for the handled keys
      e.preventDefault();
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentStep, isSettingsOpen, isProcessing, isTransitioning, inputMode]);

  // Phantom focus effect to activate keyboard capture while preserving typewriter animation
  useEffect(() => {
    // Only phantom focus when we're on the input step and not processing/transitioning
    if (currentStep === 'input' && !isProcessing && !isTransitioning && !isSettingsOpen) {
      // Brief delay to ensure components are rendered
      const timeoutId = setTimeout(() => {
        let targetRef = null;
        if (inputMode === 'brain-dump' && textareaRef.current) {
          targetRef = textareaRef.current;
        } else if (inputMode === 'list' && taskInputRef.current) {
          targetRef = taskInputRef.current;
        }
        
        if (targetRef) {
          // Phantom focus: briefly focus then immediately blur to activate page
          targetRef.focus();
          setTimeout(() => {
            targetRef.blur();
          }, 50);
        }
      }, 10);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentStep, inputMode, isProcessing, isTransitioning, isSettingsOpen]);

  // Load tasks when user changes or component mounts  
  useEffect(() => {
    if (user) {
      loadTasksById();
    }
  }, [user]);

  const handleBrainDumpSubmit = async () => {
    console.log('handleBrainDumpSubmit called with text:', brainDumpText);
    
    if (!brainDumpText.trim()) {
      console.log('No brain dump text provided');
      return;
    }

    // Start clean transition - toggle immediately switches to list
    setIsProcessing(true);
    setIsTransitioning(true);
    setCameFromBrainDump(true); // Track that we came from brain dump
    setInputMode('list'); // Toggle immediately transitions to list position
    console.log('Starting clean transition...');

    try {
      console.log('Calling edge function with brain dump text...');
      
      const { data, error } = await supabase.functions.invoke('process-brain-dump', {
        body: { brainDumpText }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error('Failed to process brain dump');
      }

      if (!data?.tasks) {
        console.error('No tasks in response:', data);
        throw new Error('No tasks extracted from brain dump');
      }

      console.log('Successfully extracted tasks:', data.tasks);
      setExtractedTasks(data.tasks);
      
      // Store time estimates for each task
      const timeEstimates: Record<string, string> = {};
      data.tasks.forEach((task: ExtractedTask) => {
        // Format AI time estimates to match our standard format (m/h)
        const formattedTime = validateAndFormatTimeInput(task.estimated_time) || task.estimated_time;
        timeEstimates[task.title] = formattedTime;
      });
      setTaskTimeEstimates(timeEstimates);
      
      // Prepare for smooth transition
      const extractedTaskTitles = data.tasks.map((task: ExtractedTask) => task.title);
      
      // Get AI categorization for all tasks
      console.log('🤖 Getting AI categorization for extracted tasks...');
      const taskCategories = await categorizeTasks(extractedTaskTitles);
      console.log('📋 AI categorization results:', taskCategories);
      
      // Save tasks to database immediately after extraction and categorization
      if (user) {
        const tasksToSave = data.tasks.map((task: ExtractedTask, index: number) => {
          const estimatedMinutes = task.estimated_time ? parseTimeToMinutes(task.estimated_time) : null;
          const category = taskCategories[task.title] || 'Routine';
          const isQuick = estimatedMinutes !== null && estimatedMinutes <= 20;
          
          return {
            title: task.title,
            user_id: user.id,
            source: 'brain_dump' as const,
            list_location: 'active' as const, // Brain dump tasks go to active list
            task_status: 'task_list' as const, // New tasks start in task list  
            category: category, // Save AI categorization
            estimated_minutes: estimatedMinutes, // Convert time estimate to minutes
            is_quick: isQuick // Auto-apply quick tag if <= 20 minutes
          };
        });

        const { data: insertedTasks, error: saveError } = await supabase
          .from('tasks')
          .insert(tasksToSave)
          .select('id, title, list_location, task_status, is_liked, is_urgent, is_quick, category, estimated_minutes, notes');

        if (saveError) {
          console.error('Error saving extracted tasks:', saveError);
          // Don't throw here - we still want to show the UI even if save fails
        } else if (insertedTasks) {
          console.log('✅ Successfully saved extracted tasks to database');
          
          // Update ID-based state with the newly created tasks
          const newTasksById: Record<string, Task> = {};
          const newTaskIds: string[] = [];
          const newTaskTags: Record<string, { isLiked: boolean; isUrgent: boolean; isQuick: boolean }> = {};
          const newTimeEstimates: Record<string, string> = {};

          insertedTasks.forEach(task => {
            newTasksById[task.id] = {
              id: task.id,
              title: task.title,
              list_location: task.list_location,
              task_status: task.task_status,
              is_liked: task.is_liked || false,
              is_urgent: task.is_urgent || false,
              is_quick: task.is_quick || false,
              notes: task.notes || ''
            };
            
            newTaskIds.push(task.id);
            
            newTaskTags[task.id] = {
              isLiked: task.is_liked || false,
              isUrgent: task.is_urgent || false,
              isQuick: task.is_quick || false
            };

            if (task.estimated_minutes) {
              const hours = Math.floor(task.estimated_minutes / 60);
              const minutes = task.estimated_minutes % 60;
              if (hours > 0) {
                newTimeEstimates[task.id] = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
              } else {
                newTimeEstimates[task.id] = `${minutes}m`;
              }
            }
          });

          // Update state with ID-based data
          setTasksById(prev => ({ ...prev, ...newTasksById }));
          setActiveTaskIds(newTaskIds); // Brain dump tasks go to active
          setTaskTagsById(prev => ({ ...prev, ...newTaskTags }));
          setTaskTimeEstimatesById(prev => ({ ...prev, ...newTimeEstimates }));
          // Keep legacy state for compatibility
          setTaskTags(prev => ({ ...prev, ...newTaskTags }));
          setTaskTimeEstimates(prev => ({ ...prev, ...newTimeEstimates }));
          setReviewedTasks(newTaskIds); // Store IDs instead of titles
        }
      }
      
      // Small delay to show the transition animation  
      setTimeout(() => {
        // Switch to list mode - the ID-based state is already set above
        setInputMode('list');
        
        // Legacy compatibility - keep old state in sync for components that still use it
        const extractedTaskTitles = data.tasks.map((task: ExtractedTask) => task.title);
        setListTasks(extractedTaskTitles);
        
        // End transition earlier so box can expand first, then tasks drop in
        setTimeout(() => {
          setIsTransitioning(false);
        }, 100); // Very quick transition so blur fades and box expands first
      }, 600); // Container expansion time
      

    } catch (error) {
      console.error('Error processing brain dump:', error);
      
      let errorMessage = "Failed to process brain dump. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("quota") || error.message.includes("billing")) {
          errorMessage = "OpenAI API quota exceeded. Please check your OpenAI billing at platform.openai.com/usage.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Reset transition states on error
      setIsTransitioning(false);
    } finally {
      setIsProcessing(false);
      console.log('Processing finished, set isProcessing to false');
    }
  };


  const resetFlow = () => {
    setCurrentStep('input');
    setBrainDumpText("");
    setExtractedTasks([]);
    setReviewedTasks([]);
    setTaggedTasks([]);
    setListTasks([]);
    setLaterTasks([]);
    setLaterTasksExpanded(false);
    setNewTaskInput('');
    setTaskTags({});
    setTaskTimeEstimates({});
    setIsTransitioning(false);
    setCameFromBrainDump(false); // Reset brain dump flag
    setInputMode('brain-dump'); // Reset to brain-dump mode
  };

  // Extract time estimate for a single task
  const extractTimeEstimateAndCategory = async (taskId: string, taskTitle: string) => {
    try {
      setLoadingTimeEstimates(prev => new Set(prev).add(taskId));
      
      // Get time estimate from brain dump function
      const { data, error } = await supabase.functions.invoke('process-brain-dump', {
        body: { brainDumpText: taskTitle }
      });

      let estimatedTime = '30m'; // Fallback time
      
      if (!error && data?.tasks?.[0]?.estimated_time) {
        const formattedTime = validateAndFormatTimeInput(data.tasks[0].estimated_time) || data.tasks[0].estimated_time;
        estimatedTime = formattedTime;
      }

      // Get AI categorization using the same method as brain dump
      const category = await categorizeTask(taskTitle);

      // Convert time to minutes for database storage
      const minutes = parseTimeToMinutes(estimatedTime);
      const isQuick = minutes !== null && minutes <= 20;

      // Update Supabase with time, category, and auto-apply quick tag
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          estimated_minutes: minutes,
          category: category,
          is_quick: isQuick // Auto-apply quick tag if <= 20 minutes
        })
        .eq('id', taskId)
        .eq('user_id', user?.id);

      if (updateError) {
        console.error('Error updating task with time/category:', updateError);
        return;
      }

      // Update local state
      setTaskTimeEstimatesById(prev => ({
        ...prev,
        [taskId]: estimatedTime
      }));

      // Update task in tasksById with category
      setTasksById(prev => ({
        ...prev,
        [taskId]: {
          ...prev[taskId],
          category: category,
          estimated_minutes: minutes
        }
      }));

      // Update local state to reflect auto-applied quick tag
      if (isQuick) {
        setTaskTagsById(prev => ({
          ...prev,
          [taskId]: {
            ...prev[taskId] || { isLiked: false, isUrgent: false, isQuick: false },
            isQuick: true
          }
        }));
        console.log(`✅ Auto-applied quick tag to manually added task "${taskTitle}"`);
      }

    } catch (error) {
      console.error('Failed to extract time estimate and category:', error);
    } finally {
      setLoadingTimeEstimates(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const extractTimeEstimate = async (taskTitle: string) => {
    try {
      setLoadingTimeEstimates(prev => new Set(prev).add(taskTitle));
      
      const { data, error } = await supabase.functions.invoke('process-brain-dump', {
        body: { brainDumpText: taskTitle }
      });

      if (error) {
        console.error('Time extraction error:', error);
        return;
      }

      if (data?.tasks?.[0]?.estimated_time) {
        // Format AI time estimates to match our standard format (m/h)
        const formattedTime = validateAndFormatTimeInput(data.tasks[0].estimated_time) || data.tasks[0].estimated_time;
        setTaskTimeEstimates(prev => ({
          ...prev,
          [taskTitle]: formattedTime
        }));
      }
    } catch (error) {
      console.error('Failed to extract time estimate:', error);
    } finally {
      setLoadingTimeEstimates(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskTitle);
        return newSet;
      });
    }
  };

  // List mode handlers
  const handleAddTask = async () => {
    if (!newTaskInput.trim()) {
      return;
    }

    if (!user) {
      // Try to get user again if not available
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        return;
      }
      setUser(currentUser);
    }

    const taskTitle = newTaskInput.trim();
    
    try {
      // Get current user for the insert
      const currentUser = user || (await supabase.auth.getUser()).data.user;
      if (!currentUser) {
        return;
      }

      // Save to Supabase first
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: taskTitle,
          user_id: currentUser.id,
          list_location: 'active',
          task_status: 'task_list',
          is_liked: false,
          is_urgent: false,
          is_quick: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating task:', error);
        return;
      }

      if (data) {
        // Update local state with new task
        const newTask = {
          id: data.id,
          title: data.title,
          list_location: data.list_location,
          task_status: data.task_status,
          is_liked: data.is_liked || false,
          is_urgent: data.is_urgent || false,
          is_quick: data.is_quick || false,
          notes: data.notes || ''
        };

        // Add to local state
        setTasksById(prev => ({ ...prev, [data.id]: newTask }));
        setActiveTaskIds(prev => [...prev, data.id]);
        setTaskTagsById(prev => ({
          ...prev,
          [data.id]: {
            isLiked: false,
            isUrgent: false,
            isQuick: false
          }
        }));

        setNewTaskInput('');
        
        // Extract time estimate and category for the new task
        await extractTimeEstimateAndCategory(data.id, taskTitle);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleAddTaskKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTask();
    }
  };


  const handleListSubmit = () => {
    if (listTasks.length === 0) return;
    
    // Convert list tasks to the same format as brain dump extracted tasks
    setReviewedTasks(listTasks);
    setCurrentStep('review');
  };

  const handleReorder = (dragIndex: number, hoverIndex: number) => {
    const newTasks = [...reviewedTasks];
    const draggedTask = newTasks[dragIndex];
    newTasks.splice(dragIndex, 1);
    newTasks.splice(hoverIndex, 0, draggedTask);
    setReviewedTasks(newTasks);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = reviewedTasks.findIndex((task) => task === active.id);
      const newIndex = reviewedTasks.findIndex((task) => task === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        setReviewedTasks((items) => arrayMove(items, oldIndex, newIndex));
      }
    }
  };


  const prioritizeTasks = async (tasksToProcess?: string[]) => {
    const tasks = tasksToProcess || reviewedTasks;
    console.log('🎯 Starting AI Task Prioritization...');
    console.log('📊 User profile:', userProfile);
    console.log('🏷️ Task tags state:', taskTags);
    console.log('📝 Tasks to prioritize:', tasks);

    // Use AI categorization for batch processing
    console.log('🤖 Getting AI categorization for all tasks...');
    const taskCategories = await categorizeTasks(tasks);
    console.log('📋 AI categorization results:', taskCategories);

    // Create task input format for the edge function with AI categorization
    const taskInputs = tasks.map((taskTitle, index) => {
      const tags = taskTags[taskTitle] || { isLiked: false, isUrgent: false, isQuick: false };
      const category = taskCategories[taskTitle] || 'Routine'; // Fallback to Routine if categorization failed
      
      console.log(`🔍 Task "${taskTitle}":`, {
        category: category,
        tags: tags,
        position: index + 1,
        estimated_time: taskTimeEstimates[taskTitle]
      });
      
      return {
        id: `temp-${index}`,
        text: taskTitle,
        tags: {
          liked: tags.isLiked,
          urgent: tags.isUrgent,
          quick: tags.isQuick,
          disliked: false
        },
        inferred: {
          category: category
        },
        estimated_time: taskTimeEstimates[taskTitle]
      };
    });

    // Convert onboarding preferences to category ratings
    const categoryRatings = convertOnboardingPreferencesToCategoryRatings(userProfile?.task_preferences);
    console.log('⚙️ Converted category ratings:', categoryRatings);

    // Determine current energy state based on time and user's energy preferences
    const energyState = getCurrentEnergyState(userProfile?.peak_energy_time, userProfile?.lowest_energy_time);
    console.log('⚡ Current energy state:', energyState);

    // Create user profile for the edge function
    const profileInput = {
      startPreference: userProfile?.task_start_preference === 'hard_first' ? 'eatTheFrog' : 'quickWin',
      energyState: energyState,
      categoryRatings: categoryRatings
    };

    console.log('👤 Profile input for prioritization:', profileInput);
    console.log(`🧠 Using ${profileInput.startPreference} strategy with ${energyState} energy`);

    try {
      const { data, error } = await supabase.functions.invoke('prioritize-tasks', {
        body: {
          tasks: taskInputs,
          userProfile: profileInput
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error('Failed to prioritize tasks');
      }

      console.log('✅ Prioritization response received:', data);

      // Convert back to our expected format and log detailed scoring
      const prioritizedTasks = data.orderedTasks.map((task: any, index: number) => {
        console.log(`📈 Final Task #${index + 1}: "${task.text}"`, {
          totalScore: task.totalScore,
          rulePlacement: task.rulePlacement,
          scoreBreakdown: task.scoreBreakdown,
          tags: task.tags,
          category: task.inferred?.category
        });

        return {
          id: task.id,
          title: task.text,
          priority_score: task.totalScore,
          explanation: `${task.rulePlacement} • Score: ${task.totalScore} (Base: ${task.scoreBreakdown.baseCategoryScore}, Tags: ${task.scoreBreakdown.liveTagScore}, Energy: ${task.scoreBreakdown.energyAdjust})`,
          is_liked: task.tags.liked,
          is_urgent: task.tags.urgent,
          is_quick: task.tags.quick
        };
      });

      console.log('🎊 Final prioritized order:');
      prioritizedTasks.forEach((task, index) => {
        console.log(`  ${index + 1}. ${task.title} (Score: ${task.priority_score})`);
      });

      return prioritizedTasks;

    } catch (error) {
      console.error('💥 Error calling prioritization:', error);
      // Fallback to simple scoring if edge function fails
      console.log('🔄 Using fallback prioritization...');
      return reviewedTasks.map((title, index) => ({
        id: `temp-${index}`,
        title,
        priority_score: Math.random() * 100,
        explanation: "Fallback prioritization - edge function unavailable",
        is_liked: false,
        is_urgent: false,
        is_quick: false
      }));
    }
  };

  // Function to convert estimated_minutes to readable format
  const formatEstimatedTime = (minutes?: number): string | undefined => {
    if (!minutes) return undefined;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Function to update tasks to 'not_started' when entering game
  const updateTasksToNotStarted = async (taskIds: string[]) => {
    if (!user) return;
    
    try {
      await supabase
        .from('tasks')
        .update({ task_status: 'not_started' })
        .in('id', taskIds)
        .eq('task_status', 'task_list'); // Only update tasks that are still in task_list status
    } catch (error) {
      console.error('Error updating tasks to not_started:', error);
    }
  };

  const handleShuffle = async (tasksToProcess?: string[]) => {
    console.log('🎲 Shuffle button clicked - Using simplified shuffle function...');
    
    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to shuffle tasks.",
        variant: "destructive",
      });
      return;
    }
    
    // Go directly to game cards with processing state
    setCurrentStep('game-cards');
    setIsProcessing(true);
    
    try {
      // Call our new simplified shuffle edge function
      const { data, error } = await supabase.functions.invoke('shuffle-tasks', {
        body: { userId: user.id }
      });

      if (error) {
        console.error('Shuffle function error:', error);
        throw new Error('Failed to shuffle tasks');
      }

      console.log('✅ Shuffle complete:', data);
      
      // Update the local task order and prepare for game cards
      if (data.shuffledTasks && data.shuffledTasks.length > 0) {
        const newOrder = data.shuffledTasks.map(task => task.id);
        setActiveTaskIds(newOrder);
        console.log('Updated active task order:', newOrder);

        // Prepare tagged tasks for game cards in the shuffled order
        const orderedTaggedTasks = data.shuffledTasks.map((shuffledTask, index) => {
          const task = tasksById[shuffledTask.id];
          const tags = taskTagsById[shuffledTask.id] || { isLiked: false, isUrgent: false, isQuick: false };
          
          if (!task) {
            console.warn(`Task not found for ID: ${shuffledTask.id}`);
            return null;
          }
          
          return {
            id: shuffledTask.id,
            title: task.title,
            list_location: 'active' as const,
            task_status: 'not_started' as const, // Will be updated below
            is_liked: tags.isLiked,
            is_urgent: tags.isUrgent,
            is_quick: tags.isQuick,
            card_position: index + 1,
            notes: task.notes || '' // Include notes for game cards, fallback to empty string
          };
        }).filter(Boolean); // Remove any null entries
        
        setTaggedTasks(orderedTaggedTasks);
        
        // Open PiP after tasks are set
        setTimeout(() => {
          enterPiP();
        }, 100);
      }
      
      // Update tasks to not_started status when entering game
      const activeIds = data.shuffledTasks ? data.shuffledTasks.map(t => t.id) : activeTaskIds;
      await updateTasksToNotStarted(activeIds);
      
      toast({
        title: "Tasks Shuffled!",
        description: data.message || "Tasks have been reordered using your preferences.",
      });
      
    } catch (error) {
      console.error('Error during shuffling:', error);
      toast({
        title: "Error",
        description: "Failed to shuffle tasks",
        variant: "destructive",
      });
      // Go back to review step on error
      setCurrentStep('review');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualOrder = async (taskIdsToProcess?: string[]) => {
    const taskIds = taskIdsToProcess || activeTaskIds;
    console.log('📋 Play in Order button clicked - Using manual task order...');
    
    // Update tagged tasks with the current order for game cards
    const orderedTaggedTasks = taskIds.map((taskId, index) => {
      const task = tasksById[taskId];
      const tags = taskTagsById[taskId] || { isLiked: false, isUrgent: false, isQuick: false };
      
      if (!task) {
        console.warn(`Task not found for ID: ${taskId}`);
        return null;
      }
      
      return {
        id: taskId, // Use actual task ID instead of temp ID
        title: task.title,
        list_location: 'active' as const,
        task_status: 'task_list' as const,
        is_liked: tags.isLiked,
        is_urgent: tags.isUrgent,
        is_quick: tags.isQuick,
        card_position: index + 1,
        notes: task.notes || '' // Include notes for game cards, fallback to empty string
      };
    }).filter(Boolean); // Remove any null entries
    
    console.log('📋 Setting tasks in manual order for game cards...');
    setTaggedTasks(orderedTaggedTasks);
    
    // Update tasks to not_started status when entering game
    await updateTasksToNotStarted(taskIds);
    
    // Go directly to game cards with processing state
    setCurrentStep('game-cards');
    setIsProcessing(true);
    
    // Open PiP after tasks are set
    setTimeout(() => {
      enterPiP();
    }, 100);
    
    // Run AI categorization in background for logging (optional)
    setTimeout(async () => {
      try {
        console.log('🤖 Getting AI categorization for manual order logging...');
        const taskTitles = taskIds.map(taskId => tasksById[taskId]?.title).filter(Boolean);
        const taskCategories = await categorizeTasks(taskTitles);
        
        // Log the manual order with AI categorization details
        console.log('🎯 Manual Task Organization:');
        taskIds.forEach((taskId, index) => {
          const task = tasksById[taskId];
          const tags = taskTagsById[taskId] || { isLiked: false, isUrgent: false, isQuick: false };
          const category = taskCategories[task?.title] || 'Routine';
          
          console.log(`📝 Task #${index + 1}: "${task?.title}"`, {
            position: index + 1,
            category: category,
            tags: {
              liked: tags.isLiked,
              urgent: tags.isUrgent,
              quick: tags.isQuick
            },
            reasoning: 'User-defined order - no AI scoring applied'
          });
        });
      } catch (error) {
        console.log('AI categorization failed (non-critical):', error);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const saveTasks = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to save tasks.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create tasks based on the current order in reviewedTasks
      const tasksToSave = reviewedTasks.map((taskTitle, index) => {
        const tags = taskTags[taskTitle] || { isLiked: false, isUrgent: false, isQuick: false };
        const category = taskCategories[taskTitle] || 'Routine'; // Get AI category or fallback
        const estimatedTime = taskTimeEstimates[taskTitle];
        const estimatedMinutes = estimatedTime ? parseTimeToMinutes(estimatedTime) : null;
        
        return {
          title: taskTitle,
          user_id: user.id,
          source: 'brain_dump' as const,
          list_location: 'active' as const, // New brain dump tasks go to active list
          task_status: 'task_list' as const, // New tasks start in task list
          category: category, // Save AI categorization
          is_liked: tags.isLiked,
          is_urgent: tags.isUrgent,
          is_quick: tags.isQuick,
          estimated_minutes: estimatedMinutes, // Convert time estimate to minutes
          card_position: index + 1 // Use the order from reviewedTasks
        };
      });

      console.log('💾 Saving tasks to database:', tasksToSave);

      const { error } = await supabase
        .from('tasks')
        .insert(tasksToSave);

      if (error) {
        console.error('Database error saving tasks:', error);
        throw error;
      }

      toast({
        title: "Success!",
        description: `${tasksToSave.length} tasks saved in order`,
      });

      // Already on game-cards step, just stop processing
      setIsProcessing(false);
    } catch (error) {
      console.error('Error saving tasks:', error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to save tasks";
      if (error.code === '23503') {
        errorMessage = "Profile setup incomplete. Please complete onboarding first.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const savePrioritizedTasks = async (tasksToSave: any[]) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to save tasks.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('💾 Saving prioritized tasks to database:', tasksToSave);

      const { error } = await supabase
        .from('tasks')
        .insert(tasksToSave);

      if (error) {
        console.error('Database error saving prioritized tasks:', error);
        throw error;
      }

      toast({
        title: "Success!",
        description: `${tasksToSave.length} prioritized tasks saved`,
      });

      // Already on game-cards step, just stop processing
      setIsProcessing(false);
    } catch (error) {
      console.error('Error saving prioritized tasks:', error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to save prioritized tasks";
      if (error.code === '23503') {
        errorMessage = "Profile setup incomplete. Please complete onboarding first.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Function to update task estimated time in database
  const updateTaskEstimatedTime = async (taskId: string, newTime: string) => {
    if (!user) return;

    try {
      const estimatedMinutes = newTime ? parseTimeToMinutes(newTime) : null;
      const isQuick = estimatedMinutes !== null && estimatedMinutes <= 20;
      
      const { error } = await supabase
        .from('tasks')
        .update({
          estimated_minutes: estimatedMinutes,
          is_quick: isQuick // Auto-apply quick tag if <= 20 minutes
        })
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task estimated time:', error);
        // Don't throw - we still want local state to update even if DB fails
      } else {
        const taskTitle = tasksById[taskId]?.title || taskId;
        console.log(`✅ Updated estimated time for "${taskTitle}" to ${estimatedMinutes} minutes`);
        
        // Update local state to reflect auto-applied quick tag
        if (isQuick) {
          setTaskTagsById(prev => ({
            ...prev,
            [taskId]: {
              ...prev[taskId] || { isLiked: false, isUrgent: false, isQuick: false },
              isQuick: true
            }
          }));
          console.log(`✅ Auto-applied quick tag to "${taskTitle}"`);
        }
      }
    } catch (error) {
      console.error('Failed to update task estimated time:', error);
    }
  };

  // Function to update task tags in database
  const updateTaskTags = async (taskId: string, tag: 'liked' | 'urgent' | 'quick', value: boolean) => {
    if (!user) return;

    try {
      const dbFieldName = tag === 'liked' ? 'is_liked' : tag === 'urgent' ? 'is_urgent' : 'is_quick';
      
      const { error } = await supabase
        .from('tasks')
        .update({
          [dbFieldName]: value
        })
        .eq('id', taskId);

      if (error) {
        console.error(`Error updating task ${tag} tag:`, error);
        // Don't throw - we still want local state to update even if DB fails
      } else {
        console.log(`✅ Updated ${tag} tag for task ID ${taskId} to ${value}`);
      }
    } catch (error) {
      console.error(`Failed to update task ${tag} tag:`, error);
    }
  };

  // Function to save a task as 'later' status in the database
  const saveTaskAsLater = async (taskId: string) => {
    if (!user) return;

    try {
      const task = tasksById[taskId];
      if (!task) {
        console.error('Task not found for ID:', taskId);
        return;
      }
      
      const tags = taskTagsById[taskId] || { isLiked: false, isUrgent: false, isQuick: false };
      const estimatedMinutes = task.estimated_minutes;
      
      const { error } = await supabase
        .from('tasks')
        .update({
          list_location: 'later' as const, // Move existing task to later list
          // Don't update task_status - preserve existing status (task_list or incomplete)
          is_liked: tags.isLiked,
          is_urgent: tags.isUrgent,
          is_quick: tags.isQuick,
          estimated_minutes: estimatedMinutes,
        })
        .eq('id', taskId)
        .eq('list_location', 'active'); // Only update if currently active

      if (error) {
        console.error('Error saving later task:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to save later task:', error);
    }
  };

  // Function to update task status from 'later' to 'active'
  const moveTaskFromLaterToActive = async (taskId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          list_location: 'active' as const,
        })
        .eq('id', taskId)
        .eq('list_location', 'later');

      if (error) {
        console.error('Error moving task from later to active:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to move task from later to active:', error);
    }
  };

  // Function to load all tasks from database and organize by ID
  const loadTasksById = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, list_location, task_status, is_liked, is_urgent, is_quick, category, estimated_minutes, notes, created_at, score')
        .eq('user_id', user.id)
        .in('list_location', ['active', 'later']) // Load both active and later tasks
        .order('created_at', { ascending: true });

      console.log('🔍 All tasks query result:', { data, error, count: data?.length });

      if (error) {
        console.error('Error loading tasks:', error);
        return;
      }

      if (data) {
        // Create lookup map
        const taskMap: Record<string, Task> = {};
        const activeIds: string[] = [];
        const laterIds: string[] = [];
        const taskTagsMap: Record<string, { isLiked: boolean; isUrgent: boolean; isQuick: boolean }> = {};
        const timeEstimatesMap: Record<string, string> = {};

        data.forEach(task => {
          // Populate task lookup map
          taskMap[task.id] = {
            id: task.id,
            title: task.title,
            list_location: task.list_location,
            task_status: task.task_status,
            is_liked: task.is_liked || false,
            is_urgent: task.is_urgent || false,
            is_quick: task.is_quick || false,
            notes: task.notes || '',
            estimated_minutes: task.estimated_minutes
          };

          // Separate active and later tasks
          if (task.list_location === 'active') {
            activeIds.push(task.id);
          } else if (task.list_location === 'later') {
            laterIds.push(task.id);
          }

          // Populate tag and time maps (keyed by ID now)
          taskTagsMap[task.id] = {
            isLiked: task.is_liked || false,
            isUrgent: task.is_urgent || false,
            isQuick: task.is_quick || false
          };

          if (task.estimated_minutes) {
            // Convert minutes back to display format
            const hours = Math.floor(task.estimated_minutes / 60);
            const minutes = task.estimated_minutes % 60;
            if (hours > 0) {
              timeEstimatesMap[task.id] = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
            } else {
              timeEstimatesMap[task.id] = `${minutes}m`;
            }
          }
        });

        // Update state - update both active and later tasks
        setTasksById(taskMap); // Replace all tasks (don't merge, use fresh data)
        setActiveTaskIds(activeIds);
        setLaterTaskIds(laterIds);
        
        // Keep Later section collapsed by default
        setTaskTagsById(taskTagsMap);
        setTaskTimeEstimatesById(timeEstimatesMap);
        // Keep legacy state for compatibility
        setTaskTags(taskTagsMap);
        setTaskTimeEstimates(timeEstimatesMap);

        console.log('✅ Loaded all tasks:', { 
          activeCount: activeIds.length,
          laterCount: laterIds.length,
          activeIds,
          laterIds,
          allTasks: data.map(t => ({ id: t.id, title: t.title, list_location: t.list_location }))
        });
      }
    } catch (error) {
      console.error('Failed to load tasks by ID:', error);
    }
  };

  // Function to load later tasks from database
  const loadLaterTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('title, is_liked, is_urgent, is_quick, estimated_minutes')
        .eq('user_id', user.id)
        .eq('list_location', 'later')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading later tasks:', error);
        return;
      }

      if (data) {
        const laterTaskTitles = data.map(task => task.title);
        setLaterTasks(laterTaskTitles);
        
        // Load their tags and time estimates from the database result
        data.forEach(task => {
          // Set tags
          setTaskTags(prev => ({
            ...prev,
            [task.title]: {
              isLiked: task.is_liked || false,
              isUrgent: task.is_urgent || false,
              isQuick: task.is_quick || false,
            }
          }));
          
          // Set time estimates (convert from minutes back to display format)
          if (task.estimated_minutes) {
            const displayTime = formatMinutesToDisplay(task.estimated_minutes);
            setTaskTimeEstimates(prev => ({
              ...prev,
              [task.title]: displayTime
            }));
          }
        });
      }
    } catch (error) {
      console.error('Failed to load later tasks:', error);
    }
  };

  // Task editing functions
  const handleTaskEdit = (taskId: string, taskTitle: string) => {
    setEditingTaskId(taskId);
    setEditingTaskText(taskTitle);
    // Focus the input after state update
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, 0);
  };

  const handleTaskSave = async (taskId: string, newTitle: string) => {
    if (!user) {
      return;
    }

    if (!newTitle.trim()) {
      // If empty, delete the task
      await handleTaskDelete(taskId);
      return;
    }

    const currentTask = tasksById[taskId];
    if (!currentTask) {
      cancelTaskEdit();
      return;
    }

    if (currentTask.title === newTitle.trim()) {
      // No changes, just exit edit mode
      cancelTaskEdit();
      return;
    }

    const trimmedTitle = newTitle.trim();

    try {
      // Update in Supabase
      const { error } = await supabase
        .from('tasks')
        .update({ title: trimmedTitle })
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating task:', error);
        return;
      }

      // Update local state
      setTasksById(prev => ({
        ...prev,
        [taskId]: {
          ...prev[taskId],
          title: trimmedTitle
        }
      }));

      setEditingTaskId(null);
      setEditingTaskText('');
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    const task = tasksById[taskId];
    const taskTitle = task?.title || 'Untitled Task';

    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error deleting task:', error);
        return;
      }

      // Remove from local state
      setActiveTaskIds(prev => prev.filter(id => id !== taskId));
      setLaterTaskIds(prev => prev.filter(id => id !== taskId));
      setReviewedTasks(prev => prev.filter(id => id !== taskId));
      
      // Clean up associated data
      setTasksById(prev => {
        const newTasks = { ...prev };
        delete newTasks[taskId];
        return newTasks;
      });

      setTaskTagsById(prev => {
        const newTags = { ...prev };
        delete newTags[taskId];
        return newTags;
      });

      setTaskTimeEstimatesById(prev => {
        const newEstimates = { ...prev };
        delete newEstimates[taskId];
        return newEstimates;
      });

      // Exit edit mode
      setEditingTaskId(null);
      setEditingTaskText('');

      toast({
        title: "Task deleted",
        description: `"${taskTitle}" has been removed.`,
      });
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const cancelTaskEdit = () => {
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  return (
      <div className="h-screen bg-background p-2 sm:p-4 overflow-hidden">
      {/* Settings - Fixed Top Right */}
      {currentStep === 'input' && (
        <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Back Button - Fixed Top Left */}
      {currentStep !== 'input' && currentStep !== 'game-cards' && (
        <Button
          onClick={() => {
            if (currentStep === 'prioritized') {
              setCurrentStep('review');
            } else {
              setCurrentStep('input');
            }
          }}
          variant="ghost"
          size="sm"
          className="fixed top-2 left-2 sm:top-4 sm:left-4 z-50 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      )}
      
      
      <div className={`${currentStep === 'game-cards' ? 'w-full' : (currentStep === 'input') ? 'sm:max-w-6xl sm:mx-auto sm:flex sm:items-center sm:justify-center h-full flex items-center justify-center px-2 sm:px-4' : currentStep === 'review' ? 'max-w-6xl mx-auto flex items-center justify-center h-full' : 'max-w-6xl mx-auto'} space-y-6`}>

        {/* Input Step */}
        {currentStep === 'input' && (
          <div className="relative w-full h-full max-h-[700px] flex items-center justify-center">
            <Card 
              ref={cardRef}
              id="main-task-container"
              className={`border-0 w-full max-w-2xl h-full sm:h-auto flex flex-col transition-all duration-600 ease-out shadow-xl ${
                isTransitioning ? 'shadow-2xl' : ''
              }`} 
              style={{ 
                transition: 'all 600ms cubic-bezier(0.4, 0, 0.2, 1), height 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 2 // Main container in middle layer
              }}>
            <CardHeader className="text-center px-4 sm:px-6 pb-2">
              {/* Mode Toggle with Magical Transition */}
              <div className="flex items-center justify-center gap-4 mb-2">
                <Label htmlFor="input-mode" className={`text-sm transition-colors duration-300 ${
                  isTransitioning ? 'text-muted-foreground' : 
                  inputMode === 'brain-dump' ? 'text-foreground' : 'text-foreground/30'
                }`}>
                  Capture
                </Label>
                
                {/* Clean Toggle Transition */}
                <Switch
                  id="input-mode"
                  checked={inputMode === 'list'}
                  onCheckedChange={(checked) => !isTransitioning && setInputMode(checked ? 'list' : 'brain-dump')}
                  disabled={isTransitioning}
                  className="transition-all duration-300 ease-out data-[state=checked]:bg-input data-[state=unchecked]:bg-input"
                />
                
                <Label htmlFor="input-mode" className={`text-sm transition-colors duration-300 ${
                  isTransitioning ? 'text-muted-foreground' : 
                  inputMode === 'list' ? 'text-foreground' : 'text-foreground/30'
                }`}>
                  Plan
                </Label>
              </div>
              
              {/* Separator Line - aligned with content */}
              <div className="h-px bg-border mt-4 mx-4 sm:mx-6"></div>
              
            </CardHeader>
            <CardContent ref={cardContentRef} className="flex-1 sm:flex-none flex flex-col px-4 sm:px-6 transition-all duration-500 ease-out">
              
              {inputMode === 'brain-dump' ? (
                // Brain Dump Mode
                <div className="min-h-[400px] flex flex-col">
                  <div className={`relative transition-all duration-600 ease-out flex-1 ${
                    isTransitioning ? 'opacity-60 scale-[0.98]' : 'opacity-100 scale-100'
                  }`} style={{ marginTop: '12px' }}>
                    <div className="bg-card focus-within:bg-muted/50 transition-all duration-300 rounded-md relative">
                      <Textarea
                        ref={textareaRef}
                        value={brainDumpText}
                        onChange={(e) => setBrainDumpText(e.target.value)}
                        onFocus={() => setIsTextareaFocused(true)}
                        onBlur={() => setIsTextareaFocused(false)}
                        disabled={isTransitioning}
                        className={`h-full min-h-[320px] resize-none !text-base leading-relaxed border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 ${
                          isTransitioning ? 'text-muted-foreground' : ''
                        }`}
                        rows={8}
                      />
                      <TypewriterPlaceholder isVisible={!brainDumpText && !isTextareaFocused && !isTransitioning} />
                    </div>
                  </div>
                  <Button 
                    onClick={handleBrainDumpSubmit}
                    disabled={!brainDumpText.trim() || isProcessing || isTransitioning}
                    className={`w-full h-12 sm:h-11 transition-all duration-300 mt-3 ${
                      isTransitioning ? 'scale-95 shadow-sm' : ''
                    }`}
                    size="lg"
                  >
                    {isProcessing || isTransitioning ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        {loadingMessages[currentMessageIndex]}
                      </>
                    ) : (
                      <>
                        Organise my Thoughts
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                // List Mode with Full Tagging Interface
                <div ref={taskListContentRef} className="flex flex-col h-full max-h-[700px] min-h-[400px] relative">
                  {/* Loading overlay for brain dump transition */}
                  {isTransitioning && listTasks.length === 0 && (
                    <div className="absolute inset-0 bg-card rounded-lg z-50 flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="flex justify-center space-x-3">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className="w-3 h-3 bg-primary rounded-full animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                        <div className="text-base font-medium text-foreground">
                          {loadingMessages[currentMessageIndex]}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Fixed input at top */}
                  <div className="flex-shrink-0 pb-3" style={{ marginTop: '12px' }}>
                    <div className="flex rounded-md bg-card focus-within:bg-muted/50 transition-all duration-300">
                      <Input
                        ref={taskInputRef}
                        value={newTaskInput}
                        onChange={(e) => setNewTaskInput(e.target.value)}
                        onKeyDown={handleAddTaskKeyPress}
                        placeholder="Share your Intention..."
                        className="flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 !text-base leading-relaxed focus:bg-transparent"
                        style={{ backgroundColor: 'transparent !important' }}
                      />
                      <Button 
                        onClick={handleAddTask}
                        disabled={!newTaskInput.trim()}
                        size="sm"
                        variant="ghost"
                        className="border-0 rounded-l-none hover:bg-transparent"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Scrollable task list area */}
                  <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                    <div className="relative">
                      
                      <DndContext 
                        sensors={sensors}
                        collisionDetection={customCollisionDetection}
                        onDragStart={(event: DragStartEvent) => {
                          setActiveId(event.active.id as string);
                        }}
                        onDragEnd={(event) => {
                          setActiveId(null);
                          const { active, over } = event;
                          
                          if (!over) return;
                          
                          const activeId = active.id as string;
                          const overId = over.id as string;
                          
                          // Handle moving between active and later lists (ID-based system)
                          if (overId === 'later-zone') {
                            // Move from active to later (only if explicitly dropping on the zone)
                            if (activeTaskIds.includes(activeId)) {
                              setActiveTaskIds(prev => prev.filter(taskId => taskId !== activeId));
                              setLaterTaskIds(prev => [...prev, activeId]);
                              // Save to database as later task
                              saveTaskAsLater(activeId);
                              // Keep collapsed by default - user can click to expand
                            }
                            return;
                          }
                          
                          if (overId === 'active-zone') {
                            // Move from later to active (only when dropping on the zone itself)
                            if (laterTaskIds.includes(activeId)) {
                              setLaterTaskIds(prev => prev.filter(taskId => taskId !== activeId));
                              setActiveTaskIds(prev => [...prev, activeId]);
                              // Update database status from later to active
                              moveTaskFromLaterToActive(activeId);
                            }
                            return;
                          }
                          
                          // Handle moving from later to active when dropping on an active task (ID-based system)
                          if (laterTaskIds.includes(activeId) && activeTaskIds.includes(overId)) {
                            const targetIndex = activeTaskIds.findIndex((taskId) => taskId === overId);
                            setLaterTaskIds(prev => prev.filter(taskId => taskId !== activeId));
                            setActiveTaskIds(prev => {
                              const newList = [...prev];
                              newList.splice(targetIndex, 0, activeId);
                              return newList;
                            });
                            // Update database status from later to active
                            moveTaskFromLaterToActive(activeId);
                            return;
                          }
                          
                          // Handle reordering within active tasks (ID-based system)
                          if (activeTaskIds.includes(activeId) && activeTaskIds.includes(overId)) {
                            const oldIndex = activeTaskIds.findIndex((taskId) => taskId === activeId);
                            const newIndex = activeTaskIds.findIndex((taskId) => taskId === overId);
                            if (oldIndex !== -1 && newIndex !== -1) {
                              setActiveTaskIds((items) => arrayMove(items, oldIndex, newIndex));
                            }
                          }
                          
                          // Handle reordering within later tasks (ID-based system)
                          if (laterTaskIds.includes(activeId) && laterTaskIds.includes(overId)) {
                            const oldIndex = laterTaskIds.findIndex((taskId) => taskId === activeId);
                            const newIndex = laterTaskIds.findIndex((taskId) => taskId === overId);
                            if (oldIndex !== -1 && newIndex !== -1) {
                              setLaterTaskIds((items) => arrayMove(items, oldIndex, newIndex));
                            }
                          }
                        }}
                      >
                        <div>
                          {/* Active Tasks */}
                          <DroppableZone id="active-zone">
                            <SortableContext 
                              items={activeTaskIds}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2 transition-all duration-300 ease-out min-h-[40px]">
                                {(() => {
                                  const filteredTasks = activeTaskIds.filter(taskId => {
                                    const task = tasksById[taskId];
                                    return task && task.title; // Only include tasks with titles
                                  });
                                  return filteredTasks.map((taskId, index) => {
                                    const task = tasksById[taskId];
                                    const tags = taskTagsById[taskId] || { isLiked: false, isUrgent: false, isQuick: false };
                                    return (
                                      <div
                                        key={taskId}
                                        className="animate-in fade-in slide-in-from-top-2 fill-mode-both"
                                        style={{ 
                                          animationDelay: `${index * 100}ms`,
                                          animationDuration: '400ms',
                                          animationTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                                        }}
                                      >
                                        <TaskListItem
                                          task={taskId}
                                          index={index}
                                          isLiked={tags.isLiked}
                                          isUrgent={tags.isUrgent}
                                          isQuick={tags.isQuick}
                                          estimatedTime={taskTimeEstimatesById[taskId]}
                                          isLoadingTime={loadingTimeEstimates.has(taskId)}
                                          isLastInSection={index === filteredTasks.length - 1}
                                      taskTitle={task?.title || 'NO_TITLE_FOUND'}
                                      onTimeUpdate={(newTime) => {
                                        // Update local state immediately for responsive UI
                                        setTaskTimeEstimatesById(prev => ({
                                          ...prev,
                                          [taskId]: newTime
                                        }));
                                        // Update database to maintain single source of truth
                                        updateTaskEstimatedTime(taskId, newTime);
                                      }}
                                      onReorder={() => {}}
                                      onHover={setHoveredTaskIndex}
                                      onTagUpdate={(tag, value) => {
                                        // Update local state immediately for responsive UI
                                        setTaskTagsById(prev => ({
                                          ...prev,
                                          [taskId]: {
                                            ...prev[taskId] || { isLiked: false, isUrgent: false, isQuick: false },
                                            [tag === 'liked' ? 'isLiked' : tag === 'urgent' ? 'isUrgent' : 'isQuick']: value
                                          }
                                        }));
                                        // Update database to maintain single source of truth
                                        updateTaskTags(taskId, tag, value);
                                      }}
                                      isEditing={editingTaskId === taskId}
                                      editingText={editingTaskText}
                                      editInputRef={editInputRef}
                                      onTaskEdit={handleTaskEdit}
                                      onTaskSave={handleTaskSave}
                                      onTaskCancel={cancelTaskEdit}
                                      onEditingTextChange={setEditingTaskText}
                                    />
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </SortableContext>
                          </DroppableZone>

                          {/* Later Divider - Droppable and Clickable */}
                          {(activeTaskIds.length + laterTaskIds.length) >= 1 && (
                            <DroppableZone id="later-zone">
                              <div 
                                className="flex items-center gap-4 py-6 cursor-pointer hover:bg-muted/10 rounded-lg transition-colors group"
                                onClick={() => setLaterTasksExpanded(!laterTasksExpanded)}
                              >
                                <div className="flex-1 h-px bg-border group-hover:bg-muted-foreground/50 transition-colors"></div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-foreground/30 font-medium group-hover:text-foreground transition-colors">
                                    Later ({laterTaskIds.length})
                                  </span>
                                  {laterTaskIds.length > 0 && (
                                    <ChevronDown 
                                      className={`h-4 w-4 text-foreground/30 group-hover:text-foreground transition-all duration-200 ${
                                        laterTasksExpanded ? 'rotate-180' : ''
                                      }`} 
                                    />
                                  )}
                                </div>
                                <div className="flex-1 h-px bg-border group-hover:bg-muted-foreground/50 transition-colors"></div>
                              </div>
                            </DroppableZone>
                          )}

                          {/* Later Tasks - Only show when expanded */}
                          {(activeTaskIds.length + laterTaskIds.length) >= 1 && laterTasksExpanded && laterTaskIds.length > 0 && (
                            <SortableContext 
                              items={laterTaskIds}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2 transition-all duration-300 ease-out overflow-hidden">
                                {(() => {
                                  const filteredTasks = laterTaskIds.filter(taskId => {
                                    const task = tasksById[taskId];
                                    return task && task.title; // Only include tasks with titles
                                  });
                                  return filteredTasks.map((taskId, index) => {
                                    const task = tasksById[taskId];
                                    const tags = taskTagsById[taskId] || { isLiked: false, isUrgent: false, isQuick: false };
                                return (
                                  <div
                                    key={taskId}
                                    className="animate-in fade-in slide-in-from-top-2 fill-mode-both"
                                    style={{ 
                                      animationDelay: `${index * 100}ms`,
                                      animationDuration: '400ms',
                                      animationTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                                    }}
                                  >
                                    <TaskListItem
                                      task={taskId}
                                      index={index}
                                      isLiked={tags.isLiked}
                                      isUrgent={tags.isUrgent}
                                      isQuick={tags.isQuick}
                                      estimatedTime={taskTimeEstimatesById[taskId]}
                                      isLoadingTime={loadingTimeEstimates.has(taskId)}
                                      isLastInSection={index === filteredTasks.length - 1}
                                      taskTitle={task?.title || 'NO_TITLE_FOUND'}
                                      onTimeUpdate={(newTime) => {
                                        // Update local state immediately for responsive UI
                                        setTaskTimeEstimatesById(prev => ({
                                          ...prev,
                                          [taskId]: newTime
                                        }));
                                        // Update database to maintain single source of truth
                                        updateTaskEstimatedTime(taskId, newTime);
                                      }}
                                      onReorder={() => {}}
                                      onHover={setHoveredTaskIndex}
                                      onTagUpdate={(tag, value) => {
                                        // Update local state immediately for responsive UI
                                        setTaskTagsById(prev => ({
                                          ...prev,
                                          [taskId]: {
                                            ...prev[taskId] || { isLiked: false, isUrgent: false, isQuick: false },
                                            [tag === 'liked' ? 'isLiked' : tag === 'urgent' ? 'isUrgent' : 'isQuick']: value
                                          }
                                        }));
                                        // Update database to maintain single source of truth
                                        updateTaskTags(taskId, tag, value);
                                      }}
                                      isEditing={editingTaskId === taskId}
                                      editingText={editingTaskText}
                                      editInputRef={editInputRef}
                                      onTaskEdit={handleTaskEdit}
                                      onTaskSave={handleTaskSave}
                                      onTaskCancel={cancelTaskEdit}
                                      onEditingTextChange={setEditingTaskText}
                                      showNumber={false}
                                    />
                                  </div>
                                );
                                  });
                                })()}
                              </div>
                            </SortableContext>
                          )}

                        </div>
                        
                        <DragOverlay>
                          {activeId ? (
                            <div className="bg-card border border-border rounded-lg shadow-lg p-3 opacity-95">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs font-medium">
                                </div>
                                <span className="text-sm font-medium">
                                  {tasksById[activeId]?.title || 'Untitled Task'}
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </DragOverlay>
                      </DndContext>
                    </div>
                  </div>
                  
                  {/* Fixed buttons at bottom */}
                  <div className="flex-shrink-0 pt-4">
                    {/* Action Buttons - Show appropriate buttons based on state */}
                  {cameFromBrainDump && listTasks.length === 0 && laterTasks.length === 0 && !isTransitioning ? (
                    <Button 
                      onClick={handleListSubmit}
                      disabled={activeTaskIds.length === 0 && laterTaskIds.length === 0 && !cameFromBrainDump}
                      className="w-full h-12 sm:h-11"
                      size="lg"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Share for AI Processing
                    </Button>
                  ) : (listTasks.length > 0 || laterTasks.length > 0 || !isTransitioning) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-12">
                      <Button
                        onClick={() => {
                          // Pass only active tasks to shuffle (later tasks stay in later list)
                          handleShuffle(listTasks);
                        }}
                        disabled={(activeTaskIds.length === 0 && laterTaskIds.length === 0) || isProcessing || isTransitioning}
                        className="w-full h-12 sm:h-11 transition-all duration-300 hover:scale-105"
                        size="lg"
                      >
                        Shuffle
                      </Button>

                      <Button
                        onClick={() => {
                          // Pass only active tasks to manual order (later tasks stay in later list)
                          handleManualOrder(activeTaskIds);
                        }}
                        variant="outline"
                        disabled={(activeTaskIds.length === 0 && laterTaskIds.length === 0) || isProcessing || isTransitioning}
                        className="w-full h-12 sm:h-11 transition-all duration-300 hover:scale-105"
                        size="lg"
                      >
                        Play in Order
                      </Button>
                    </div>
                  ) : null}
                  </div>
                </div>
              )}
            </CardContent>
            
            </Card>
            
            {/* Timeline - Positioned relative to wrapper, height matches Card */}
            {inputMode === 'list' && (listTasks.length > 0 || activeTaskIds.length > 0) && (
              <div 
                className="hidden lg:block absolute w-80 overflow-y-auto transition-all duration-500 ease-in-out cursor-pointer group"
                style={{
                  top: '50%',
                  height: cardRef.current?.offsetHeight || '700px',
                  transform: `translateY(-50%) ${!timelineExpanded ? 'translateX(0)' : 'translateX(0)'}`,
                  right: timelineExpanded ? '-7rem' : '13rem',
                  zIndex: timelineExpanded ? 0 : 0,
                }}
                onMouseEnter={(e) => {
                  if (!timelineExpanded) {
                    e.currentTarget.style.transform = `translateY(-50%) translateX(2rem)`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!timelineExpanded) {
                    e.currentTarget.style.transform = `translateY(-50%) translateX(0)`;
                  }
                }}
                onClick={() => setTimelineExpanded(!timelineExpanded)}
              >
                <TaskTimeline 
                  tasks={activeTaskIds.map(id => tasksById[id]?.title).filter(title => title)}
                  timeEstimates={(() => {
                    // Convert ID-based estimates to title-based estimates for timeline
                    const titleBasedEstimates: Record<string, string> = {};
                    activeTaskIds.forEach(id => {
                      const task = tasksById[id];
                      const estimate = taskTimeEstimatesById[id];
                      if (task?.title && estimate) {
                        titleBasedEstimates[task.title] = estimate;
                      }
                    });
                    // Fallback to legacy taskTimeEstimates for tasks not in ID system
                    return { ...taskTimeEstimates, ...titleBasedEstimates };
                  })()}
                  hoveredTaskIndex={hoveredTaskIndex}
                  className={timelineExpanded ? 'bg-transparent' : ''}
                />
              </div>
            )}
          </div>
        )}


        {/* Review & Tag Step */}
        {currentStep === 'review' && (
          <Card className="mx-2 sm:mx-0 mt-16 sm:mt-0">
            <CardHeader className="px-4 sm:px-6">
              <p className="text-muted-foreground text-sm sm:text-base">
                Tag anything that might be fun, urgent or quick.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={reviewedTasks}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 sm:space-y-3">
                    {reviewedTasks.map((taskId, index) => {
                      const task = tasksById[taskId];
                      if (!task) return null;
                      const tags = taskTagsById[taskId] || { isLiked: false, isUrgent: false, isQuick: false };
                      return (
                         <TaskListItem
                           key={taskId}
                           task={taskId}
                           index={index}
                           isLiked={tags.isLiked}
                           isUrgent={tags.isUrgent}
                           isQuick={tags.isQuick}
                           estimatedTime={taskTimeEstimatesById[taskId]}
                           isLoadingTime={loadingTimeEstimates.has(taskId)}
                           isLastInSection={index === reviewedTasks.length - 1}
                           taskTitle={task?.title || 'NO_TITLE_FOUND'}
                           onTimeUpdate={(newTime) => {
                             // Update local state immediately for responsive UI
                             setTaskTimeEstimates(prev => ({
                               ...prev,
                               [task]: newTime
                             }));
                             // Update database to maintain single source of truth
                             updateTaskEstimatedTime(task, newTime);
                           }}
                           onReorder={handleReorder}
                           onTagUpdate={(tag, value) => {
                             // Update local state immediately for responsive UI
                             setTaskTags(prev => ({
                               ...prev,
                               [task]: {
                                 ...prev[task] || { isLiked: false, isUrgent: false, isQuick: false },
                                 [tag === 'liked' ? 'isLiked' : tag === 'urgent' ? 'isUrgent' : 'isQuick']: value
                               }
                             }));
                             // Update database to maintain single source of truth
                             updateTaskTags(task, tag, value);
                           }}
                           isEditing={editingTaskId === taskId}
                           editingText={editingTaskText}
                           editInputRef={editInputRef}
                           onTaskEdit={handleTaskEdit}
                           onTaskSave={handleTaskSave}
                           onTaskCancel={cancelTaskEdit}
                           onEditingTextChange={setEditingTaskText}
                         />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
              
              {/* Direct Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pt-4 md:pt-6">
                <Button
                  onClick={() => handleShuffle()}
                  disabled={isProcessing}
                  className="w-full h-12 sm:h-11"
                  size="lg"
                >
                  Shuffle the Deck
                </Button>

                <Button
                  onClick={() => handleManualOrder()}
                  variant="outline"
                  className="w-full h-12 sm:h-11"
                  size="lg"
                >
                  Play in Order
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prioritized Step - Show AI-ordered list with explanations */}
        {currentStep === 'prioritized' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shuffle className="h-5 w-5" />
                AI-Prioritized Task Order ({prioritizedTasks.length} tasks)
              </CardTitle>
              <p className="text-muted-foreground">
                Here's how I've prioritized your tasks based on your preferences and tags
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {prioritizedTasks.map((task, index) => (
                  <div key={task.id} className="p-4 bg-card border rounded-lg">
                    <div className="flex items-start gap-4">
                      {/* Priority Position */}
                      <div className="flex-shrink-0 w-10 h-10 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-lg font-bold">
                        {index + 1}
                      </div>
                      
                      {/* Task Content */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">{task.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            Score: {task.priority_score}
                          </Badge>
                        </div>
                        
                        {/* Tags */}
                        <div className="flex gap-1">
                          {task.is_liked && (
                            <Badge variant="secondary" className="text-xs bg-rose-100 text-rose-700">
                              Love
                            </Badge>
                          )}
                          {task.is_urgent && (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                              Urgent
                            </Badge>
                          )}
                          {task.is_quick && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                              Quick
                            </Badge>
                          )}
                        </div>
                        
                        {/* Explanation */}
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {task.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <Button 
                  onClick={() => {
                    // Save prioritized tasks to database
                    const tasksToSave = prioritizedTasks.map((task, index) => {
                      const estimatedTime = taskTimeEstimates[task.title];
                      const estimatedMinutes = estimatedTime ? parseTimeToMinutes(estimatedTime) : null;
                      
                      return {
                        title: task.title,
                        user_id: user.id,
                        source: 'brain_dump' as const,
                        list_location: 'active' as const, // Prioritized tasks go to active list
                        task_status: 'task_list' as const, // New tasks start in task list
                        category: task.category || 'Routine', // Save AI category
                        is_liked: task.is_liked,
                        is_urgent: task.is_urgent,
                        is_quick: task.is_quick,
                        estimated_minutes: estimatedMinutes, // Convert time estimate to minutes
                        card_position: index + 1
                      };
                    });
                    savePrioritizedTasks(tasksToSave);
                  }}
                  className="flex-1" 
                  size="lg"
                >
                  Save This Order
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  onClick={() => setCurrentStep('review')} 
                  variant="outline"
                  size="lg"
                >
                  Adjust Tags
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Game Cards Step */}
        {currentStep === 'game-cards' && (
          <GameTaskCards
            tasks={prioritizedTasks.length > 0 ? prioritizedTasks.map((task) => ({
              ...task,
              estimated_time: taskTimeEstimates[task.title] || formatEstimatedTime(task.estimated_minutes)
            })) : taggedTasks.map((task) => ({
              id: task.id,
              title: task.title,
              priority_score: task.card_position,
              explanation: `Task ${task.card_position} in your manual order`,
              is_liked: task.is_liked,
              is_urgent: task.is_urgent,
              is_quick: task.is_quick,
              estimated_time: taskTimeEstimates[task.title] || formatEstimatedTime(tasksById[task.id]?.estimated_minutes),
              notes: task.notes // Include notes for game cards
            }))}
            isLoading={isProcessing}
            isProcessing={isProcessing}
            onLoadingComplete={() => setIsProcessing(false)}
            onComplete={async (completedTaskIds: Set<string>) => {
              console.log('Finishing session with completed IDs:', completedTaskIds);
              
              // Get the actual task objects that were passed to the game
              const gameTasks = prioritizedTasks.length > 0 ? prioritizedTasks.map((task) => ({
                ...task,
                estimated_time: taskTimeEstimates[task.title]
              })) : taggedTasks.map((task) => ({
                id: task.id,
                title: task.title,
                priority_score: task.card_position,
                explanation: `Task ${task.card_position} in your manual order`,
                is_liked: task.is_liked,
                is_urgent: task.is_urgent,
                is_quick: task.is_quick,
                estimated_time: taskTimeEstimates[task.title]
              }));
              
              console.log('Game tasks:', gameTasks);
              
              // Find incomplete tasks (tasks that were in game but not completed)
              const incompleteTasks = gameTasks.filter(task => {
                const isCompleted = completedTaskIds.has(task.id);
                console.log(`Task "${task.title}" (ID: ${task.id}) completed:`, isCompleted);
                return !isCompleted;
              });

              console.log('Incomplete tasks:', incompleteTasks);

              // Move incomplete tasks to "later" list in database
              if (user && incompleteTasks.length > 0) {
                console.log('Moving incomplete tasks to later list:', incompleteTasks.map(t => t.title));
                
                for (const task of incompleteTasks) {
                  try {
                    await supabase
                      .from('tasks')
                      .update({
                        list_location: 'later',
                        task_status: 'incomplete' // Keep as incomplete since they started but didn't finish
                      })
                      .eq('id', task.id);
                  } catch (error) {
                    console.error('Error moving incomplete task to later:', error);
                  }
                }

                toast({
                  title: "Session Complete!",
                  description: `Great work! ${incompleteTasks.length} incomplete tasks saved for later.`,
                });
              } else {
                toast({
                  title: "Session Complete!",
                  description: "Great work on focusing through your tasks!",
                });
              }
              
              // Refresh task list to show updated state BEFORE resetting flow
              await loadTasksById();
              resetFlow();
            }}
            onTaskComplete={(taskId) => {
              console.log('Task completed:', taskId);
            }}
          />
        )}
      </div>
      
      {/* Settings Modal */}
      <SettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
      </div>
  );
};

const Tasks = () => {
  return (
    <PiPProvider>
      <TasksContent />
    </PiPProvider>
  );
};

export default Tasks;
