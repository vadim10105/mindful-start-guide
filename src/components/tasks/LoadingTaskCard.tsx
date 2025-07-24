import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

interface LoadingTaskCardProps {
  taskCount: number;
  isProcessing: boolean;
  onLoadingComplete?: () => void;
}

export const LoadingTaskCard = ({ taskCount, isProcessing, onLoadingComplete }: LoadingTaskCardProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 2;
        
        // Don't complete if still processing AI
        if (newProgress >= 100 && !isProcessing) {
          clearInterval(progressInterval);
          setTimeout(() => {
            onLoadingComplete?.();
          }, 500);
          return 100;
        }
        
        // Cap at 95% while processing, allow natural completion when done
        if (isProcessing && newProgress >= 95) {
          return 95;
        }
        
        return newProgress;
      });
    }, 60); // 3 second total duration

    return () => clearInterval(progressInterval);
  }, [isProcessing, onLoadingComplete]);

  // Complete loading when processing finishes
  useEffect(() => {
    if (!isProcessing && progress >= 95) {
      setTimeout(() => {
        setProgress(100);
        setTimeout(() => {
          onLoadingComplete?.();
        }, 500);
      }, 300);
    }
  }, [isProcessing, progress, onLoadingComplete]);

  return (
    <div className="mb-6 flex justify-center">
      <div className="w-[368px]" style={{ aspectRatio: '63/88' }}>
        <div className="w-full h-full animate-in fade-in-0 duration-500">
          <Card className="w-full h-full border-2 border-transparent shadow-xl z-[10] overflow-visible rounded-2xl transition-all duration-500 ease-out" style={{ 
            backgroundColor: 'hsl(202 10% 16%)',
            color: 'hsl(48 100% 96%)'
          }}>
            <div className="h-full flex flex-col">
              <CardHeader className="text-center pb-4 flex-shrink-0 relative overflow-visible px-8 py-6">
                <div className="flex items-center justify-center gap-1 mb-4">
                  <span className="text-sm" style={{ color: 'hsl(48 100% 96% / 0.7)' }}>
                    1
                  </span>
                  <span className="text-sm" style={{ color: 'hsl(48 100% 96% / 0.7)' }}>
                    of {taskCount}
                  </span>
                </div>
                
                <CardTitle className="text-2xl leading-tight tracking-wide" style={{ color: 'hsl(48 100% 96%)' }}>
                  <div className="w-3/4 h-8 bg-muted-foreground/20 rounded animate-pulse mx-auto"></div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col justify-between space-y-4 px-4 pb-4">
                {/* Empty space to match card proportions */}
                <div className="flex-1"></div>

                {/* Loading button in the exact position of TaskActions */}
                <div className="space-y-3">
                  <div className="relative overflow-hidden">
                    <Progress 
                      value={progress} 
                      className="h-11 rounded-md transition-all duration-300 ease-out"
                      style={{
                        backgroundColor: 'hsl(202 10% 20%)',
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-end pr-4">
                      <span className="text-sm font-medium" style={{ color: 'hsl(48 100% 96%)' }}>
                        Let's get going...
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};