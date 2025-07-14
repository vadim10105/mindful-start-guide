import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Brain, Shuffle, ArrowRight, Check, Heart, Clock, Zap, ArrowLeft, GripVertical, AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTypewriter } from "@/hooks/use-typewriter";
import { GameLoadingScreen } from "@/components/tasks/GameLoadingScreen";
import { GameTaskCards } from "@/components/tasks/GameTaskCards";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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

type FlowStep = 'input' | 'processing' | 'review' | 'prioritized' | 'game-loading' | 'game-cards';

interface ExtractedTask {
  title: string;
  estimated_urgency: 'low' | 'medium' | 'high';
  estimated_effort: 'quick' | 'medium' | 'long';
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
  onTagUpdate: (tag: 'liked' | 'urgent' | 'quick', value: boolean) => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onDelete: (index: number) => void;
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

const TaskListItem = ({ task, index, isLiked, isUrgent, isQuick, onTagUpdate, onReorder, onDelete }: TaskListItemProps) => {
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
      className={`flex items-center gap-4 p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:cursor-grabbing"
      >
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
        <Heart
          className={`h-5 w-5 cursor-pointer transition-colors hover:scale-110 ${
            isLiked ? 'text-red-500 fill-red-500' : 'text-gray-300 hover:text-red-400'
          }`}
          onClick={() => onTagUpdate('liked', !isLiked)}
        />
        
        <AlertTriangle
          className={`h-5 w-5 cursor-pointer transition-colors hover:scale-110 ${
            isUrgent ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 hover:text-yellow-400'
          }`}
          onClick={() => onTagUpdate('urgent', !isUrgent)}
        />
        
        <Zap
          className={`h-5 w-5 cursor-pointer transition-colors hover:scale-110 ${
            isQuick ? 'text-green-500 fill-green-500' : 'text-gray-300 hover:text-green-400'
          }`}
          onClick={() => onTagUpdate('quick', !isQuick)}
        />
        
        <Trash2
          className="h-5 w-5 cursor-pointer transition-colors hover:scale-110 text-gray-300 hover:text-red-400"
          onClick={() => onDelete(index)}
        />
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
  const [prioritizedTasks, setPrioritizedTasks] = useState<PrioritizedTask[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState(null);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth';
        return;
      }
      setUser(user);
      
      // Fetch user profile for prioritization
      const { data: profile } = await supabase
        .from('profiles')
        .select('task_start_preference, task_preferences, peak_energy_time, lowest_energy_time')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        setUserProfile(profile);
      }
    };
    getUser();
  }, []);

  const handleBrainDumpSubmit = async () => {
    console.log('handleBrainDumpSubmit called with text:', brainDumpText);
    
    if (!brainDumpText.trim()) {
      console.log('No brain dump text provided');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('processing');
    console.log('Set processing state and step to processing');

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
      setReviewedTasks(data.tasks.map((task: ExtractedTask) => task.title));
      setCurrentStep('review');
      
      toast({
        title: "Brain dump processed!",
        description: `Extracted ${data.tasks.length} tasks`,
      });

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
      setCurrentStep('input');
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

  const handleTaskDelete = (index: number) => {
    const taskToDelete = reviewedTasks[index];
    
    // Remove task from reviewedTasks array
    setReviewedTasks(prev => prev.filter((_, i) => i !== index));
    
    // Remove task from taskTags
    setTaskTags(prev => {
      const newTags = { ...prev };
      delete newTags[taskToDelete];
      return newTags;
    });
    
    toast({
      title: "Task deleted",
      description: `"${taskToDelete}" has been removed from your list`,
    });
  };

  const prioritizeTasks = async () => {
    console.log('Starting task prioritization...');
    console.log('User profile:', userProfile);
    console.log('Task tags state:', taskTags);
    console.log('Reviewed tasks:', reviewedTasks);

    // Create task input format for the edge function using taskTags state instead of taggedTasks
    const taskInputs = reviewedTasks.map((taskTitle, index) => {
      const tags = taskTags[taskTitle] || { isLiked: false, isUrgent: false, isQuick: false };
      
      console.log(`Task "${taskTitle}" tags:`, tags);
      
      return {
        id: `temp-${index}`,
        text: taskTitle,
        tags: {
          liked: tags.isLiked,
          urgent: tags.isUrgent,
          quick: tags.isQuick,
          disliked: false // We don't have disliked in the UI currently
        },
        inferred: {
          category: 'Admin+Life' // Default category - we'll enhance this later
        }
      };
    });

    // Create user profile for the edge function
    const profileInput = {
      startPreference: userProfile?.task_start_preference === 'hard_first' ? 'eatTheFrog' : 'quickWin',
      energyState: userProfile?.peak_energy_time ? 'high' : 'low',
      categoryRatings: {
        'Creative': 'Neutral',
        'Analytical+Technical': 'Neutral', 
        'DeepWork': 'Neutral',
        'Admin+Life': 'Neutral',
        'Chores': 'Neutral',
        'Social': 'Neutral',
        'Reflective': 'Neutral'
      }
    };

    try {
      const { data, error } = await supabase.functions.invoke('prioritize-tasks', {
        body: {
          tasks: taskInputs,
          userProfile: profileInput
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error('Failed to prioritize tasks');
      }

      console.log('Prioritization response:', data);

      // Convert back to our expected format
      const prioritizedTasks = data.orderedTasks.map((task: any) => ({
        id: task.id,
        title: task.text,
        priority_score: task.totalScore,
        explanation: `${task.rulePlacement} • Score: ${task.totalScore} (Base: ${task.scoreBreakdown.baseCategoryScore}, Tags: ${task.scoreBreakdown.liveTagScore}, Energy: ${task.scoreBreakdown.energyAdjust})`,
        is_liked: task.tags.liked,
        is_urgent: task.tags.urgent,
        is_quick: task.tags.quick
      }));

      return prioritizedTasks;

    } catch (error) {
      console.error('Error calling prioritization:', error);
      // Fallback to simple scoring if edge function fails
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

  const handleShuffle = async () => {
    console.log('Shuffle button clicked');
    setIsProcessing(true);
    
    try {
      const prioritized = await prioritizeTasks();
      setPrioritizedTasks(prioritized);
      
      // Go directly to game loading screen
      setCurrentStep('game-loading');
      
      toast({
        title: "Tasks Shuffled!",
        description: `AI organized ${prioritized.length} tasks - let's start your adventure!`,
      });
    } catch (error) {
      console.error('Error during shuffling:', error);
      toast({
        title: "Error",
        description: "Failed to prioritize tasks",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualOrder = async () => {
    // Update tagged tasks with the current order before saving
    const orderedTaggedTasks = reviewedTasks.map((taskTitle, index) => {
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
    
    setTaggedTasks(orderedTaggedTasks);
    await saveTasks();
  };

  const saveTasks = async () => {
    if (!user) return;

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

      const { error } = await supabase
        .from('tasks')
        .insert(tasksToSave);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `${tasksToSave.length} tasks saved in order`,
      });

      setCurrentStep('game-loading');
    } catch (error) {
      console.error('Error saving tasks:', error);
      toast({
        title: "Error",
        description: "Failed to save tasks",
        variant: "destructive",
      });
    }
  };

  const savePrioritizedTasks = async (tasksToSave: any[]) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .insert(tasksToSave);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `${tasksToSave.length} prioritized tasks saved`,
      });

      setCurrentStep('game-loading');
    } catch (error) {
      console.error('Error saving prioritized tasks:', error);
      toast({
        title: "Error",
        description: "Failed to save prioritized tasks",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Theme Toggle - Fixed Top Right */}
      <div className="fixed top-4 right-4 z-50">
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
          className="fixed top-4 left-4 z-50 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      )}
      
      <div className={`${currentStep === 'game-cards' ? 'w-full' : (currentStep === 'input' || currentStep === 'review' || currentStep === 'processing') ? 'max-w-6xl mx-auto flex items-center justify-center min-h-screen' : 'max-w-6xl mx-auto'} space-y-6`}>

        {/* Input Step */}
        {currentStep === 'input' && (
          <Card className="border-2 border-dashed border-muted-foreground/30">
            <CardHeader className="text-center">
              <p className="text-muted-foreground">
                Type what's on your mind. Or just list your tasks. I'm not picky.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea
                  value={brainDumpText}
                  onChange={(e) => setBrainDumpText(e.target.value)}
                  onFocus={() => setIsTextareaFocused(true)}
                  onBlur={() => setIsTextareaFocused(false)}
                  className="min-h-[250px] resize-none text-base leading-relaxed border-none bg-muted/50 focus:bg-background transition-colors"
                  rows={12}
                />
                <TypewriterPlaceholder isVisible={!brainDumpText && !isTextareaFocused} />
              </div>
              <Button 
                onClick={handleBrainDumpSubmit}
                disabled={!brainDumpText.trim() || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Brain className="mr-2 h-4 w-4 animate-pulse" />
                    AI is organizing your thoughts...
                  </>
                ) : (
                  <>
                    Make a List
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Processing Step */}
        {currentStep === 'processing' && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="space-y-4">
                <Brain className="h-12 w-12 mx-auto animate-pulse text-primary" />
                <h3 className="text-xl font-semibold">AI is organizing your thoughts...</h3>
                <p className="text-muted-foreground">
                  Extracting actionable tasks from your brain dump
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review & Tag Step */}
        {currentStep === 'review' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Task List - Add Tags ({reviewedTasks.length} tasks)
              </CardTitle>
              <p className="text-muted-foreground">
                Review your tasks, add tags, and drag to reorder
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={reviewedTasks}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
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
                           onReorder={handleReorder}
                           onDelete={handleTaskDelete}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                <Button
                  onClick={handleShuffle}
                  disabled={isProcessing}
                  className="h-24 flex-col gap-2"
                  size="lg"
                >
                  <Shuffle className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold">Shuffle Button</div>
                    <div className="text-xs opacity-90">
                      AI prioritizes based on tags
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={handleManualOrder}
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  size="lg"
                >
                  <Brain className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold">Start in Order</div>
                    <div className="text-xs opacity-90">
                      Keep current order
                    </div>
                  </div>
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
                      <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg font-bold">
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
            taskCount={prioritizedTasks.length || taggedTasks.length}
            onLoadingComplete={() => setCurrentStep('game-cards')}
          />
        )}

        {/* Game Cards Step */}
        {currentStep === 'game-cards' && (
          <GameTaskCards
            tasks={prioritizedTasks.length > 0 ? prioritizedTasks : taggedTasks.map((task, index) => ({
              id: task.id,
              title: task.title,
              priority_score: index + 1,
              explanation: `Task ${index + 1} in your manual order`,
              is_liked: task.is_liked,
              is_urgent: task.is_urgent,
              is_quick: task.is_quick
            }))}
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
    </div>
  );
};

export default Tasks;
