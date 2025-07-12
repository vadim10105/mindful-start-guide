import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, GripVertical, Heart, AlertTriangle, Zap, Plus, Archive as ArchiveIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ArchiveDropZone } from "./ArchiveDropZone";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
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

interface Task {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'skipped' | 'paused';
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  card_position: number;
  archived_at?: string | null;
  archive_position?: number | null;
  created_at: string;
}

interface TaskItemProps {
  task: Task;
  index: number;
  onTagUpdate: (taskId: string, tag: 'liked' | 'urgent' | 'quick', value: boolean) => void;
  isArchived?: boolean;
}

const TaskItem = ({ task, index, onTagUpdate, isArchived = false }: TaskItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

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
      } ${isArchived ? 'opacity-60' : ''}`}
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
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
        isArchived 
          ? 'bg-muted text-muted-foreground' 
          : 'bg-primary text-primary-foreground'
      }`}>
        {index + 1}
      </div>
      
      {/* Task Title */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-6 truncate ${
          isArchived ? 'text-muted-foreground' : 'text-foreground'
        }`}>
          {task.title}
        </p>
      </div>
      
      {/* Status Badge */}
      {task.status !== 'active' && (
        <Badge variant={task.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
          {task.status === 'completed' ? '✓ Done' : task.status === 'paused' ? '⏸ Paused' : '⏭ Skipped'}
        </Badge>
      )}
      
      {/* Tag Controls */}
      <div className="flex items-center gap-2">
        <Heart
          className={`h-5 w-5 cursor-pointer transition-colors hover:scale-110 ${
            task.is_liked ? 'text-red-500 fill-red-500' : 'text-gray-300 hover:text-red-400'
          }`}
          onClick={() => onTagUpdate(task.id, 'liked', !task.is_liked)}
        />
        
        <AlertTriangle
          className={`h-5 w-5 cursor-pointer transition-colors hover:scale-110 ${
            task.is_urgent ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 hover:text-yellow-400'
          }`}
          onClick={() => onTagUpdate(task.id, 'urgent', !task.is_urgent)}
        />
        
        <Zap
          className={`h-5 w-5 cursor-pointer transition-colors hover:scale-110 ${
            task.is_quick ? 'text-green-500 fill-green-500' : 'text-gray-300 hover:text-green-400'
          }`}
          onClick={() => onTagUpdate(task.id, 'quick', !task.is_quick)}
        />
      </div>
    </div>
  );
};

// Droppable wrapper component for the main task list
const Droppable = ({ children, id }: { children: React.ReactNode; id: string }) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef}
      className={`transition-colors rounded-lg ${
        isOver ? 'bg-primary/10 border-2 border-primary border-dashed' : ''
      }`}
    >
      {children}
    </div>
  );
};

interface TaskManagerProps {
  onBack: () => void;
  onCreateNew: () => void;
}

export const TaskManager = ({ onBack, onCreateNew }: TaskManagerProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isArchiveCollapsed, setIsArchiveCollapsed] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth';
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('card_position', { ascending: true });

      if (error) throw error;

      const activeTasks = data?.filter(task => !task.archived_at) || [];
      const archived = data?.filter(task => task.archived_at) || [];
      
      setTasks(activeTasks);
      setArchivedTasks(archived.sort((a, b) => (a.archive_position || 0) - (b.archive_position || 0)));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagUpdate = async (taskId: string, tag: 'liked' | 'urgent' | 'quick', value: boolean) => {
    try {
      const updateField = tag === 'liked' ? 'is_liked' : tag === 'urgent' ? 'is_urgent' : 'is_quick';
      
      const { error } = await supabase
        .from('tasks')
        .update({ [updateField]: value })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, [updateField]: value } : task
      ));
      setArchivedTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, [updateField]: value } : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedTaskId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedTaskId(null);

    if (!over) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Handle archive action
      if (over.id === 'archive-zone') {
        const taskToArchive = tasks.find(t => t.id === String(active.id));
        if (taskToArchive) {
          const { error } = await supabase
            .from('tasks')
            .update({ 
              archived_at: new Date().toISOString(),
              archive_position: archivedTasks.length + 1
            })
            .eq('id', String(active.id));

          if (error) throw error;

          setTasks(prev => prev.filter(t => t.id !== String(active.id)));
          setArchivedTasks(prev => [...prev, { ...taskToArchive, archived_at: new Date().toISOString() }]);
          setIsArchiveCollapsed(false); // Show archived tasks
          
          toast({
            title: "Task Archived",
            description: `"${taskToArchive.title}" has been archived`,
          });
        }
        return;
      }

      // Handle restore from archive - when dragging archived task to main list
      if (over.id === 'main-task-list') {
        const taskToRestore = archivedTasks.find(t => t.id === String(active.id));
        if (taskToRestore) {
          const { error } = await supabase
            .from('tasks')
            .update({ 
              archived_at: null,
              archive_position: null,
              status: 'active',
              card_position: tasks.length + 1 // Add to end of main list
            })
            .eq('id', String(active.id));

          if (error) throw error;

          setArchivedTasks(prev => prev.filter(t => t.id !== String(active.id)));
          setTasks(prev => [...prev, { ...taskToRestore, archived_at: null }]);
          
          toast({
            title: "Task Restored",
            description: `"${taskToRestore.title}" has been restored to active tasks`,
          });
        }
        return;
      }

      // Handle reordering within active tasks
      if (active.id !== over.id && tasks.find(t => t.id === String(active.id)) && tasks.find(t => t.id === String(over.id))) {
        const oldIndex = tasks.findIndex(t => t.id === String(active.id));
        const newIndex = tasks.findIndex(t => t.id === String(over.id));

        if (oldIndex !== -1 && newIndex !== -1) {
          const newTasks = arrayMove(tasks, oldIndex, newIndex);
          setTasks(newTasks);

          // Update positions in database
          const updates = newTasks.map((task, index) => 
            supabase
              .from('tasks')
              .update({ card_position: index + 1 })
              .eq('id', task.id)
          );

          await Promise.all(updates);
        }
      }
    } catch (error) {
      console.error('Error in drag end:', error);
      toast({
        title: "Error",
        description: "Failed to update task order",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Manage Tasks</h1>
        </div>
        <div className="text-center py-8">Loading your tasks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Manage Tasks</h1>
          <Badge variant="secondary">{tasks.length} active</Badge>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Tasks
        </Button>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Active Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Active Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No active tasks yet</p>
                <Button onClick={onCreateNew} variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Tasks
                </Button>
              </div>
            ) : (
              <Droppable id="main-task-list">
                <SortableContext 
                  items={tasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {tasks.map((task, index) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        index={index}
                        onTagUpdate={handleTagUpdate}
                      />
                    ))}
                  </div>
                </SortableContext>
              </Droppable>
            )}
          </CardContent>
        </Card>

        {/* Archive Drop Zone */}
        <ArchiveDropZone
          isCollapsed={isArchiveCollapsed}
          onToggle={() => setIsArchiveCollapsed(!isArchiveCollapsed)}
          archivedCount={archivedTasks.length}
          isDragOver={!!draggedTaskId}
        />

        {/* Archived Tasks */}
        {!isArchiveCollapsed && archivedTasks.length > 0 && (
          <Card className="opacity-75">
            <CardContent className="pt-6">
              <SortableContext 
                items={archivedTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {archivedTasks.map((task, index) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      index={index}
                      onTagUpdate={handleTagUpdate}
                      isArchived={true}
                    />
                  ))}
                </div>
              </SortableContext>
            </CardContent>
          </Card>
        )}
      </DndContext>
    </div>
  );
};