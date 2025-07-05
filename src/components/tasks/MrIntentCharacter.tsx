import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface MrIntentCharacterProps {
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  delay?: number;
}

export const MrIntentCharacter = ({ 
  message, 
  onClose, 
  autoClose = true, 
  delay = 4000 
}: MrIntentCharacterProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Entrance animation
    setTimeout(() => setIsAnimating(true), 100);

    if (autoClose) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => {
          setIsVisible(false);
          onClose?.();
        }, 300);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [autoClose, delay, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
      isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
    }`}>
      <Card className="max-w-xs shadow-2xl border-2 border-primary/30 bg-card/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Character Avatar */}
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center border-2 border-primary/30">
              <div className="text-primary-foreground font-bold text-lg">😴</div>
            </div>
            
            {/* Speech Bubble */}
            <div className="flex-1 relative">
              <div className="bg-muted/80 rounded-lg p-3 relative">
                <p className="text-sm text-foreground leading-relaxed">
                  {message}
                </p>
                {/* Speech bubble tail */}
                <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2">
                  <div className="w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-muted/80"></div>
                </div>
              </div>
              
              {/* Character Name */}
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Mr. Intent
              </p>
            </div>
          </div>
          
          {!autoClose && onClose && (
            <button
              onClick={() => {
                setIsAnimating(false);
                setTimeout(() => {
                  setIsVisible(false);
                  onClose();
                }, 300);
              }}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              ×
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};