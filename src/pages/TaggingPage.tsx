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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { active, over } = useDndContext();

  useEffect(() => {
    const storedTasks = localStorage.getItem('extractedTasks');
    if (storedTasks) {
      setReviewedTasks(JSON.parse(storedTasks).map(t => t.title));
    }
  }, [navigate, setReviewedTasks]); // Added setReviewedTasks to dependency array

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
                <Button onClick={() => {}} disabled={isProcessing} className="h-24 flex-col gap-2" size="lg"><Shuffle className="h-6 w-6" /><div className="text-center"><div className="font-semibold">Shuffle Button</div><div className="text-xs opacity-90">AI prioritizes based on tags</div></div></Button>
                <Button onClick={() => {}} variant="outline" className="h-24 flex-col gap-2" size="lg"><Brain className="h-6 w-6" /><div className="text-center"><div className="font-semibold">Start in Order</div><div className="text-xs opacity-90">Keep current order</div></div></Button>
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