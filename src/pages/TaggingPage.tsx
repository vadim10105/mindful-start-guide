import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Shuffle, ArrowRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TaskListItem } from "@/components/tasks/TaskListItem";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

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
  ai_effort: 'quick' | 'medium' | 'long';
}

interface UserProfile {
  task_start_preference?: string;
  task_preferences?: unknown;
  peak_energy_time?: string;
  lowest_energy_time?: string;
}

export const TaggingPage = () => {
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [reviewedTasks, setReviewedTasks] = useState<string[]>([]);
  const [taggedTasks, setTaggedTasks] = useState<Task[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    const storedTasks = localStorage.getItem('extractedTasks');
    if (storedTasks) {
      const parsedTasks: ExtractedTask[] = JSON.parse(storedTasks);
      setExtractedTasks(parsedTasks);
      setReviewedTasks(parsedTasks.map(task => task.title));
    } else {
      navigate('/tasks'); // Redirect if no tasks found
    }

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
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
  }, [navigate]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setReviewedTasks((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over?.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const prioritizeTasks = async () => {
    if (!user) return;

    const taskInputs = reviewedTasks.map((taskTitle, index) => {
      const taggedTask = taggedTasks.find(t => t.title === taskTitle);
      const extractedTask = extractedTasks.find(t => t.title === taskTitle);
      
      return {
        id: `temp-${index}`,
        text: taskTitle,
        tags: {
          liked: taggedTask?.is_liked || false,
          urgent: taggedTask?.is_urgent || false,
          quick: taggedTask?.is_quick || false,
          disliked: taggedTask?.is_disliked || false
        },
        inferred: {
          complexity: extractedTask?.estimated_effort === 'quick' ? 'low' : 
                     extractedTask?.estimated_effort === 'long' ? 'high' : 'medium',
          importance: extractedTask?.estimated_urgency === 'low' ? 'low' :
                     extractedTask?.estimated_urgency === 'high' ? 'high' : 'medium',
          category: 'Admin+Life' // Default category - we'll enhance this later
        }
      };
    });

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
        throw new Error('Failed to prioritize tasks');
      }

      const prioritizedTasks: PrioritizedTask[] = data.orderedTasks.map((task: PrioritizedTask) => ({
        id: task.id,
        title: task.text,
        priority_score: task.totalScore,
        explanation: `${task.rulePlacement} • Score: ${task.totalScore} (Base: ${task.scoreBreakdown.baseCategoryScore}, Tags: ${task.scoreBreakdown.liveTagScore}, Energy: ${task.scoreBreakdown.energyAdjust})`,
        is_liked: task.tags.liked,
        is_urgent: task.tags.urgent,
        is_quick: task.tags.quick,
        ai_effort: task.inferred.complexity
      }));

      return prioritizedTasks;

    } catch (error) {
      console.error('Error calling prioritization:', error);
      return reviewedTasks.map((title, index) => ({
        id: `temp-${index}`,
        title,
        priority_score: Math.random() * 100,
        explanation: "Fallback prioritization - edge function unavailable",
        is_liked: false,
        is_urgent: false,
        is_quick: false,
        ai_effort: 'medium'
      }));
    }
  };

  const handleShuffle = async () => {
    setIsProcessing(true);
    
    try {
      const prioritized = await prioritizeTasks();
      localStorage.setItem('prioritizedTasks', JSON.stringify(prioritized));
      navigate('/game');
      
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
    if (!user) return;

    try {
      const tasksToSave = reviewedTasks.map((taskTitle, index) => {
        const taggedTask = taggedTasks.find(t => t.title === taskTitle);
        return {
          id: `temp-${index}`,
          title: taskTitle,
          priority_score: index + 1, // Manual order, so priority is just its position
          explanation: `Task ${index + 1} in your manual order`,
          is_liked: taggedTask?.is_liked || false,
          is_urgent: taggedTask?.is_urgent || false,
          is_quick: taggedTask?.is_quick || false,
          ai_effort: 'medium' as const // Default for manual tasks
        };
      });

      localStorage.setItem('prioritizedTasks', JSON.stringify(tasksToSave));
      navigate('/game');

      toast({
        title: "Tasks Saved!",
        description: `${tasksToSave.length} tasks saved in your chosen order.`,
      });

    } catch (error) {
      console.error('Error saving tasks:', error);
      toast({
        title: "Error",
        description: "Failed to save tasks",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="relative flex items-center justify-center">
          <Button
            onClick={() => navigate('/tasks')}
            variant="ghost"
            size="sm"
            className="absolute left-0 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="text-center space-y-4 flex-1">
            <h1 className="text-3xl font-bold">Task Creation</h1>
            <p className="text-muted-foreground">
              Transform your thoughts into organized, prioritized tasks
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
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
                  {reviewedTasks.map((task, index) => (
                <TaskListItem
                  key={task}
                  task={task}
                  index={index}
                  onTaskUpdate={(updatedTask) => {
                    setTaggedTasks(prev => {
                      const updated = [...prev];
                      const existingIndex = updated.findIndex(t => t.id === `temp-${index}`);
                      const newTask: Task = {
                        id: `temp-${index}`,
                        title: task,
                        status: 'active',
                        is_liked: updatedTask.is_liked,
                        is_urgent: updatedTask.is_urgent,
                        is_quick: updatedTask.is_quick,
                        card_position: index + 1
                      };
                      
                      if (existingIndex >= 0) {
                        updated[existingIndex] = newTask;
                      } else {
                        updated.push(newTask);
                      }
                      return updated;
                    });
                  }}
                />
              ))}
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
                </div >
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
      </div>
    </div>
  );
};