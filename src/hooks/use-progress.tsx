
import { useState, useEffect, useRef } from "react";

export const useProgress = () => {
  const [flowProgress, setFlowProgress] = useState(0);
  const [isFlowActive, setIsFlowActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startFlow = () => {
    setIsFlowActive(true);
    setFlowProgress(0);
    
    intervalRef.current = setInterval(() => {
      setFlowProgress(prev => {
        if (prev >= 100) {
          setIsFlowActive(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          return 100;
        }
        return prev + 1;
      });
    }, 600); // Adjust speed as needed
  };

  const pauseFlow = () => {
    setIsFlowActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const resumeFlow = () => {
    if (flowProgress < 100) {
      setIsFlowActive(true);
      intervalRef.current = setInterval(() => {
        setFlowProgress(prev => {
          if (prev >= 100) {
            setIsFlowActive(false);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            return 100;
          }
          return prev + 1;
        });
      }, 600);
    }
  };

  const resetFlow = () => {
    setIsFlowActive(false);
    setFlowProgress(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    flowProgress,
    setFlowProgress,
    isFlowActive,
    startFlow,
    pauseFlow,
    resumeFlow,
    resetFlow
  };
};
