
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Archive, ArrowLeft, Heart, Clock, Zap, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface ArchivedTask {
  id: string;
  title: string;
  archived_at: string;
  archive_position: number;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  completed_at?: string;
}

const ArchivePage = () => {
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>([]);
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
      await fetchArchivedTasks(user.id);
    };
    getUser();
  }, []);

  const fetchArchivedTasks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, archived_at, archive_position, is_liked, is_urgent, is_quick, completed_at')
        .eq('user_id', userId)
        .not('archived_at', 'is', null)
        .order('archive_position', { ascending: false });

      if (error) throw error;

      setArchivedTasks(data || []);
    } catch (error) {
      console.error('Error fetching archived tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load archived tasks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unarchiveTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          archived_at: null,
          archive_position: null,
          status: 'active'
        })
        .eq('id', taskId);

      if (error) throw error;

      // Remove from local state
      setArchivedTasks(prev => prev.filter(task => task.id !== taskId));

      toast({
        title: "Success",
        description: "Task restored to active list",
      });
    } catch (error) {
      console.error('Error unarchiving task:', error);
      toast({
        title: "Error",
        description: "Failed to restore task",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Archive className="h-12 w-12 mx-auto animate-pulse text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading archived tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/tasks">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Tasks
            </Button>
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
              <Archive className="h-8 w-8" />
              Task Archive
            </h1>
            <p className="text-muted-foreground mt-2">
              {archivedTasks.length} archived tasks
            </p>
          </div>
        </div>

        {/* Archived Tasks */}
        {archivedTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Archive className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No archived tasks</h3>
              <p className="text-muted-foreground">
                Complete some tasks and archive them to see them here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {archivedTasks.map((task) => (
              <Card key={task.id} className="border-muted-foreground/20">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Archived: {formatDate(task.archived_at)}</span>
                        {task.completed_at && (
                          <span>Completed: {formatDate(task.completed_at)}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => unarchiveTask(task.id)}
                      variant="outline"
                      size="sm"
                      className="ml-4"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Task Tags */}
                  <div className="flex flex-wrap gap-2">
                    {task.is_liked && (
                      <Badge variant="secondary" className="text-xs bg-rose-500/20 text-rose-700 dark:text-rose-300">
                        <Heart className="w-3 h-3 mr-1" />
                        Love
                      </Badge>
                    )}
                    {task.is_urgent && (
                      <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-700 dark:text-orange-300">
                        <Clock className="w-3 h-3 mr-1" />
                        Urgent
                      </Badge>
                    )}
                    {task.is_quick && (
                      <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700 dark:text-green-300">
                        <Zap className="w-3 h-3 mr-1" />
                        Quick
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchivePage;
