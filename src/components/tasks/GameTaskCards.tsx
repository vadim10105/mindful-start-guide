import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Lock, Heart, Clock, Zap, Check, Target, Play, Trophy, RotateCcw } from "lucide-react";
import { MrIntentCharacter } from "./MrIntentCharacter";
import { ProgressBorder } from "@/components/ui/progress-border";
import { TodaysCollection } from "./TodaysCollection";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-cards';

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
  const [currentViewingIndex, setCurrentViewingIndex] = useState(0);
  const [activeCommittedIndex, setActiveCommittedIndex] = useState(0);
  const [flowStartTime, setFlowStartTime] = useState<number | null>(null);
  const [showCharacter, setShowCharacter] = useState(true);
  const [characterMessage, setCharacterMessage] = useState(
    "Ugh, fine... I guess we should probably do something productive. Click 'Commit to Task' if you're feeling ambitious."
  );
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [hasCommittedToTask, setHasCommittedToTask] = useState(false);
  const [taskStartTimes, setTaskStartTimes] = useState<Record<string, number>>({});
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [lastCompletedTask, setLastCompletedTask] = useState<{id: string, title: string, timeSpent: number} | null>(null);
  const [todaysCompletedTasks, setTodaysCompletedTasks] = useState<CompletedTask[]>([]);
  const [navigationUnlocked, setNavigationUnlocked] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout>();
  const swiperRef = useRef<any>(null);
  const { toast } = useToast();

  // Calculate flow progress (0-100) based on 20-minute commitment periods
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
      const progress = Math.min((elapsed / (20 * 60 * 1000)) * 100, 100); // 20 minutes
      setFlowProgress(progress);
      
      // Unlock navigation after 5 minutes
      if (elapsed >= 5 * 60 * 1000 && !navigationUnlocked) {
        setNavigationUnlocked(true);
        const currentTask = tasks[activeCommittedIndex];
        setCharacterMessage(`Wow, you actually stuck with "${currentTask?.title}" longer than I would have! Feel free to browse around now.`);
        setShowCharacter(true);
        setTimeout(() => setShowCharacter(false), 4000);
      }
    };

    if (hasCommittedToTask && flowStartTime) {
      timerRef.current = setInterval(updateProgress, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [flowStartTime, navigationUnlocked, hasCommittedToTask]);

  const handleCommitToCurrentTask = () => {
    const currentTask = tasks[currentViewingIndex];
    if (!currentTask) return;
    
    setHasCommittedToTask(true);
    setActiveCommittedIndex(currentViewingIndex);
    setFlowStartTime(Date.now());
    setFlowProgress(0);
    setNavigationUnlocked(false);
    
    // Record start time for this specific task
    setTaskStartTimes(prev => ({
      ...prev,
      [currentTask.id]: Date.now()
    }));
    
    const lazyMessages = [
      `Alright, "${currentTask.title}"... I'd probably procrastinate on this too, but here we are.`,
      `Even I can manage 5 minutes of focus on "${currentTask.title}"... probably.`,
      `Fine, we're doing "${currentTask.title}". At least one of us is being productive today.`,
      `"${currentTask.title}" it is. Try not to make me look too lazy by comparison.`
    ];
    
    setCharacterMessage(lazyMessages[Math.floor(Math.random() * lazyMessages.length)]);
    setShowCharacter(true);
    
    // Hide character after 4 seconds
    setTimeout(() => setShowCharacter(false), 4000);
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

        // Auto-advance to next card and reset states
        const nextIndex = currentViewingIndex + 1;
        if (nextIndex < tasks.length) {
          setCurrentViewingIndex(nextIndex);
          setActiveCommittedIndex(nextIndex);
          setHasCommittedToTask(false);
          setNavigationUnlocked(false); // Lock navigation again for new card
          setFlowStartTime(null);
          setFlowProgress(0);
          
          // Show lazy message about new card
          const nextTask = tasks[nextIndex];
          const newCardMessages = [
            `Oh great, now we have "${nextTask?.title}"... this day just keeps getting better.`,
            `Next up: "${nextTask?.title}". I'm already tired just thinking about it.`,
            `"${nextTask?.title}" is calling... but I'm not answering.`,
            `Well, "${nextTask?.title}" isn't going to do itself... unfortunately.`
          ];
          setCharacterMessage(newCardMessages[Math.floor(Math.random() * newCardMessages.length)]);
          setShowCharacter(true);
          setTimeout(() => setShowCharacter(false), 4000);
        }
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

  const handleBackToActiveCard = () => {
    setCurrentViewingIndex(activeCommittedIndex);
  };

  const isNavigationLocked = hasCommittedToTask && !navigationUnlocked;
  const isViewingDifferentCard = currentViewingIndex !== activeCommittedIndex && hasCommittedToTask;
  const currentTask = tasks[currentViewingIndex];
  const activeTask = tasks[activeCommittedIndex];
  const isTaskCompleted = currentTask ? completedTasks.has(currentTask.id) : false;
  const isTaskCommitted = hasCommittedToTask && currentViewingIndex === activeCommittedIndex;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (!isNavigationLocked && swiperRef.current) {
          e.preventDefault();
          if (e.key === 'ArrowLeft') {
            swiperRef.current.slidePrev();
          } else if (e.key === 'ArrowRight') {
            swiperRef.current.slideNext();
          }
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentTask = tasks[currentViewingIndex];
        if (!currentTask) return;
        
        if (isTaskCommitted && !completedTasks.has(currentTask.id)) {
          handleTaskComplete(currentTask.id);
        } else if (!hasCommittedToTask || currentViewingIndex !== activeCommittedIndex) {
          handleCommitToCurrentTask();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentViewingIndex, activeCommittedIndex, hasCommittedToTask, isNavigationLocked, isTaskCommitted, completedTasks]);

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
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Your Task Adventure</h1>
            <p className="text-muted-foreground">
              Focus on one task at a time. You've got this! 
            </p>
          </div>

          {/* Back to Active Card Button */}
          {isViewingDifferentCard && (
            <div className="flex justify-center mb-4">
              <Button
                onClick={handleBackToActiveCard}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Back to Active Card
              </Button>
            </div>
          )}

            {/* Main Card Display with Swiper */}
            <div className="relative">
              <div className="mb-6 flex justify-center">
                <div className="w-80" style={{ aspectRatio: '63/88' }}>
                  <Swiper
                    ref={swiperRef}
                    effect="cards"
                    grabCursor={true}
                    modules={[EffectCards]}
                    onSwiper={(swiper) => {
                      swiperRef.current = swiper;
                    }}
                    cardsEffect={{
                      perSlideOffset: 8,
                      perSlideRotate: 2,
                      rotate: true,
                      slideShadows: true,
                    }}
                    onSlideChange={(swiper) => {
                      if (!isNavigationLocked) {
                        setCurrentViewingIndex(swiper.activeIndex);
                      }
                    }}
                    allowSlideNext={!isNavigationLocked}
                    allowSlidePrev={!isNavigationLocked}
                    initialSlide={currentViewingIndex}
                    className="w-full h-full"
                  >
                    {tasks.map((task, index) => (
                      <SwiperSlide key={task.id}>
                        <div className={`w-full h-full transition-transform duration-700 ${
                          completedTasks.has(task.id) ? '[transform:rotateY(180deg)]' : ''
                        }`} style={{ transformStyle: 'preserve-3d' }}>
                          
                          {/* Progress Border - Only show when committed and not completed */}
                          {index === activeCommittedIndex && hasCommittedToTask && !completedTasks.has(task.id) && (
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
                          <Card className={`w-full h-full border-2 shadow-xl bg-card/95 backdrop-blur-sm text-card-foreground z-[10] ${
                            completedTasks.has(task.id)
                              ? 'border-green-500' 
                              : index !== activeCommittedIndex && hasCommittedToTask
                              ? 'border-muted-foreground/50'
                              : 'border-primary/30 hover:border-primary/50'
                          }`} style={{ backfaceVisibility: 'hidden' }}>
                            <div className="h-full flex flex-col">
                              <CardHeader className="text-center pb-4 flex-shrink-0">
                                <div className="flex items-center justify-center gap-2 mb-4">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    index !== activeCommittedIndex && hasCommittedToTask
                                      ? 'bg-muted text-muted-foreground' 
                                      : 'bg-primary text-primary-foreground'
                                  }`}>
                                    {index + 1}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    of {tasks.length}
                                  </div>
                                </div>
                                <CardTitle className="text-lg leading-tight text-foreground">
                                  {task.title}
                                </CardTitle>
                                {index !== activeCommittedIndex && hasCommittedToTask && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    (Currently active: {tasks[activeCommittedIndex]?.title})
                                  </p>
                                )}
                              </CardHeader>
                              
                              <CardContent className="flex-1 flex flex-col justify-between space-y-4 px-4 pb-4">
                                {/* Task Tags */}
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {task.is_liked && (
                                    <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300">
                                      <Heart className="w-3 h-3 mr-1" />
                                      Love
                                    </Badge>
                                  )}
                                  {task.is_urgent && (
                                    <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-300">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Urgent
                                    </Badge>
                                  )}
                                  {task.is_quick && (
                                    <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-green-500/20 text-green-700 dark:text-green-300 border border-green-300">
                                      <Zap className="w-3 h-3 mr-1" />
                                      Quick
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
                                    AI: {task.ai_effort || 'medium'} effort
                                  </Badge>
                                </div>

                                {/* Task Actions */}
                                <div className="text-center space-y-2">
                                  {!completedTasks.has(task.id) ? (
                                    index !== activeCommittedIndex && hasCommittedToTask ? (
                                      <div className="text-sm text-muted-foreground">
                                        You're currently focused on another task
                                      </div>
                                    ) : index !== currentViewingIndex ? (
                                      <div className="text-sm text-muted-foreground">
                                        Swipe to view this task
                                      </div>
                                    ) : !hasCommittedToTask || index !== activeCommittedIndex ? (
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
                                        onClick={() => handleTaskComplete(task.id)}
                                        size="sm"
                                        className="w-full bg-green-600 text-white hover:bg-green-700"
                                      >
                                        <Check className="w-4 h-4 mr-2" />
                                        Mark Complete
                                      </Button>
                                    )
                                  ) : (
                                    <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                                      <Check className="w-4 h-4" />
                                      <span className="font-medium text-sm">Completed!</span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </div>
                          </Card>

                          {/* Back of Card (Sunset Image) */}
                          {completedTasks.has(task.id) && (
                            <div 
                              className="absolute inset-0 rounded-lg shadow-xl border-2 border-green-500 [transform:rotateY(180deg)]"
                              style={{ 
                                backfaceVisibility: 'hidden',
                                background: `linear-gradient(45deg, rgba(251,146,60,0.8), rgba(249,115,22,0.8)), url('${sunsetImages[index % sunsetImages.length]}') center/cover`
                              }}
                            >
                              <div className="h-full flex flex-col justify-between p-6 text-white">
                                <div className="text-center">
                                  <h3 className="text-lg font-bold mb-2">Task Complete!</h3>
                                  <p className="text-sm opacity-90">{task.title}</p>
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
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </div>
              </div>

              {/* Navigation Status */}
              <div className="text-center mb-6">
                <div className="text-sm text-muted-foreground">
                  {isNavigationLocked ? (
                    hasCommittedToTask ? (
                      `Navigation unlocks in ${Math.ceil((5 * 60 * 1000 - (Date.now() - (flowStartTime || 0))) / 60000)} min • Press ↓ to complete`
                    ) : (
                      "Commit to a task to start your focus session • Press ↓ to commit"
                    )
                  ) : (
                    "Swipe, use arrow keys (←/→), or press ↓ to commit"
                  )}
                </div>
              </div>

            {/* Task Preview Dots */}
            <div className="flex justify-center gap-2 mb-8">
              {tasks.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentViewingIndex
                      ? 'bg-primary scale-125'
                      : completedTasks.has(tasks[index].id)
                      ? 'bg-green-500'
                      : index === activeCommittedIndex && hasCommittedToTask
                      ? 'bg-primary/60 border-2 border-primary'
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