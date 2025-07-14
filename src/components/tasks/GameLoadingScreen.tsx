import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface GameLoadingScreenProps {
  onLoadingComplete: () => void;
  taskCount: number;
}

export const GameLoadingScreen = ({ onLoadingComplete, taskCount }: GameLoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Shuffling your cards...");

  useEffect(() => {
    const messages = [
      "Shuffling your cards...",
      "Consulting the task oracle...",
      "Preparing your quest...",
      "Organizing the chaos...",
      "Almost ready to start..."
    ];

    let currentMessage = 0;
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 2;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setTimeout(onLoadingComplete, 500);
          return 100;
        }
        
        // Change message every 20% progress
        if (newProgress % 20 === 0 && currentMessage < messages.length - 1) {
          currentMessage++;
          setLoadingText(messages[currentMessage]);
        }
        
        return newProgress;
      });
    }, 60); // 3 second total duration

    return () => clearInterval(progressInterval);
  }, [onLoadingComplete]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 border-2 border-primary/20 shadow-xl">
        <CardContent className="p-8 text-center space-y-6">
          {/* Animated Cards */}
          <div className="relative h-32 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-16 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-lg shadow-lg border-2 border-primary/30 absolute animate-pulse`}
                  style={{
                    transform: `rotate(${(i - 1) * 15}deg) translateX(${(i - 1) * 20}px)`,
                    animationDelay: `${i * 0.3}s`,
                    zIndex: 3 - i
                  }}
                />
              ))}
            </div>
          </div>

          {/* Loading Text */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              {loadingText}
            </h3>
            <p className="text-sm text-muted-foreground">
              Preparing {taskCount} tasks for your adventure
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {Math.round(progress)}% Complete
            </p>
          </div>

          {/* Decorative Elements */}
          <div className="flex justify-center space-x-2 opacity-60">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};