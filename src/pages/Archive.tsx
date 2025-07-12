import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface ArchivedTask {
  id: string;
  title: string;
  archived_at: string;
  created_at: string;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  archive_position: number;
}

const Archive = () => {
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortByArchived, setSortByArchived] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchArchivedTasks();
  }, []);

  const fetchArchivedTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth';
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, archived_at, created_at, is_liked, is_urgent, is_quick, archive_position')
        .eq('user_id', user.id)
        .not('archived_at', 'is', null)
        .order(sortByArchived ? 'archived_at' : 'created_at', { ascending: false });

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

  const handleRestore = async (taskId: string) => {
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

      setArchivedTasks(tasks => tasks.filter(t => t.id !== taskId));
      toast({
        title: "Task Restored",
        description: "Task moved back to active list",
      });
    } catch (error) {
      console.error('Error restoring task:', error);
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
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Archive</h1>
          </div>
          <div className="text-center py-8">Loading archived tasks...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Archive</h1>
            <Badge variant="secondary">{archivedTasks.length} tasks</Badge>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSortByArchived(!sortByArchived);
              fetchArchivedTasks();
            }}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Sort by {sortByArchived ? 'Created' : 'Archived'} Date
          </Button>
        </div>

        {/* Archived Tasks List */}
        {archivedTasks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">No archived tasks yet</p>
              <p className="text-sm text-muted-foreground">
                Tasks you archive will appear here for future reference
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {archivedTasks.map((task) => (
              <Card key={task.id} className="opacity-70 hover:opacity-90 transition-opacity">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground mb-2">{task.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Created: {formatDate(task.created_at)}</span>
                        <span>Archived: {formatDate(task.archived_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {task.is_liked && (
                          <Badge variant="secondary" className="text-xs">❤️ Liked</Badge>
                        )}
                        {task.is_urgent && (
                          <Badge variant="secondary" className="text-xs">⚠️ Urgent</Badge>
                        )}
                        {task.is_quick && (
                          <Badge variant="secondary" className="text-xs">⚡ Quick</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(task.id)}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore
                    </Button>
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

export default Archive;