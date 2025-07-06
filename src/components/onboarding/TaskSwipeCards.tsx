import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TaskSwipeCardsProps {
  preferences: Record<string, string>;
  onChange: (preferences: Record<string, string>) => void;
}

const taskTypes = [
  {
    id: "creative_work",
    title: "Creative Work",
    description: "Tasks where you make or express something.",
    examples: "Writing, designing, brainstorming, content creation"
  },
  {
    id: "analytical_technical",
    title: "Analytical + Technical Work", 
    description: "Tasks where you think in systems, numbers, or code.",
    examples: "Coding, spreadsheets, troubleshooting, data analysis"
  },
  {
    id: "focused_deep_work",
    title: "Focused Deep Work",
    description: "Tasks that need sustained mental focus.",
    examples: "Planning, researching, problem-solving, decision-making"
  },
  {
    id: "admin_life",
    title: "Admin + Life Tasks",
    description: "Fiddly but necessary responsibilities.",
    examples: "Emails, booking things, budgeting, forms"
  },
  {
    id: "chores_errands",
    title: "Chores + Errands",
    description: "Physical tasks at home or out and about.",
    examples: "Cleaning, shopping, laundry, cooking"
  },
  {
    id: "talking_people",
    title: "Talking to People",
    description: "Tasks that involve interaction or communication.",
    examples: "Calls, meetings, voice notes, messaging"
  },
  {
    id: "emotional_reflective",
    title: "Emotional + Reflective Work",
    description: "Tasks that help you feel clear or calm inside.",
    examples: "Journaling, therapy, meditation, grounding"
  }
];

export const TaskSwipeCards = ({ preferences, onChange }: TaskSwipeCardsProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragDirection, setDragDirection] = useState<string | null>(null);

  const currentTask = taskTypes[currentIndex];
  const completed = Object.keys(preferences).length;
  const total = taskTypes.length;

  const handleRating = useCallback((rating: "liked" | "disliked" | "neutral") => {
    if (!currentTask) return;

    const newPreferences = {
      ...preferences,
      [currentTask.id]: rating
    };
    
    onChange(newPreferences);
    
    if (currentIndex < taskTypes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, currentTask, onChange, preferences]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleRating('liked');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleRating('disliked');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleRating('neutral');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRating]);

  // Touch/mouse events for swipe simulation
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startY = touch.clientY;
    const startX = touch.clientX;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const currentTouch = moveEvent.touches[0];
      const deltaX = currentTouch.clientX - startX;
      const deltaY = currentTouch.clientY - startY;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        setDragDirection(deltaX > 0 ? 'right' : 'left');
      } else if (deltaY > 50) {
        setDragDirection('down');
      }
    };

    const handleTouchEnd = () => {
      if (dragDirection === 'right') {
        handleRating('liked');
      } else if (dragDirection === 'left') {
        handleRating('disliked');
      } else if (dragDirection === 'down') {
        handleRating('neutral');
      }
      
      setDragDirection(null);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  if (completed === total) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-semibold">All done! 🎉</h2>
        <p className="text-muted-foreground">
          You've rated all task types. Let's finish setting up your profile.
        </p>
        <div className="grid grid-cols-1 gap-2 text-sm">
          {taskTypes.map((task) => (
            <div key={task.id} className="flex justify-between items-center p-2 rounded border">
              <span>{task.title}</span>
              <Badge variant={
                preferences[task.id] === 'liked' ? 'default' : 
                preferences[task.id] === 'disliked' ? 'destructive' : 
                'secondary'
              }>
                {preferences[task.id]}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Which types of tasks do you enjoy?</h2>
        <p className="text-muted-foreground">
          Rate each task type by choosing like, dislike, or neutral
        </p>
        <div className="text-sm text-muted-foreground">
          {completed} of {total} completed
        </div>
      </div>

      <div className="relative flex justify-center h-96">
        {/* Card stack - show current card and next cards behind it */}
        <div className="relative w-full max-w-md">
          {taskTypes.slice(currentIndex, currentIndex + 3).map((task, index) => (
            <Card 
              key={task.id}
              className={`absolute inset-0 transition-all duration-300 ${
                index === 0 
                  ? 'z-30 shadow-lg' 
                  : index === 1 
                    ? 'z-20 transform translate-y-2 scale-95 opacity-70' 
                    : 'z-10 transform translate-y-4 scale-90 opacity-40'
              } ${
                dragDirection === 'right' ? 'transform translate-x-4 rotate-2' :
                dragDirection === 'left' ? 'transform -translate-x-4 -rotate-2' :
                dragDirection === 'down' ? 'transform translate-y-4' : ''
              }`}
              onTouchStart={index === 0 ? handleTouchStart : undefined}
            >
              <CardContent className="p-6 space-y-4">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">{task.title}</h3>
                  <p className="text-muted-foreground font-medium">{task.description}</p>
                  <p className="text-sm text-muted-foreground">{task.examples}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Button alternatives for accessibility */}
      <div className="flex justify-center gap-4">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => handleRating('disliked')}
          aria-label="Mark as disliked"
        >
          Dislike
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRating('neutral')}
          aria-label="Mark as neutral"
        >
          Neutral
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => handleRating('liked')}
          aria-label="Mark as liked"
        >
          Like
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Use the buttons above or arrow keys (←→↓)
      </div>
    </div>
  );
};