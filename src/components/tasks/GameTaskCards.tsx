import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Lock, Heart, Clock, Zap, Check } from "lucide-react";
import { MrIntentCharacter } from "./MrIntentCharacter";

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

export const GameTaskCards = ({ tasks, onComplete, onTaskComplete }: GameTaskCardsProps) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [unlockedCards, setUnlockedCards] = useState(1); // Start with first card unlocked
  const [flowStartTime] = useState(Date.now());
  const [showCharacter, setShowCharacter] = useState(true);
  const [characterMessage, setCharacterMessage] = useState(
    "We'll get going in a moment — unless you'd rather wait. Less work for me!"
  );
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [hasShownUnlockMessage, setHasShownUnlockMessage] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout>();

  // Calculate flow progress (0-100) based on 20-minute total
  const [flowProgress, setFlowProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const elapsed = Date.now() - flowStartTime;
      const progress = Math.min((elapsed / (20 * 60 * 1000)) * 100, 100); // 20 minutes
      setFlowProgress(progress);
      
      // Unlock next card after 10 minutes
      if (elapsed >= 10 * 60 * 1000 && unlockedCards === 1 && !hasShownUnlockMessage) {
        setUnlockedCards(tasks.length);
        setHasShownUnlockMessage(true);
        setCharacterMessage("Wow, you're still here? I was just about to take a nap. Want to see what's next?");
        setShowCharacter(true);
      }
    };

    timerRef.current = setInterval(updateProgress, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [flowStartTime, unlockedCards, tasks.length, hasShownUnlockMessage]);

  const handleCardNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'next' && currentCardIndex < unlockedCards - 1) {
      setCurrentCardIndex(prev => prev + 1);
    } else if (direction === 'prev' && currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
    }
  };

  const handleTaskComplete = (taskId: string) => {
    setCompletedTasks(prev => new Set([...prev, taskId]));
    onTaskComplete?.(taskId);
  };

  const currentTask = tasks[currentCardIndex];
  const isTaskCompleted = completedTasks.has(currentTask?.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 relative">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Your Task Adventure</h1>
            <p className="text-muted-foreground">
              Focus on one task at a time. You've got this! 
            </p>
          </div>

          {/* Main Card Display */}
          <div className="relative">
            {/* Current Task Card with Progress Ring */}
            <div className="mb-6 flex justify-center">
              <div className="relative w-80" style={{ aspectRatio: '63/88' }}>
                {/* Progress Ring around Card */}
                <div 
                  className="absolute inset-0 rounded-lg pointer-events-none z-10"
                  style={{
                    background: `conic-gradient(from -90deg, hsl(var(--primary)) 0deg, hsl(var(--primary)) ${flowProgress * 3.6}deg, transparent ${flowProgress * 3.6}deg, transparent 360deg)`,
                    padding: '4px',
                  }}
                >
                  <div className="w-full h-full bg-background rounded-lg" />
                </div>
                
                {/* Task Card */}
                <Card className={`h-full border-2 shadow-xl transition-all duration-300 relative z-20 ${
                  isTaskCompleted 
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                    : 'border-primary/30 hover:border-primary/50'
                }`}>
                  <CardHeader className="text-center pb-4 flex-shrink-0">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {currentCardIndex + 1}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        of {tasks.length}
                      </div>
                    </div>
                    <CardTitle className="text-lg leading-tight">{currentTask?.title}</CardTitle>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col justify-between space-y-4 px-4 pb-4">
                    {/* Task Tags */}
                    <div className="flex flex-wrap gap-1 justify-center">
                      {currentTask?.is_liked && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300">
                          <Heart className="w-3 h-3 mr-1" />
                          Love
                        </Badge>
                      )}
                      {currentTask?.is_urgent && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300">
                          <Clock className="w-3 h-3 mr-1" />
                          Urgent
                        </Badge>
                      )}
                      {currentTask?.is_quick && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-300">
                          <Zap className="w-3 h-3 mr-1" />
                          Quick
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        AI: {currentTask?.ai_effort} effort
                      </Badge>
                    </div>

                    {/* Task Actions */}
                    <div className="text-center">
                      {!isTaskCompleted ? (
                        <Button 
                          onClick={() => handleTaskComplete(currentTask.id)}
                          size="sm"
                          className="w-full"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Mark Complete
                        </Button>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                          <Check className="w-4 h-4" />
                          <span className="font-medium text-sm">Completed!</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCardNavigation('prev')}
                disabled={currentCardIndex === 0}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>

              {/* Locked Cards Indicator */}
              {unlockedCards < tasks.length && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>{tasks.length - unlockedCards} more tasks will unlock in 10 minutes (I'll let you know)</span>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCardNavigation('next')}
                disabled={currentCardIndex >= unlockedCards - 1}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Task Preview Dots */}
            <div className="flex justify-center gap-2 mb-8">
              {tasks.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index < unlockedCards
                      ? index === currentCardIndex
                        ? 'bg-primary scale-125'
                        : completedTasks.has(tasks[index].id)
                        ? 'bg-green-500'
                        : 'bg-primary/40'
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