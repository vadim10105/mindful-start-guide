import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MrIntentCharacter } from "./MrIntentCharacter";
import { TodaysCollection } from "./TodaysCollection";
import { TaskSwiper } from "./TaskSwiper";
import { NavigationDots } from "./NavigationDots";

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
    "Ugh, fine... I guess we should probably do something productive. Click 'Play this card' if you're feeling ambitious."
  );
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [pausedTasks, setPausedTasks] = useState<Map<string, number>>(new Map());
  const [hasCommittedToTask, setHasCommittedToTask] = useState(false);
  const [taskStartTimes, setTaskStartTimes] = useState<Record<string, number>>({});
  const [lastCompletedTask, setLastCompletedTask] = useState<{id: string, title: string, timeSpent: number} | null>(null);
  const [todaysCompletedTasks, setTodaysCompletedTasks] = useState<CompletedTask[]>([]);
  const [navigationUnlocked, setNavigationUnlocked] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const timerRef = useRef<NodeJS.Timeout>();
  const swiperRef = useRef<any>(null);
  const { toast } = useToast();

  // Calculate flow progress (0-100) based on 20-minute commitment periods
  const [flowProgress, setFlowProgress] = useState(0);

  // Sunset images for card backs
  const sunsetImages = [
    'https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=600&fit=crop',
  ];

  // Progress tracking effect
  useEffect(() => {
    const updateProgress = () => {
      if (!flowStartTime || !hasCommittedToTask) return;
      
      const elapsed = Date.now() - flowStartTime;
      const progress = Math.min((elapsed / (20 * 60 * 1000)) * 100, 100);
      setFlowProgress(progress);
      
      if (elapsed >= 5 * 60 * 1000 && !navigationUnlocked) {
        setNavigationUnlocked(true);
        const currentTask = tasks[activeCommittedIndex];
        setCharacterMessage(`Wow, you actually stuck with "${currentTask?.title}" longer than I would have! Feel free to browse around now.`);
        setShowCharacter(true);
        setTimeout(() => setShowCharacter(false), 8000);
      }
    };

    if (hasCommittedToTask && flowStartTime) {
      timerRef.current = setInterval(updateProgress, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [flowStartTime, navigationUnlocked, hasCommittedToTask]);

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
  }, [currentViewingIndex, activeCommittedIndex, hasCommittedToTask, completedTasks]);

  const handleCommitToCurrentTask = () => {
    const currentTask = tasks[currentViewingIndex];
    if (!currentTask) return;
    
    setHasCommittedToTask(true);
    setActiveCommittedIndex(currentViewingIndex);
    setFlowStartTime(Date.now());
    setFlowProgress(0);
    setNavigationUnlocked(false);
    
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
    setTimeout(() => setShowCharacter(false), 8000);
  };

  const handleTaskComplete = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const startTime = taskStartTimes[taskId];
    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 60000) : 0;
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57']
    });

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setFlowProgress(0);
    
    // Unlock navigation immediately upon completion
    setNavigationUnlocked(true);
    setHasCommittedToTask(false);
    setIsInitialLoad(false);
    
    setCompletedTasks(prev => new Set([...prev, taskId]));
    setLastCompletedTask({ id: taskId, title: task.title, timeSpent });
    
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

        const newCollectedTask: CompletedTask = {
          id: lastCompletedTask.id,
          title: lastCompletedTask.title,
          timeSpent: lastCompletedTask.timeSpent,
          completedAt: new Date(),
          sunsetImageUrl: sunsetImages[Math.floor(Math.random() * sunsetImages.length)]
        };
        
        setTodaysCompletedTasks(prev => [...prev, newCollectedTask]);

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
    
    // Move to next task after adding to collection
    const nextIndex = currentViewingIndex + 1;
    
    if (nextIndex < tasks.length) {
      setCurrentViewingIndex(nextIndex);
      setActiveCommittedIndex(nextIndex);
      setHasCommittedToTask(false);
      setNavigationUnlocked(false);
      setFlowStartTime(null);
      setFlowProgress(0);
      
      const nextTask = tasks[nextIndex];
      const newCardMessages = [
        `Oh great, now we have "${nextTask?.title}"... this day just keeps getting better.`,
        `Next up: "${nextTask?.title}". I'm already tired just thinking about it.`,
        `"${nextTask?.title}" is calling... but I'm not answering.`,
        `Well, "${nextTask?.title}" isn't going to do itself... unfortunately.`
      ];
      setCharacterMessage(newCardMessages[Math.floor(Math.random() * newCardMessages.length)]);
      setShowCharacter(true);
      setTimeout(() => setShowCharacter(false), 8000);
    }
  };

  const handleBackToActiveCard = () => {
    setCurrentViewingIndex(activeCommittedIndex);
  };

  const handleMoveOnForNow = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const startTime = taskStartTimes[taskId];
    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 60000) : 0;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setFlowProgress(0);
    
    // Unlock navigation after moving on from first task
    setNavigationUnlocked(true);
    setIsInitialLoad(false);
    
    setPausedTasks(prev => new Map(prev.set(taskId, timeSpent)));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tasks')
          .update({ 
            status: 'paused',
            paused_at: new Date().toISOString(),
            time_spent_minutes: timeSpent
          })
          .eq('id', taskId);
      }
    } catch (error) {
      console.error('Error pausing task:', error);
    }
    
    const nextTask = tasks.find((t, index) => 
      index > currentViewingIndex && 
      !completedTasks.has(t.id) && 
      !pausedTasks.has(t.id)
    );

    if (nextTask) {
      const nextIndex = tasks.indexOf(nextTask);
      setCurrentViewingIndex(nextIndex);
      setActiveCommittedIndex(nextIndex);
      setHasCommittedToTask(false);
      setNavigationUnlocked(true); // Keep navigation unlocked after first task interaction
      setFlowStartTime(null);
      
      const moveOnMessages = [
        `Fine, moving on to "${nextTask.title}"... this better be more interesting.`,
        `Next up: "${nextTask.title}". Here we go again...`,
        `"${nextTask.title}" is next. Let's see if we can actually focus this time.`,
        `Moving to "${nextTask.title}"... hopefully this goes better.`
      ];
      
      setCharacterMessage(moveOnMessages[Math.floor(Math.random() * moveOnMessages.length)]);
      setShowCharacter(true);
      setTimeout(() => setShowCharacter(false), 8000);
    } else {
      setHasCommittedToTask(false);
      setNavigationUnlocked(false);
      setFlowStartTime(null);
      
      const pauseMessages = [
        `Fine, taking a break from "${task.title}"... I wasn't really in the mood anyway.`,
        `"${task.title}" can wait. Even I need a breather sometimes.`,
        `Pausing "${task.title}"... probably for the best, honestly.`,
        `We'll get back to "${task.title}" when we feel like it. No rush.`
      ];
      
      setCharacterMessage(pauseMessages[Math.floor(Math.random() * pauseMessages.length)]);
      setShowCharacter(true);
      setTimeout(() => setShowCharacter(false), 8000);
    }
    
    toast({
      title: "Task Paused", 
      description: nextTask ? `Moving on to "${nextTask.title}"` : `You can continue "${task.title}" later or skip it entirely.`,
    });
  };

  const handleCarryOn = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const pausedTime = pausedTasks.get(taskId) || 0;
    
    setHasCommittedToTask(true);
    setActiveCommittedIndex(currentViewingIndex);
    setFlowStartTime(Date.now());
    setFlowProgress(0);
    setNavigationUnlocked(false);
    
    setTaskStartTimes(prev => ({
      ...prev,
      [taskId]: Date.now() - (pausedTime * 60000)
    }));
    
    setPausedTasks(prev => {
      const newMap = new Map(prev);
      newMap.delete(taskId);
      return newMap;
    });
    
    const continueMessages = [
      `Alright, back to "${task.title}"... where were we? Oh right, avoiding it.`,
      `Continuing with "${task.title}"... hope you're more motivated than I am.`,
      `"${task.title}" again... fine, let's see if we can actually finish it this time.`,
      `Back to the grind with "${task.title}"... joy.`
    ];
    
    setCharacterMessage(continueMessages[Math.floor(Math.random() * continueMessages.length)]);
    setShowCharacter(true);
    setTimeout(() => setShowCharacter(false), 8000);
  };

  const handleSkip = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setPausedTasks(prev => {
      const newMap = new Map(prev);
      newMap.delete(taskId);
      return newMap;
    });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tasks')
          .update({ status: 'skipped' })
          .eq('id', taskId);
      }
    } catch (error) {
      console.error('Error skipping task:', error);
    }
    
    const skipMessages = [
      `Skipping "${task.title}"... honestly, probably for the best.`,
      `"${task.title}" is now officially someone else's problem.`,
      `Goodbye "${task.title}"... it's not you, it's definitely me.`,
      `"${task.title}" has been eliminated. One less thing to worry about.`
    ];
    
    setCharacterMessage(skipMessages[Math.floor(Math.random() * skipMessages.length)]);
    setShowCharacter(true);
    setTimeout(() => setShowCharacter(false), 8000);
    
    toast({
      title: "Task Skipped",
      description: `"${task.title}" has been removed from your list.`,
    });
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const isNavigationLocked = isInitialLoad || (hasCommittedToTask && !navigationUnlocked);
  const isTaskCommitted = hasCommittedToTask && currentViewingIndex === activeCommittedIndex;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full px-4">
        <div className="w-full">
          {/* Main Card Display */}
          <div className="relative">
            <TaskSwiper
              ref={swiperRef}
              tasks={tasks}
              currentViewingIndex={currentViewingIndex}
              activeCommittedIndex={activeCommittedIndex}
              hasCommittedToTask={hasCommittedToTask}
              completedTasks={completedTasks}
              pausedTasks={pausedTasks}
              isNavigationLocked={isNavigationLocked}
              flowProgress={flowProgress}
              sunsetImages={sunsetImages}
              navigationUnlocked={navigationUnlocked}
              onSlideChange={(activeIndex) => setCurrentViewingIndex(activeIndex)}
              onCommit={handleCommitToCurrentTask}
              onComplete={handleTaskComplete}
              onMoveOn={handleMoveOnForNow}
              onCarryOn={handleCarryOn}
              onSkip={handleSkip}
              onBackToActive={handleBackToActiveCard}
              
              onAddToCollection={handleAddToCollection}
              formatTime={formatTime}
            />

            {/* Navigation Status */}
            <div className="text-center mb-6">
              <div className="text-sm text-muted-foreground">
                {isNavigationLocked ? (
                  hasCommittedToTask ? (
                     `Navigation unlocks in ${Math.ceil((5 * 60 * 1000 - (Date.now() - (flowStartTime || 0))) / 60000)} minutes. Focus first, swipe later.`
                  ) : (
                    "Start your focus session by playing this card."
                  )
                ) : (
                  "Swipe, use arrow keys (←/→), or press ↓ to commit"
                )}
              </div>
            </div>

            {/* Navigation Dots */}
            <NavigationDots
              tasks={tasks}
              currentViewingIndex={currentViewingIndex}
              activeCommittedIndex={activeCommittedIndex}
              hasCommittedToTask={hasCommittedToTask}
              completedTasks={completedTasks}
              pausedTasks={pausedTasks}
            />

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


      {/* Today's Collection */}
      <TodaysCollection 
        completedTasks={todaysCompletedTasks}
        isVisible={todaysCompletedTasks.length > 0}
      />

      {/* Mr Intent Character */}
      {showCharacter && (
        <MrIntentCharacter
          message={characterMessage}
          onClose={() => setShowCharacter(false)}
        />
      )}
    </div>
  );
};