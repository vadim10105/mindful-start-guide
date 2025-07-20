
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Minus } from "lucide-react";

const taskCategories = [
  {
    id: "creative_work",
    title: "Creative Work",
    description: "Designing, writing, brainstorming, creating content",
    examples: ["Design a logo", "Write a blog post", "Create a presentation"]
  },
  {
    id: "data_analysis", 
    title: "Data Analysis",
    description: "Research, analysis, problem-solving, technical work",
    examples: ["Analyze sales data", "Debug code", "Research competitors"]
  },
  {
    id: "team_meetings",
    title: "Team Meetings",
    description: "Meetings, calls, collaboration, communication",
    examples: ["Team standup", "Client call", "Project discussion"]
  },
  {
    id: "physical_tasks",
    title: "Physical Tasks", 
    description: "Hands-on work, exercise, manual activities",
    examples: ["Organize office", "Equipment setup", "Exercise routine"]
  },
  {
    id: "admin_work",
    title: "Admin Work",
    description: "Documentation, filing, routine administrative tasks",
    examples: ["Update spreadsheet", "File documents", "Process invoices"]
  },
  {
    id: "learning_new_skills",
    title: "Learning New Skills",
    description: "Training, courses, skill development, reading",
    examples: ["Take online course", "Read industry articles", "Practice new skill"]
  },
  {
    id: "project_planning",
    title: "Project Planning",
    description: "Strategy, planning, organizing, goal setting",
    examples: ["Plan project timeline", "Set goals", "Create roadmap"]
  }
];

interface TaskSwipeCardsProps {
  preferences: Record<string, string>;
  onChange: (preferences: Record<string, string>) => void;
}

export const TaskSwipeCards = ({ preferences, onChange }: TaskSwipeCardsProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const currentTask = taskCategories[currentIndex];
  
  const handlePreference = (preference: 'liked' | 'neutral' | 'disliked') => {
    const newPreferences = {
      ...preferences,
      [currentTask.id]: preference
    };
    onChange(newPreferences);
    
    if (currentIndex < taskCategories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < taskCategories.length - 1;
  const isComplete = Object.keys(preferences).length === taskCategories.length;
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">How do you feel about these types of tasks?</h2>
        <p className="text-muted-foreground">
          Swipe through each category and let us know your preference
        </p>
        <div className="text-sm text-muted-foreground">
          {currentIndex + 1} of {taskCategories.length}
        </div>
      </div>
      
      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">{currentTask.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              {currentTask.description}
            </p>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Examples:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {currentTask.examples.map((example, index) => (
                  <li key={index}>• {example}</li>
                ))}
              </ul>
            </div>
            
            <div className="flex justify-center gap-4 pt-4">
              <Button
                variant={preferences[currentTask.id] === 'disliked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePreference('disliked')}
                className="flex items-center gap-2"
              >
                <ThumbsDown className="w-4 h-4" />
                Dislike
              </Button>
              
              <Button
                variant={preferences[currentTask.id] === 'neutral' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePreference('neutral')}
                className="flex items-center gap-2"
              >
                <Minus className="w-4 h-4" />
                Neutral
              </Button>
              
              <Button
                variant={preferences[currentTask.id] === 'liked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePreference('liked')}
                className="flex items-center gap-2"
              >
                <ThumbsUp className="w-4 h-4" />
                Like
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={!canGoBack}
        >
          Previous
        </Button>
        
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(Math.min(taskCategories.length - 1, currentIndex + 1))}
          disabled={!canGoForward}
        >
          Next
        </Button>
      </div>
      
      {isComplete && (
        <div className="text-center text-green-600 font-medium">
          All preferences set! You can proceed to the next step.
        </div>
      )}
    </div>
  );
};
