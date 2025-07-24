import { useEffect, useState } from "react";

interface ShuffleAnimationProps {
  isProcessing: boolean;
  onLoadingComplete?: () => void;
}

export const ShuffleAnimation = ({ isProcessing, onLoadingComplete }: ShuffleAnimationProps) => {
  const [isSettling, setIsSettling] = useState(false);

  // Complete animation when processing finishes
  useEffect(() => {
    if (!isProcessing && !isSettling) {
      setIsSettling(true);
      // Give time for settle animation then complete
      setTimeout(() => {
        onLoadingComplete?.();
      }, 600);
    }
  }, [isProcessing, isSettling, onLoadingComplete]);

  return (
    <div className="mb-6 flex justify-center">
      <div className="w-[368px]" style={{ aspectRatio: '63/88' }}>
        <div className={`w-full h-full relative flex items-center justify-center transition-opacity duration-500 ${
          isSettling ? 'opacity-95' : 'opacity-100'
        }`}>
          
          {/* Bottom stack cards (stationary) */}
          <div 
            className="absolute w-full h-full rounded-2xl border-2 shadow-lg"
            style={{
              backgroundColor: 'hsl(202 10% 14%)',
              borderColor: 'hsl(202 10% 28%)',
              transform: 'translateY(2px)',
              zIndex: 1
            }}
          />
          <div 
            className="absolute w-full h-full rounded-2xl border-2 shadow-lg"
            style={{
              backgroundColor: 'hsl(202 10% 16%)',
              borderColor: 'hsl(202 10% 30%)',
              transform: 'translateY(1px)',
              zIndex: 2
            }}
          />
          
          {/* Shuffling cards - these move around */}
          <div 
            className={`absolute w-full h-full rounded-2xl border-2 shadow-xl transition-all duration-300 ${
              isSettling ? 'animate-none' : 'animate-shuffle-card-top'
            }`}
            style={{
              backgroundColor: 'hsl(202 10% 18%)',
              borderColor: 'hsl(202 10% 32%)',
              transform: isSettling ? 'translateX(0px) translateY(0px) rotate(0deg)' : undefined,
              zIndex: 6
            }}
          />
          
          <div 
            className={`absolute w-full h-full rounded-2xl border-2 shadow-xl transition-all duration-300 ${
              isSettling ? 'animate-none' : 'animate-shuffle-card-middle'
            }`}
            style={{
              backgroundColor: 'hsl(202 10% 20%)',
              borderColor: 'hsl(202 10% 34%)',
              transform: isSettling ? 'translateX(0px) translateY(0px) rotate(0deg)' : undefined,
              zIndex: 5
            }}
          />
          
          <div 
            className={`absolute w-full h-full rounded-2xl border-2 shadow-xl transition-all duration-300 ${
              isSettling ? 'animate-none' : 'animate-shuffle-card-bottom'
            }`}
            style={{
              backgroundColor: 'hsl(202 10% 22%)',
              borderColor: 'hsl(202 10% 36%)',
              transform: isSettling ? 'translateX(0px) translateY(0px) rotate(0deg)' : undefined,
              zIndex: 4
            }}
          />

          {/* Main deck card */}
          <div 
            className="absolute w-full h-full rounded-2xl border-2 shadow-lg"
            style={{
              backgroundColor: 'hsl(202 10% 18%)',
              borderColor: 'hsl(202 10% 32%)',
              zIndex: 3
            }}
          />

          
        </div>
      </div>
    </div>
  );
};