import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Shuffle, ArrowLeft, Trash2, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TaskListItem } from "@/components/tasks/TaskListItem";
import { DndContext, pointerWithin, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, useDroppable, useDndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

// Define the shape of a task after AI extraction
interface ExtractedTask {
  title: string;
  estimated_urgency: 'low' | 'medium' | 'high';
  estimated_effort: 'quick' | 'medium' | 'long';
}

// Define the shape of a task for tagging and local state
interface Task {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'skipped';
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  card_position: number;
}

// Define the shape of a task after AI prioritization
interface PrioritizedTask {
  id: string;
  title: string;
  priority_score: number;
  explanation: string;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  ai_effort: 'quick' | 'medium' | 'long';
}

// Define the shape of the user's profile data
interface UserProfile {
  task_start_preference?: string;
  task_preferences?: unknown;
  peak_energy_time?: string;
  lowest_energy_time?: string;
}

// A simple component for the drop zones (Delete and Archive)
const DropZone = ({ id, icon: Icon, side, active, isOver }) => {
  const { setNodeRef } = useDroppable({ id });
  const isDeleteZone = id === 'delete-zone';
  const bgColor = isDeleteZone ? 'bg-destructive' : 'bg-primary';
  const textColor = isOver ? 'text-white' : 'text-muted-foreground';

  return (
    <div
      ref={setNodeRef}
      className={`fixed top-0 ${side}-0 h-full flex items-center justify-center transition-all duration-300 ease-in-out ${
        active ? 'opacity-100' : 'opacity-0 pointer-events-none'
      } ${isDeleteZone ? 'w-48 rounded-l-full' : 'w-48 rounded-r-full'} ${isOver ? bgColor : 'bg-muted/50'}`}
      style={{
        [isDeleteZone ? 'border-top-left-radius' : 'border-top-right-radius']: '9999px',
        [isDeleteZone ? 'border-bottom-left-radius' : 'border-bottom-right-radius']: '9999px',
      }}
    >
      <div className="relative w-32 h-32 flex items-center justify-center">
        <Icon className={`h-16 w-16 ${textColor}`} />
      </div>
    </div>
  );
};

const TaggingPageContent = ({ reviewedTasks, setReviewedTasks }) => {
  const [taggedTasks, setTaggedTasks] = useState<Task[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { active, over } = useDndContext();

  useEffect(() => {
    const storedTasks = localStorage.getItem('extractedTasks');
    if (storedTasks) {
      setReviewedTasks(JSON.parse(storedTasks).map(t => t.title));
    }
    
    // Load user profile for prioritization
    const loadUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('task_start_preference, task_preferences, peak_energy_time, lowest_energy_time')
            .eq('user_id', user.id)
            .single();
          
          if (profile) {
            setUserProfile(profile);
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };
    
    loadUserProfile();
  }, [navigate, setReviewedTasks]);

  const handleTaskUpdate = useCallback((taskId: string, updatedTask: { is_liked?: boolean; is_urgent?: boolean; is_quick?: boolean }) => {
    setTaggedTasks(prev => {
      const updated = [...prev];
      const existingIndex = updated.findIndex(t => t.id === taskId);
      const newTask: Task = {
        id: taskId,
        title: reviewedTasks.find(t => t === taskId) || '',
        status: 'active',
        is_liked: updatedTask.is_liked,
        is_urgent: updatedTask.is_urgent,
        is_quick: updatedTask.is_quick,
        card_position: reviewedTasks.indexOf(taskId) + 1
      };
      
      if (existingIndex >= 0) {
        updated[existingIndex] = { ...updated[existingIndex], ...newTask };
      } else {
        updated.push(newTask);
      }
      return updated;
    });
  }, [reviewedTasks]);

  const collectAllTasks = useCallback(() => {
    // Get all tasks from storage with their tags applied
    const storedTasks = localStorage.getItem('extractedTasks');
    if (!storedTasks) return [];
    
    const extractedTasks: ExtractedTask[] = JSON.parse(storedTasks);
    
    return extractedTasks.map((task, index) => {
      const taggedTask = taggedTasks.find(t => t.title === task.title);
      return {
        id: task.title,
        title: task.title,
        estimated_urgency: task.estimated_urgency,
        estimated_effort: task.estimated_effort,
        is_liked: taggedTask?.is_liked || false,
        is_urgent: taggedTask?.is_urgent || false,
        is_quick: taggedTask?.is_quick || false,
        position: index + 1
      };
    });
  }, [taggedTasks]);

  const handlePrioritizeAndNavigate = useCallback(async (strategy: 'shuffle' | 'order') => {
    setIsProcessing(true);
    
    try {
      const allTasks = collectAllTasks();
      if (allTasks.length === 0) {
        toast({ 
          title: "No tasks found", 
          description: "Please add some tasks first.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      // Use default profile if none loaded
      const profile = userProfile || {
        task_start_preference: strategy === 'shuffle' ? 'quick_wins' : 'eat_the_frog',
        task_preferences: {},
        peak_energy_time: 'morning',
        lowest_energy_time: 'afternoon'
      };

      const { data, error } = await supabase.functions.invoke('prioritize-tasks', {
        body: {
          tasks: allTasks,
          profile: profile
        }
      });

      if (error) {
        console.error('Prioritization error:', error);
        toast({ 
          title: "Prioritization failed", 
          description: "Using current order instead.",
          variant: "destructive"
        });
        
        // Fallback: create simple prioritized tasks
        const fallbackTasks: PrioritizedTask[] = allTasks.map((task, index) => ({
          id: task.id,
          title: task.title,
          priority_score: strategy === 'shuffle' ? Math.random() * 100 : 100 - index,
          explanation: 'Using current order due to prioritization error',
          is_liked: task.is_liked,
          is_urgent: task.is_urgent,
          is_quick: task.is_quick,
          ai_effort: task.estimated_effort
        }));
        
        localStorage.setItem('prioritizedTasks', JSON.stringify(fallbackTasks));
      } else {
        localStorage.setItem('prioritizedTasks', JSON.stringify(data.prioritizedTasks));
      }

      navigate('/game');
    } catch (error) {
      console.error('Error during prioritization:', error);
      toast({ 
        title: "Error", 
        description: "Failed to prioritize tasks. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [collectAllTasks, userProfile, navigate, toast]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative flex items-center justify-center">
            <Button onClick={() => navigate('/tasks')} variant="ghost" size="sm" className="absolute left-0 flex items-center gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
            <div className="text-center space-y-4 flex-1">
              <h1 className="text-3xl font-bold">Task Creation</h1>
              <p className="text-muted-foreground">Transform your thoughts into organized, prioritized tasks</p>
            </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2"><Brain className="h-5 w-5" />Task List - Add Tags ({reviewedTasks.length} tasks)</CardTitle>
            <p className="text-muted-foreground">Review your tasks, add tags, and drag to reorder or dismiss</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <SortableContext items={reviewedTasks} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {reviewedTasks.map((task, index) => (
                  <TaskListItem key={task} task={task} index={index} onTaskUpdate={handleTaskUpdate} />
                ))}
              </div>
            </SortableContext>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                <Button 
                  onClick={() => handlePrioritizeAndNavigate('shuffle')} 
                  disabled={isProcessing} 
                  className="h-24 flex-col gap-2" 
                  size="lg"
                >
                  <Shuffle className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold">
                      {isProcessing ? 'Prioritizing...' : 'Shuffle Button'}
                    </div>
                    <div className="text-xs opacity-90">AI prioritizes based on tags</div>
                  </div>
                </Button>
                <Button 
                  onClick={() => handlePrioritizeAndNavigate('order')} 
                  disabled={isProcessing}
                  variant="outline" 
                  className="h-24 flex-col gap-2" 
                  size="lg"
                >
                  <Brain className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold">
                      {isProcessing ? 'Prioritizing...' : 'Start in Order'}
                    </div>
                    <div className="text-xs opacity-90">Keep current order</div>
                  </div>
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <DropZone id="archive-zone" icon={Archive} side="left" active={!!active} isOver={over?.id === 'archive-zone'} />
      <DropZone id="delete-zone" icon={Trash2} side="right" active={!!active} isOver={over?.id === 'delete-zone'} />
    </div>
  );
}

export const TaggingPage = () => {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
  const [reviewedTasks, setReviewedTasks] = useState<string[]>([]);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedTasks = localStorage.getItem('extractedTasks');
    if (storedTasks) {
      setReviewedTasks(JSON.parse(storedTasks).map(t => t.title));
    }
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(event.active.id as string);
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;

    if (over?.id === 'delete-zone') {
      setReviewedTasks(tasks => tasks.filter(task => task !== active.id));
      toast({ title: "Task Deleted", description: `"${active.id}" has been removed.` });
    } else if (over?.id === 'archive-zone') {
      setReviewedTasks(tasks => tasks.filter(task => task !== active.id));
      toast({ title: "Task Saved for Later", description: `"${active.id}" has been set aside.` });
    } else if (over && active.id !== over.id) {
      setReviewedTasks((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        if (oldIndex === -1 || newIndex === -1) return items;
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, [toast]);

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <TaggingPageContent 
        reviewedTasks={reviewedTasks}
        setReviewedTasks={setReviewedTasks}
      />
      <DragOverlay>
        {activeTask ? <TaskListItem task={activeTask} index={reviewedTasks.indexOf(activeTask)} onTaskUpdate={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  );
};