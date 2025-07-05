import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Lock, Heart, Clock, Zap, Check, Target, Play, Trophy } from "lucide-react";
import { MrIntentCharacter } from "./MrIntentCharacter";
import { ProgressBorder } from "@/components/ui/progress-border";
import { TodaysCollection } from "./TodaysCollection";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

interface TaskCardData {
  id: string;
  title: string;
  priority_score: number;
  explanation: string;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  ai_effort: 'quick' | 'medium' | 'long';
}

interface GameTaskCardsProps {
  tasks: TaskCardData[];
  onComplete: () => void;
  onTaskComplete?: (taskId: string) => void;
}

interface CompletedTask {
  id: string;
  title: string;
  timeSpent: number;
  completedAt: Date;
  sunsetImageUrl: string;
}

export const GameTaskCards = ({ tasks, onComplete, onTaskComplete }: GameTaskCardsProps) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [unlockedCards, setUnlockedCards] = useState(1); // Start with first card unlocked
  const [flowStartTime, setFlowStartTime] = useState<number | null>(null); // Now nullable - starts when committed
  const [showCharacter, setShowCharacter] = useState(true);
  const [characterMessage, setCharacterMessage] = useState(
    "Ready when you are! Click 'Commit to Task' to start your focused session."
  );
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [hasShownUnlockMessage, setHasShownUnlockMessage] = useState(false);
  const [showTaskSelection, setShowTaskSelection] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<TaskCardData[]>([]);
  const [hasCommittedToTask, setHasCommittedToTask] = useState(false);
  const [taskStartTimes, setTaskStartTimes] = useState<Record<string, number>>({});
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [lastCompletedTask, setLastCompletedTask] = useState<{id: string, title: string, timeSpent: number} | null>(null);
  const [todaysCompletedTasks, setTodaysCompletedTasks] = useState<CompletedTask[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  // Calculate flow progress (0-100) based on 5-minute commitment periods
  const [flowProgress, setFlowProgress] = useState(0);

  // Sunset images for card backs
  const sunsetImages = [
    'https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?w=400&h=600&fit=crop', // blue starry night
    'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=600&fit=crop', // river between mountains
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=600&fit=crop', // mountain hit by sun rays
  ];

  useEffect(() => {
    const updateProgress = () => {
      if (!flowStartTime || !hasCommittedToTask) return;
      
      const elapsed = Date.now() - flowStartTime;
      const progress = Math.min((elapsed / (5 * 60 * 1000)) * 100, 100); // 5 minutes
      setFlowProgress(progress);
      
      // Unlock task selection after 5 minutes
      if (elapsed >= 5 * 60 * 1000 && unlockedCards === 1 && !hasShownUnlockMessage) {
        setHasShownUnlockMessage(true);
        setShowTaskSelection(true);
        setAvailableTasks(tasks.filter((_, index) => index !== currentCardIndex));
        setCharacterMessage("Great focus! Ready to tackle another challenge?");
        setShowCharacter(true);
      }
    };

    if (hasCommittedToTask && flowStartTime) {
      timerRef.current = setInterval(updateProgress, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [flowStartTime, unlockedCards, tasks.length, hasShownUnlockMessage, currentCardIndex, tasks, hasCommittedToTask]);

  const handleTaskCommit = (taskId: string) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    setCurrentCardIndex(taskIndex);
    setShowTaskSelection(false);
    setUnlockedCards(1); // Lock other cards again
    setFlowProgress(0); // Reset timer
    setFlowStartTime(Date.now()); // Reset flow start time for new 5-minute cycle
    setHasShownUnlockMessage(false);
    setHasCommittedToTask(true);
    
    // Record start time for this specific task
    setTaskStartTimes(prev => ({
      ...prev,
      [taskId]: Date.now()
    }));
  };

  const handleCommitToCurrentTask = () => {
    const currentTask = tasks[currentCardIndex];
    if (!currentTask) return;
    
    setHasCommittedToTask(true);
    setFlowStartTime(Date.now());
    setFlowProgress(0);
    
    // Record start time for this specific task
    setTaskStartTimes(prev => ({
      ...prev,
      [currentTask.id]: Date.now()
    }));
    
    setCharacterMessage("Perfect! Focus time has begun. You've got this!");
    setShowCharacter(true);
    
    // Hide character after 3 seconds
    setTimeout(() => setShowCharacter(false), 3000);
  };

  const handleTaskComplete = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Calculate time spent
    const startTime = taskStartTimes[taskId];
    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 60000) : 0; // in minutes
    
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57']
    });

    // Stop the progress timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setFlowProgress(0);
    
    // Update completed tasks
    setCompletedTasks(prev => new Set([...prev, taskId]));
    
    // Show completion modal
    setLastCompletedTask({ id: taskId, title: task.title, timeSpent });
    setShowCompletionModal(true);
    
    // Update database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tasks')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            time_spent_minutes: timeSpent
          })
          .eq('id', taskId);

        // Update daily stats
        await supabase.rpc('update_daily_stats', {
          p_user_id: user.id,
          p_date: new Date().toISOString().split('T')[0],
          p_tasks_completed: 1,
          p_time_minutes: timeSpent
        });
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
    
    onTaskComplete?.(taskId);
  };

  const handleAddToCollection = async () => {
    if (!lastCompletedTask) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tasks')
          .update({ collection_added_at: new Date().toISOString() })
          .eq('id', lastCompletedTask.id);

        // Add to today's collection
        const newCollectedTask: CompletedTask = {
          id: lastCompletedTask.id,
          title: lastCompletedTask.title,
          timeSpent: lastCompletedTask.timeSpent,
          completedAt: new Date(),
          sunsetImageUrl: sunsetImages[Math.floor(Math.random() * sunsetImages.length)]
        };
        
        setTodaysCompletedTasks(prev => [...prev, newCollectedTask]);

        // Update daily stats for collection
        await supabase.rpc('update_daily_stats', {
          p_user_id: user.id,
          p_date: new Date().toISOString().split('T')[0],
          p_cards_collected: 1
        });

        toast({
          title: "Card Added to Collection!",
          description: "Your sunset card has been saved to your collection.",
        });
      }
    } catch (error) {
      console.error('Error adding to collection:', error);
      toast({
        title: "Error",
        description: "Failed to add card to collection",
        variant: "destructive",
      });
    }
    
    setShowCompletionModal(false);
  };

  const currentTask = tasks[currentCardIndex];
  const isTaskCompleted = currentTask ? completedTasks.has(currentTask.id) : false;
  const isTaskCommitted = hasCommittedToTask && currentTask;

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="w-full px-4 py-8">
        <div className="w-full">
          
          {/* Task Selection Interface */}
          {showTaskSelection ? (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Choose Your Next Challenge</h1>
                <p className="text-muted-foreground">
                  Select a task to commit to for the next 10 minutes
                </p>
              </div>

              <div className="grid gap-4">
                {availableTasks.map((task, index) => (
                  <Card 
                    key={task.id} 
                    className="border-2 border-primary/20 hover:border-primary/50 transition-all duration-300 cursor-pointer group"
                    onClick={() => handleTaskCommit(task.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                            {task.title}
                          </h3>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            {task.is_liked && (
                              <Badge variant="secondary" className="text-xs bg-rose-100 text-rose-700">
                                <Heart className="w-3 h-3 mr-1" />
                                Love
                              </Badge>
                            )}
                            {task.is_urgent && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                <Clock className="w-3 h-3 mr-1" />
                                Urgent
                              </Badge>
                            )}
                            {task.is_quick && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                <Zap className="w-3 h-3 mr-1" />
                                Quick
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              AI: {task.ai_effort} effort
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            Priority Score: {task.priority_score}
                          </p>
                        </div>
                        
                        <div className="ml-4">
                          <Button size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
                            <Target className="w-4 h-4 mr-2" />
                            Commit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Your Task Adventure</h1>
                <p className="text-muted-foreground">
                  Focus on one task at a time. You've got this! 
                </p>
              </div>

              {/* Main Card Display */}
              <div className="relative">
                {/* Stacked Card Deck Effect */}
                <div className="mb-6 flex justify-center">
                  <div className="relative w-80" style={{ aspectRatio: '63/88' }}>
                    
                    {/* Background Cards (Stack Effect) */}
                    {!completedTasks.has(currentTask?.id) && [...Array(Math.min(3, tasks.length - 1))].map((_, i) => (
                      <div
                        key={`background-card-${i}`}
                        className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg border border-primary/20 shadow-lg"
                        style={{
                          transform: `translateX(${(i + 1) * 3}px) translateY(${(i + 1) * 2}px) rotate(${(i + 1) * 1}deg)`,
                          zIndex: 20 - i
                        }}
                      />
                    ))}
                    
                    {/* Current Task Card */}
                    <div className={`absolute inset-0 transition-transform duration-700 ${
                      isTaskCompleted ? '[transform:rotateY(180deg)]' : ''
                    }`} style={{ transformStyle: 'preserve-3d', zIndex: 25 }}>
                      
                      {/* Progress Border - Only show when committed and not completed */}
                      {isTaskCommitted && !isTaskCompleted && (
                        <ProgressBorder
                          progress={flowProgress / 100}
                          width={320}
                          height={447}
                          stroke={6}
                          color="hsl(var(--primary))"
                          className="pointer-events-none z-[15]"
                        />
                      )}
                      
                      {/* Front of Card */}
                      <Card className={`absolute inset-0 border-2 shadow-xl transition-all duration-300 bg-card/95 backdrop-blur-sm text-card-foreground z-[10] ${
                        isTaskCompleted 
                          ? 'border-green-500' 
                          : 'border-primary/30 hover:border-primary/50'
                      }`} style={{ backfaceVisibility: 'hidden' }}>
                        <div className="h-full flex flex-col">
                          <CardHeader className="text-center pb-4 flex-shrink-0">
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                                {currentCardIndex + 1}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                of {tasks.length}
                              </div>
                            </div>
                            <CardTitle className="text-lg leading-tight text-foreground">
                              {currentTask?.title || 'Loading task...'}
                            </CardTitle>
                          </CardHeader>
                          
                          <CardContent className="flex-1 flex flex-col justify-between space-y-4 px-4 pb-4">
                            {/* Task Tags */}
                            <div className="flex flex-wrap gap-1 justify-center">
                              {currentTask?.is_liked && (
                                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300">
                                  <Heart className="w-3 h-3 mr-1" />
                                  Love
                                </Badge>
                              )}
                              {currentTask?.is_urgent && (
                                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-300">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Urgent
                                </Badge>
                              )}
                              {currentTask?.is_quick && (
                                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-green-500/20 text-green-700 dark:text-green-300 border border-green-300">
                                  <Zap className="w-3 h-3 mr-1" />
                                  Quick
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
                                AI: {currentTask?.ai_effort || 'medium'} effort
                              </Badge>
                            </div>

                            {/* Task Actions */}
                            <div className="text-center space-y-2">
                              {currentTask && !isTaskCompleted ? (
                                !isTaskCommitted ? (
                                  <Button 
                                    onClick={handleCommitToCurrentTask}
                                    size="sm"
                                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                                  >
                                    <Play className="w-4 h-4 mr-2" />
                                    Commit to Task
                                  </Button>
                                ) : (
                                  <Button 
                                    onClick={() => handleTaskComplete(currentTask.id)}
                                    size="sm"
                                    className="w-full bg-green-600 text-white hover:bg-green-700"
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    Mark Complete
                                  </Button>
                                )
                              ) : isTaskCompleted ? (
                                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                                  <Check className="w-4 h-4" />
                                  <span className="font-medium text-sm">Completed!</span>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">Loading...</div>
                              )}
                            </div>
                          </CardContent>
                        </div>
                      </Card>

                      {/* Back of Card (Sunset Image) */}
                      {isTaskCompleted && currentTask && (
                        <div 
                          className="absolute inset-0 rounded-lg shadow-xl border-2 border-green-500 [transform:rotateY(180deg)]"
                          style={{ 
                            backfaceVisibility: 'hidden',
                            background: `linear-gradient(45deg, rgba(251,146,60,0.8), rgba(249,115,22,0.8)), url('${sunsetImages[currentCardIndex % sunsetImages.length]}') center/cover`
                          }}
                        >
                          <div className="h-full flex flex-col justify-between p-6 text-white">
                            <div className="text-center">
                              <h3 className="text-lg font-bold mb-2">Task Complete!</h3>
                              <p className="text-sm opacity-90">{currentTask.title}</p>
                            </div>
                            
                            <div className="text-center space-y-4">
                              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                                <p className="text-sm mb-2">🌅 Beautiful work!</p>
                                <p className="text-xs opacity-75">You've earned this sunset moment</p>
                              </div>
                              
                              <Button 
                                onClick={() => setShowCompletionModal(true)}
                                size="sm"
                                className="w-full bg-white/20 hover:bg-white/30 border border-white/30"
                              >
                                View Completion Stats
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Navigation - Always show but disable during 5-minute commitment */}
                {tasks.length > 1 && (
                  <div className="flex justify-between items-center mb-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (currentCardIndex > 0) {
                          setCurrentCardIndex(prev => prev - 1);
                          setHasCommittedToTask(false);
                          setFlowProgress(0);
                          setFlowStartTime(null);
                        }
                      }}
                      disabled={currentCardIndex === 0 || (hasCommittedToTask && flowStartTime && (Date.now() - flowStartTime) < 5 * 60 * 1000)}
                      className="flex items-center gap-2"
                    >
                      {(hasCommittedToTask && flowStartTime && (Date.now() - flowStartTime) < 5 * 60 * 1000) && (
                        <Lock className="w-4 h-4" />
                      )}
                      <ArrowLeft className="w-4 h-4" />
                      Previous
                    </Button>

                    <div className="text-sm text-muted-foreground text-center">
                      {(hasCommittedToTask && flowStartTime && (Date.now() - flowStartTime) < 5 * 60 * 1000) ? (
                        `Navigation unlocks in ${Math.ceil((5 * 60 * 1000 - (Date.now() - flowStartTime)) / 60000)} min`
                      ) : (
                        "Navigate between tasks"
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (currentCardIndex < tasks.length - 1) {
                          setCurrentCardIndex(prev => prev + 1);
                          setHasCommittedToTask(false);
                          setFlowProgress(0);
                          setFlowStartTime(null);
                        }
                      }}
                      disabled={currentCardIndex >= tasks.length - 1 || (hasCommittedToTask && flowStartTime && (Date.now() - flowStartTime) < 5 * 60 * 1000)}
                      className="flex items-center gap-2"
                    >
                      Next
                      <ArrowRight className="w-4 h-4" />
                      {(hasCommittedToTask && flowStartTime && (Date.now() - flowStartTime) < 5 * 60 * 1000) && (
                        <Lock className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )}

                {/* Timer Status Indicator */}
                {hasCommittedToTask && flowStartTime && (Date.now() - flowStartTime) < 5 * 60 * 1000 && !showTaskSelection && (
                  <div className="flex justify-center mb-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
                      <Lock className="w-4 h-4" />
                      <span>Navigation unlocks in {Math.ceil((5 * 60 * 1000 - (Date.now() - flowStartTime)) / 60000)} minutes</span>
                    </div>
                  </div>
                )}

                {/* Task Preview Dots */}
                <div className="flex justify-center gap-2 mb-8">
                  {tasks.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === currentCardIndex
                          ? 'bg-primary scale-125'
                          : completedTasks.has(tasks[index].id)
                          ? 'bg-green-500'
                          : 'bg-muted border-2 border-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>

                {/* Completion */}
                {completedTasks.size === tasks.length && (
                  <div className="text-center">
                    <Button onClick={onComplete} size="lg" className="w-full max-w-xs">
                      Finish Session
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Trophy className="h-6 w-6 text-primary" />
              Task Complete!
            </DialogTitle>
          </DialogHeader>
          
          {lastCompletedTask && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="text-4xl mb-2">🎉</div>
                <h3 className="font-semibold mb-2">{lastCompletedTask.title}</h3>
                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary">
                  <Clock className="h-6 w-6" />
                  {formatTime(lastCompletedTask.timeSpent)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Time spent in focused work
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowCompletionModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Continue
                </Button>
                <Button 
                  onClick={handleAddToCollection}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Add to Collection
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Today's Collection */}
      <TodaysCollection 
        completedTasks={todaysCompletedTasks}
        isVisible={todaysCompletedTasks.length > 0}
      />

      {/* Character */}
      {showCharacter && (
        <MrIntentCharacter
          message={characterMessage}
          onClose={() => setShowCharacter(false)}
        />
      )}
    </div>
  );
};