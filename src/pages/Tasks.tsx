import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Shuffle, ArrowRight, Check, Heart, Zap, ArrowLeft, AlertTriangle, Settings, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTypewriter } from "@/hooks/use-typewriter";
import { GameLoadingScreen } from "@/components/tasks/GameLoadingScreen";
import { GameTaskCards } from "@/components/tasks/GameTaskCards";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { convertOnboardingPreferencesToCategoryRatings, categorizeTask, categorizeTasks, getCurrentEnergyState } from "@/utils/taskCategorization";
import { InlineTimeEditor } from "@/components/ui/InlineTimeEditor";
import { validateAndFormatTimeInput } from "@/utils/timeUtils";
import { TaskTimeline } from "@/components/tasks/TaskTimeline";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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

type FlowStep = 'input' | 'review' | 'prioritized' | 'game-loading' | 'game-cards';

interface ExtractedTask {
  title: string;
  estimated_time: string;
}

interface Task {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'skipped';
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  is_disliked?: boolean;
  card_position: number;
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
  task: string;
  index: number;
  isLiked: boolean;
  isUrgent: boolean;
  isQuick: boolean;
  estimatedTime?: string;
  isLoadingTime?: boolean;
  onTagUpdate: (tag: 'liked' | 'urgent' | 'quick', value: boolean) => void;
  onTimeUpdate?: (newTime: string) => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onHover?: (index: number | undefined) => void;
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

const TaskListItem = ({ task, index, isLiked, isUrgent, isQuick, estimatedTime, isLoadingTime, onTagUpdate, onTimeUpdate, onReorder, onHover }: TaskListItemProps) => {
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

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`border-b border-border/30 hover:bg-muted/20 transition-colors ${
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
            className="flex-shrink-0 w-8 h-8 bg-gray-500 text-white rounded-full flex items-center justify-center text-sm font-medium cursor-grab hover:cursor-grabbing hover:scale-110 transition-transform touch-manipulation"
            aria-label="Drag to reorder"
          >
            {index + 1}
          </div>
          
          {/* Task Title - Full width, no truncation */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-5 text-foreground break-words">
              {task}
            </p>
          </div>
        </div>
        
        {/* Mobile Tag Controls - Horizontal row of 3 icons */}
        <div className="flex items-center justify-center gap-3 px-3 pb-3 pt-1">
          {(isLiked || isHovering) && (
            <button
              className={`p-3 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center bg-card border ${
                isLiked ? 'border-border text-red-500' : 'border-border text-gray-400'
              }`}
              onClick={() => onTagUpdate('liked', !isLiked)}
              aria-label="Mark as loved"
            >
              <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          )}
          
          {(isUrgent || isHovering) && (
            <button
              className={`p-3 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center bg-card border ${
                isUrgent ? 'border-border text-yellow-500' : 'border-border text-gray-400'
              }`}
              onClick={() => onTagUpdate('urgent', !isUrgent)}
              aria-label="Mark as urgent"
            >
              <AlertTriangle className={`h-5 w-5 ${isUrgent ? 'fill-current' : ''}`} />
            </button>
          )}
          
          {(isQuick || isHovering) && (
            <button
              className={`p-3 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center bg-card border ${
                isQuick ? 'border-border text-green-500' : 'border-border text-gray-400'
              }`}
              onClick={() => onTagUpdate('quick', !isQuick)}
              aria-label="Mark as quick"
            >
              <Zap className={`h-5 w-5 ${isQuick ? 'fill-current' : ''}`} />
            </button>
          )}
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
          className="flex-shrink-0 w-8 h-8 bg-gray-500 text-white rounded-full flex items-center justify-center text-sm font-medium cursor-grab hover:cursor-grabbing hover:scale-110 transition-transform"
          aria-label="Drag to reorder"
        >
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
          {(isLiked || isHovering) && (
            <Heart
              className={`h-5 w-5 cursor-pointer transition-colors hover:scale-110 ${
                isLiked ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-400'
              }`}
              onClick={() => onTagUpdate('liked', !isLiked)}
            />
          )}
          
          {(isUrgent || isHovering) && (
            <AlertTriangle
              className={`h-5 w-5 cursor-pointer transition-colors hover:scale-110 ${
                isUrgent ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400 hover:text-yellow-400'
              }`}
              onClick={() => onTagUpdate('urgent', !isUrgent)}
            />
          )}
          
          {(isQuick || isHovering) && (
            <Zap
              className={`h-5 w-5 cursor-pointer transition-colors hover:scale-110 ${
                isQuick ? 'text-green-500 fill-green-500' : 'text-gray-400 hover:text-green-400'
              }`}
              onClick={() => onTagUpdate('quick', !isQuick)}
            />
          )}
          
          {/* Time Estimate */}
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

const Tasks = () => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('input');
  const [brainDumpText, setBrainDumpText] = useState("");
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [reviewedTasks, setReviewedTasks] = useState<string[]>([]);
  const [taggedTasks, setTaggedTasks] = useState<Task[]>([]);
  const [taskTags, setTaskTags] = useState<Record<string, { isLiked: boolean; isUrgent: boolean; isQuick: boolean }>>({});
  const [taskTimeEstimates, setTaskTimeEstimates] = useState<Record<string, string>>({});
  const [prioritizedTasks, setPrioritizedTasks] = useState<PrioritizedTask[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Mr. Intent's sarcastic loading messages
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
  const [listTasks, setListTasks] = useState<string[]>([]);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [loadingTimeEstimates, setLoadingTimeEstimates] = useState<Set<string>>(new Set());
  const [cardDimensions, setCardDimensions] = useState({ top: 0, height: 0 });
  const [hoveredTaskIndex, setHoveredTaskIndex] = useState<number | undefined>(undefined);
  const { toast } = useToast();

  // Refs for global auto-focus functionality
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const taskInputRef = useRef<HTMLInputElement>(null);
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
      
      // Small delay to show the transition animation
      setTimeout(() => {
        // Switch to list mode and populate with extracted tasks
        setListTasks(extractedTaskTitles);
        setInputMode('list');
        
        // Also set reviewedTasks for compatibility with existing flow
        setReviewedTasks(extractedTaskTitles);
        
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
    setNewTaskInput('');
    setTaskTags({});
    setTaskTimeEstimates({});
    setIsTransitioning(false);
    setCameFromBrainDump(false); // Reset brain dump flag
    setInputMode('brain-dump'); // Reset to brain-dump mode
  };

  // Extract time estimate for a single task
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
  const handleAddTask = () => {
    if (newTaskInput.trim()) {
      const taskTitle = newTaskInput.trim();
      setListTasks(prev => [...prev, taskTitle]);
      setNewTaskInput('');
      
      // Extract time estimate for the new task
      extractTimeEstimate(taskTitle);
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
        position: index + 1
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
        }
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

  const handleShuffle = async (tasksToProcess?: string[]) => {
    console.log('🎲 Shuffle button clicked - Starting AI prioritization...');
    
    // Go directly to game-cards with loading state
    setCurrentStep('game-cards');
    setIsProcessing(true);
    
    try {
      // Run AI prioritization in background while loading card shows
      const prioritized = await prioritizeTasks(tasksToProcess);
      setPrioritizedTasks(prioritized);
      
    } catch (error) {
      console.error('Error during shuffling:', error);
      toast({
        title: "Error",
        description: "Failed to prioritize tasks",
        variant: "destructive",
      });
      // Go back to review step on error
      setCurrentStep('review');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualOrder = async (tasksToProcess?: string[]) => {
    const tasks = tasksToProcess || reviewedTasks;
    console.log('📋 Play in Order button clicked - Using manual task order...');
    
    // Update tagged tasks with the current order for game cards
    const orderedTaggedTasks = tasks.map((taskTitle, index) => {
      const tags = taskTags[taskTitle] || { isLiked: false, isUrgent: false, isQuick: false };
      return {
        id: `temp-${index}`,
        title: taskTitle,
        status: 'active' as const,
        is_liked: tags.isLiked,
        is_urgent: tags.isUrgent,
        is_quick: tags.isQuick,
        card_position: index + 1
      };
    });
    
    console.log('📋 Setting tasks in manual order for game cards...');
    setTaggedTasks(orderedTaggedTasks);
    
    // Show loading screen immediately
    setCurrentStep('game-loading');
    
    // Run AI categorization in background for logging (optional)
    setTimeout(async () => {
      try {
        console.log('🤖 Getting AI categorization for manual order logging...');
        const taskCategories = await categorizeTasks(tasks);
        
        // Log the manual order with AI categorization details
        console.log('🎯 Manual Task Organization:');
        tasks.forEach((taskTitle, index) => {
          const tags = taskTags[taskTitle] || { isLiked: false, isUrgent: false, isQuick: false };
          const category = taskCategories[taskTitle] || 'Routine';
          
          console.log(`📝 Task #${index + 1}: "${taskTitle}"`, {
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
        return {
          title: taskTitle,
          user_id: user.id,
          source: 'brain_dump' as const,
          is_liked: tags.isLiked,
          is_urgent: tags.isUrgent,
          is_quick: tags.isQuick,
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

      setCurrentStep('game-loading');
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

      setCurrentStep('game-loading');
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

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      {/* Theme Toggle and Settings - Fixed Top Right */}
      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-2">
        {currentStep === 'input' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
        <ThemeToggle />
      </div>
      
      {/* Back Button - Fixed Top Left */}
      {currentStep !== 'input' && (
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
      
      <div className={`${currentStep === 'game-cards' ? 'w-full' : (currentStep === 'input') ? 'sm:max-w-6xl sm:mx-auto sm:flex sm:items-center sm:justify-center sm:min-h-screen fixed inset-0 flex items-center justify-center pt-16 pb-6 px-2 sm:relative sm:pt-0 sm:pb-0 sm:px-4' : currentStep === 'review' ? 'max-w-6xl mx-auto flex items-center justify-center min-h-screen' : 'max-w-6xl mx-auto'} space-y-6`}>

        {/* Input Step */}
        {currentStep === 'input' && (
          <Card 
            ref={cardRef}
            id="main-task-container"
            className={`border-0 w-full max-w-2xl h-full sm:h-auto flex flex-col transition-all duration-600 ease-out relative ${
              isTransitioning ? 'shadow-2xl' : ''
            }`} 
            style={{ 
              transition: 'all 600ms cubic-bezier(0.4, 0, 0.2, 1), height 400ms cubic-bezier(0.4, 0, 0.2, 1)'
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
                <>
                  <div className={`relative transition-all duration-600 ease-out ${
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
                        className={`h-full sm:h-auto sm:min-h-[250px] resize-none !text-base leading-relaxed border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 ${
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
                </>
              ) : (
                // List Mode with Full Tagging Interface
                <div ref={taskListContentRef}>
                  <div className="space-y-3 min-h-[250px] transition-all duration-500 ease-out" style={{ marginTop: '12px' }}>
                    {/* Add Task Input - Fixed at top */}
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
                    
                    {/* Task List with Tagging */}
                    <div className="relative">
                      {/* Loading overlay with clean background */}
                      {isTransitioning && listTasks.length === 0 && (
                        <div className="absolute inset-0 bg-card rounded-lg z-10 flex items-center justify-center min-h-[200px]">
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
                      
                      {listTasks.length > 0 && (
                      <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => {
                          const { active, over } = event;
                          if (active.id !== over?.id) {
                            const oldIndex = listTasks.findIndex((task) => task === active.id);
                            const newIndex = listTasks.findIndex((task) => task === over?.id);
                            if (oldIndex !== -1 && newIndex !== -1) {
                              setListTasks((items) => arrayMove(items, oldIndex, newIndex));
                            }
                          }
                        }}
                      >
                        <SortableContext 
                          items={listTasks}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2 transition-all duration-300 ease-out">
                            {listTasks.map((task, index) => {
                              const tags = taskTags[task] || { isLiked: false, isUrgent: false, isQuick: false };
                              return (
                                <div
                                  key={task}
                                  className="animate-in fade-in slide-in-from-top-2 fill-mode-both"
                                  style={{ 
                                    animationDelay: `${index * 100}ms`,
                                    animationDuration: '400ms',
                                    animationTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                                  }}
                                >
                                  <TaskListItem
                                    task={task}
                                    index={index}
                                    isLiked={tags.isLiked}
                                    isUrgent={tags.isUrgent}
                                    isQuick={tags.isQuick}
                                    estimatedTime={taskTimeEstimates[task]}
                                    isLoadingTime={loadingTimeEstimates.has(task)}
                                    onTimeUpdate={(newTime) => {
                                      setTaskTimeEstimates(prev => ({
                                        ...prev,
                                        [task]: newTime
                                      }));
                                    }}
                                    onReorder={() => {}} // Handled by DndContext
                                    onHover={setHoveredTaskIndex}
                                    onTagUpdate={(tag, value) => {
                                      setTaskTags(prev => ({
                                        ...prev,
                                        [task]: {
                                          ...prev[task] || { isLiked: false, isUrgent: false, isQuick: false },
                                          [tag === 'liked' ? 'isLiked' : tag === 'urgent' ? 'isUrgent' : 'isQuick']: value
                                        }
                                      }));
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                      )}
                    </div>
                    
                  </div>
                  
                  {/* Action Buttons - Show appropriate buttons based on state */}
                  {cameFromBrainDump && listTasks.length === 0 && !isTransitioning ? (
                    <Button 
                      onClick={handleListSubmit}
                      disabled={listTasks.length === 0 && !cameFromBrainDump}
                      className="w-full h-12 sm:h-11"
                      size="lg"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Share with Mr.Intent
                    </Button>
                  ) : (listTasks.length > 0 || !isTransitioning) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-12">
                      <Button
                        onClick={() => {
                          // Pass list tasks directly to shuffle, avoiding async state issue
                          handleShuffle(listTasks);
                        }}
                        disabled={listTasks.length === 0 || isProcessing || isTransitioning}
                        className="w-full h-12 sm:h-11 transition-all duration-300 hover:scale-105"
                        size="lg"
                      >
                        Shuffle
                      </Button>

                      <Button
                        onClick={() => {
                          // Pass list tasks directly to manual order, avoiding async state issue
                          handleManualOrder(listTasks);
                        }}
                        variant="outline"
                        disabled={listTasks.length === 0 || isProcessing || isTransitioning}
                        className="w-full h-12 sm:h-11 transition-all duration-300 hover:scale-105"
                        size="lg"
                      >
                        Play in Order
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
            
            {/* Timeline - Only show in List View - positioned relative to card */}
            {inputMode === 'list' && listTasks.length > 0 && (
              <div 
                className="hidden lg:block absolute w-80 top-0 h-full"
                style={{
                  right: '-21rem' // Timeline width (20rem) + gap (1rem)
                }}
              >
                <TaskTimeline 
                  tasks={listTasks}
                  timeEstimates={taskTimeEstimates}
                  hoveredTaskIndex={hoveredTaskIndex}
                />
              </div>
            )}
          </Card>
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
                    {reviewedTasks.map((task, index) => {
                      const tags = taskTags[task] || { isLiked: false, isUrgent: false, isQuick: false };
                      return (
                         <TaskListItem
                           key={task}
                           task={task}
                           index={index}
                           isLiked={tags.isLiked}
                           isUrgent={tags.isUrgent}
                           isQuick={tags.isQuick}
                           estimatedTime={taskTimeEstimates[task]}
                           isLoadingTime={loadingTimeEstimates.has(task)}
                           onTimeUpdate={(newTime) => {
                             setTaskTimeEstimates(prev => ({
                               ...prev,
                               [task]: newTime
                             }));
                           }}
                           onReorder={handleReorder}
                           onTagUpdate={(tag, value) => {
                             setTaskTags(prev => ({
                               ...prev,
                               [task]: {
                                 ...prev[task] || { isLiked: false, isUrgent: false, isQuick: false },
                                 [tag === 'liked' ? 'isLiked' : tag === 'urgent' ? 'isUrgent' : 'isQuick']: value
                               }
                             }));
                           }}
                         />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
              
              {/* Direct Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pt-4 md:pt-6">
                <Button
                  onClick={handleShuffle}
                  disabled={isProcessing}
                  className="w-full h-12 sm:h-11"
                  size="lg"
                >
                  Shuffle the Deck
                </Button>

                <Button
                  onClick={handleManualOrder}
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
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-500 text-white rounded-full flex items-center justify-center text-lg font-bold">
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
                    const tasksToSave = prioritizedTasks.map((task, index) => ({
                      title: task.title,
                      user_id: user.id,
                      source: 'brain_dump' as const,
                      is_liked: task.is_liked,
                      is_urgent: task.is_urgent,
                      is_quick: task.is_quick,
                      ai_priority_score: task.priority_score,
                      card_position: index + 1
                    }));
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

        {/* Game Loading Step */}
        {currentStep === 'game-loading' && (
          <GameLoadingScreen
            taskCount={reviewedTasks.length}
            onLoadingComplete={() => setCurrentStep('game-cards')}
            isProcessing={isProcessing}
          />
        )}

        {/* Game Cards Step */}
        {currentStep === 'game-cards' && (
          <GameTaskCards
            tasks={prioritizedTasks.length > 0 ? prioritizedTasks.map((task) => ({
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
            }))}
            isLoading={isProcessing}
            isProcessing={isProcessing}
            onLoadingComplete={() => {
              // Loading complete is handled by the AI processing completion
              // The isProcessing state will be set to false in the finally block
            }}
            onComplete={() => {
              toast({
                title: "Session Complete!",
                description: "Great work on focusing through your tasks!",
              });
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

export default Tasks;
