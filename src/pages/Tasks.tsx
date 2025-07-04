import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, SkipForward, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'skipped';
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  is_disliked?: boolean;
  difficulty?: 'easy' | 'neutral' | 'hard';
  card_position: number;
  created_at: string;
  subtasks?: Subtask[];
}

interface Subtask {
  id: string;
  content: string;
  is_done: boolean;
}

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth';
        return;
      }
      setUser(user);
      fetchTasks();
    };

    getUser();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          subtasks (*)
        `)
        .eq('status', 'active')
        .order('card_position', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
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

  const addTask = async () => {
    if (!newTask.trim() || !user) return;

    try {
      // Get the next card position
      const nextPosition = Math.max(...tasks.map(t => t.card_position), 0) + 1;

      const { error } = await supabase
        .from('tasks')
        .insert([{
          title: newTask,
          source: 'manual' as const,
          card_position: nextPosition,
          user_id: user.id
        }]);

      if (error) throw error;

      setNewTask("");
      fetchTasks();
      toast({
        title: "Success",
        description: "Task added successfully",
      });
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: "Error",
        description: "Failed to add task",
        variant: "destructive",
      });
    }
  };

  const updateTaskStatus = async (taskId: string, status: 'completed' | 'skipped') => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;

      fetchTasks();
      toast({
        title: "Success",
        description: `Task ${status}`,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const updateTaskTags = async (taskId: string, tags: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(tags)
        .eq('id', taskId);

      if (error) throw error;

      fetchTasks();
      toast({
        title: "Success",
        description: "Task updated",
      });
    } catch (error) {
      console.error('Error updating task tags:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div>Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Your Tasks</h1>
          <p className="text-muted-foreground">
            AI-powered task management based on your preferences
          </p>
        </div>

        {/* Add Task */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Task
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="What needs to be done?"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                className="flex-1"
                rows={2}
              />
              <Button onClick={addTask} disabled={!newTask.trim()}>
                Add Task
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Task Cards */}
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  No active tasks. Add one above to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusUpdate={updateTaskStatus}
                onTagsUpdate={updateTaskTags}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface TaskCardProps {
  task: Task;
  onStatusUpdate: (taskId: string, status: 'completed' | 'skipped') => void;
  onTagsUpdate: (taskId: string, tags: Partial<Task>) => void;
}

const TaskCard = ({ task, onStatusUpdate, onTagsUpdate }: TaskCardProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const toggleTag = (tag: string, value: boolean) => {
    onTagsUpdate(task.id, { [tag]: value });
  };

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{task.title}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {task.is_liked && <Badge variant="default">Liked</Badge>}
          {task.is_urgent && <Badge variant="destructive">Urgent</Badge>}
          {task.is_quick && <Badge variant="secondary">Quick</Badge>}
          {task.is_disliked && <Badge variant="outline">Disliked</Badge>}
          {task.difficulty && task.difficulty !== 'neutral' && (
            <Badge variant="outline">{task.difficulty}</Badge>
          )}
        </div>

        {/* Tag Editing */}
        {isEditing && (
          <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
            <Button
              variant={task.is_liked ? "default" : "outline"}
              size="sm"
              onClick={() => toggleTag('is_liked', !task.is_liked)}
            >
              {task.is_liked ? "✓" : ""} Liked
            </Button>
            <Button
              variant={task.is_urgent ? "destructive" : "outline"}
              size="sm"
              onClick={() => toggleTag('is_urgent', !task.is_urgent)}
            >
              {task.is_urgent ? "✓" : ""} Urgent
            </Button>
            <Button
              variant={task.is_quick ? "secondary" : "outline"}
              size="sm"
              onClick={() => toggleTag('is_quick', !task.is_quick)}
            >
              {task.is_quick ? "✓" : ""} Quick
            </Button>
            <Button
              variant={task.is_disliked ? "default" : "outline"}
              size="sm"
              onClick={() => toggleTag('is_disliked', !task.is_disliked)}
            >
              {task.is_disliked ? "✓" : ""} Disliked
            </Button>
          </div>
        )}

        {/* Subtasks */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Subtasks:</h4>
            {task.subtasks.map((subtask) => (
              <div key={subtask.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={subtask.is_done}
                  onChange={() => {/* TODO: Implement subtask toggle */}}
                  className="rounded"
                />
                <span className={subtask.is_done ? "line-through text-muted-foreground" : ""}>
                  {subtask.content}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="default"
            className="flex-1"
            onClick={() => onStatusUpdate(task.id, 'completed')}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onStatusUpdate(task.id, 'skipped')}
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Tasks;