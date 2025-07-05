import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Calendar, Trophy, X } from 'lucide-react';

interface CompletedTask {
  id: string;
  title: string;
  timeSpent: number; // in minutes
  completedAt: Date;
  sunsetImageUrl: string;
}

interface TodaysCollectionProps {
  completedTasks: CompletedTask[];
  isVisible: boolean;
}

export const TodaysCollection = ({ completedTasks, isVisible }: TodaysCollectionProps) => {
  const [showOverlay, setShowOverlay] = useState(false);

  if (!isVisible || completedTasks.length === 0) return null;

  const totalTimeSpent = completedTasks.reduce((total, task) => total + task.timeSpent, 0);
  const averageTime = Math.round(totalTimeSpent / completedTasks.length);
  
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <>
      {/* Floating Collection Icon */}
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          onClick={() => setShowOverlay(true)}
          className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center p-2"
        >
          <div className="text-2xl">🏆</div>
          <Badge className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground min-w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
            {completedTasks.length}
          </Badge>
        </Button>
      </div>

      {/* Today's Collection Overlay */}
      <Dialog open={showOverlay} onOpenChange={setShowOverlay}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Trophy className="h-6 w-6 text-primary" />
              Today's Accomplishments
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Daily Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="text-center">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-primary">{completedTasks.length}</div>
                  <p className="text-sm text-muted-foreground">Tasks Completed</p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-primary">{formatTime(totalTimeSpent)}</div>
                  <p className="text-sm text-muted-foreground">Total Focus Time</p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-primary">{formatTime(averageTime)}</div>
                  <p className="text-sm text-muted-foreground">Avg. per Task</p>
                </CardContent>
              </Card>
            </div>

            {/* Completed Cards Grid */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Completed Cards
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {completedTasks.map((task) => (
                  <Card key={task.id} className="aspect-[3/4] relative overflow-hidden group hover:scale-105 transition-transform duration-200">
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ 
                        backgroundImage: `linear-gradient(45deg, rgba(251,146,60,0.8), rgba(249,115,22,0.8)), url('${task.sunsetImageUrl}')` 
                      }}
                    />
                    <div className="absolute inset-0 bg-black/20" />
                    
                    <CardContent className="relative h-full flex flex-col justify-between p-4 text-white">
                      <div className="text-center">
                        <div className="text-lg">🌅</div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm leading-tight line-clamp-2">
                          {task.title}
                        </h4>
                        
                        <div className="flex items-center justify-center gap-1 text-xs opacity-90">
                          <Clock className="h-3 w-3" />
                          {formatTime(task.timeSpent)}
                        </div>
                        
                        <div className="text-xs text-center opacity-75">
                          {task.completedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Motivational Message */}
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="pt-4 text-center">
                <p className="text-lg font-medium mb-2">🎉 Fantastic work today!</p>
                <p className="text-muted-foreground">
                  You've completed {completedTasks.length} task{completedTasks.length !== 1 ? 's' : ''} and spent {formatTime(totalTimeSpent)} in focused work. 
                  Keep up the momentum!
                </p>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};