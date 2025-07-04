import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Brain, Shuffle, ArrowRight, Check, Heart, Clock, Zap, ArrowLeft, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type FlowStep = 'input' | 'processing' | 'review' | 'prioritized' | 'cards';

interface ExtractedTask {
  title: string;
  estimated_urgency: 'low' | 'medium' | 'high';
  estimated_effort: 'quick' | 'medium' | 'long';
}

interface Task {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'skipped';
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  card_position: number;
}

interface PrioritizedTask {
  id: string;
  title: string;
  priority_score: number;
  explanation: string;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  ai_effort: 'quick' | 'medium' | 'long';
}

interface UserProfile {
  task_start_preference?: string;
  task_preferences?: any;
  peak_energy_time?: string;
  lowest_energy_time?: string;
}

interface TaskListItemProps {
  task: string;
  index: number;
  onTaskUpdate: (updatedTask: { is_liked?: boolean; is_urgent?: boolean; is_quick?: boolean }) => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
}

const TaskListItem = ({ task, index, onTaskUpdate, onReorder }: TaskListItemProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isQuick, setIsQuick] = useState(false);

  // Update parent whenever any tag changes
  useEffect(() => {
    onTaskUpdate({ is_liked: isLiked, is_urgent: isUrgent, is_quick: isQuick });
  }, [isLiked, isUrgent, isQuick, onTaskUpdate]);

  return (
    <div className="flex items-center gap-4 p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors">
      {/* Drag Handle */}
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab hover:text-foreground" />
      
      {/* Task Number */}
      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
        {index + 1}
      </div>
      
      {/* Task Title */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-6 text-foreground truncate">
          {task}
        </p>
      </div>
      
      {/* Tag Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`liked-${index}`}
            checked={isLiked}
            onCheckedChange={(checked) => setIsLiked(checked === true)}
            className="data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
          />
          <Label 
            htmlFor={`liked-${index}`} 
            className="text-xs flex items-center gap-1 cursor-pointer"
          >
            <Heart className="h-3 w-3" />
            Love
          </Label>
        </div>
        
        <div className="flex items-center gap-2">
          <Checkbox
            id={`urgent-${index}`}
            checked={isUrgent}
            onCheckedChange={(checked) => setIsUrgent(checked === true)}
            className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
          />
          <Label 
            htmlFor={`urgent-${index}`} 
            className="text-xs flex items-center gap-1 cursor-pointer"
          >
            <Clock className="h-3 w-3" />
            Urgent
          </Label>
        </div>
        
        <div className="flex items-center gap-2">
          <Checkbox
            id={`quick-${index}`}
            checked={isQuick}
            onCheckedChange={(checked) => setIsQuick(checked === true)}
            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
          />
          <Label 
            htmlFor={`quick-${index}`} 
            className="text-xs flex items-center gap-1 cursor-pointer"
          >
            <Zap className="h-3 w-3" />
            Quick
          </Label>
        </div>
      </div>
      
      {/* Visual Tags - No Emojis */}
      <div className="flex gap-1">
        {isLiked && (
          <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700">
            Love
          </Badge>
        )}
        {isUrgent && (
          <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700">
            Urgent
          </Badge>
        )}
        {isQuick && (
          <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-green-100 text-green-700">
            Quick
          </Badge>
        )}
      </div>
    </div>
  );
};

const Tasks = () => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('input');
  const [brainDumpText, setBrainDumpText] = useState("");
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [reviewedTasks, setReviewedTasks] = useState<string[]>([]);
  const [taggedTasks, setTaggedTasks] = useState<Task[]>([]);
  const [prioritizedTasks, setPrioritizedTasks] = useState<PrioritizedTask[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth';
        return;
      }
      setUser(user);
      
      // Fetch user profile for prioritization
      const { data: profile } = await supabase
        .from('profiles')
        .select('task_start_preference, task_preferences, peak_energy_time, lowest_energy_time')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        setUserProfile(profile);
      }
    };
    getUser();
  }, []);

  const handleBrainDumpSubmit = async () => {
    console.log('handleBrainDumpSubmit called with text:', brainDumpText);
    
    if (!brainDumpText.trim()) {
      console.log('No brain dump text provided');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('processing');
    console.log('Set processing state and step to processing');

    try {
      console.log('Calling edge function with brain dump text...');
      
      const { data, error } = await supabase.functions.invoke('process-brain-dump', {
        body: { brainDumpText }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error('Failed to process brain dump');
      }

      if (!data?.tasks) {
        console.error('No tasks in response:', data);
        throw new Error('No tasks extracted from brain dump');
      }

      console.log('Successfully extracted tasks:', data.tasks);
      setExtractedTasks(data.tasks);
      setReviewedTasks(data.tasks.map((task: ExtractedTask) => task.title));
      setCurrentStep('review');
      
      toast({
        title: "Brain dump processed!",
        description: `Extracted ${data.tasks.length} tasks`,
      });

    } catch (error) {
      console.error('Error processing brain dump:', error);
      
      let errorMessage = "Failed to process brain dump. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("quota") || error.message.includes("billing")) {
          errorMessage = "OpenAI API quota exceeded. Please check your OpenAI billing at platform.openai.com/usage.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setCurrentStep('input');
    } finally {
      setIsProcessing(false);
      console.log('Processing finished, set isProcessing to false');
    }
  };

  const resetFlow = () => {
    setCurrentStep('input');
    setBrainDumpText("");
    setExtractedTasks([]);
    setReviewedTasks([]);
    setTaggedTasks([]);
  };

  const handleReorder = (dragIndex: number, hoverIndex: number) => {
    const newTasks = [...reviewedTasks];
    const draggedTask = newTasks[dragIndex];
    newTasks.splice(dragIndex, 1);
    newTasks.splice(hoverIndex, 0, draggedTask);
    setReviewedTasks(newTasks);
  };

  const prioritizeTasks = () => {
    console.log('Starting task prioritization...');
    console.log('User profile:', userProfile);
    console.log('Tagged tasks:', taggedTasks);
    console.log('Extracted tasks:', extractedTasks);

    // Create combined task data with AI info
    const combinedTasks = reviewedTasks.map((taskTitle, index) => {
      const taggedTask = taggedTasks.find(t => t.title === taskTitle);
      const extractedTask = extractedTasks.find(t => t.title === taskTitle);
      
      return {
        id: `temp-${index}`,
        title: taskTitle,
        is_liked: taggedTask?.is_liked || false,
        is_urgent: taggedTask?.is_urgent || false,
        is_quick: taggedTask?.is_quick || false,
        ai_effort: extractedTask?.estimated_effort || 'medium',
        ai_urgency: extractedTask?.estimated_urgency || 'medium'
      };
    });

    // Calculate priority scores
    const scoredTasks = combinedTasks.map(task => {
      let score = 0;
      let explanationParts = [];

      // 1. LIKED TASKS - High priority (+ 30 points)
      if (task.is_liked) {
        score += 30;
        explanationParts.push("💙 You marked this as loved (+30)");
      }

      // 2. URGENT TASKS - High priority (+ 25 points)
      if (task.is_urgent) {
        score += 25;
        explanationParts.push("🔥 Marked as urgent (+25)");
      }

      // 3. QUICK TASKS - Momentum builder (+ 20 points)
      if (task.is_quick) {
        score += 20;
        explanationParts.push("⚡ Quick win for momentum (+20)");
      }

      // 4. AI URGENCY ASSESSMENT (+ 5-15 points)
      if (task.ai_urgency === 'high') {
        score += 15;
        explanationParts.push("🤖 AI detected high urgency (+15)");
      } else if (task.ai_urgency === 'medium') {
        score += 10;
        explanationParts.push("🤖 AI detected medium urgency (+10)");
      } else {
        score += 5;
        explanationParts.push("🤖 AI detected low urgency (+5)");
      }

      // 5. ONBOARDING PREFERENCES
      if (userProfile?.task_start_preference) {
        if (userProfile.task_start_preference === 'easy_first' && task.ai_effort === 'quick') {
          score += 15;
          explanationParts.push("📋 Your preference: easy tasks first (+15)");
        } else if (userProfile.task_start_preference === 'hard_first' && task.ai_effort === 'long') {
          score += 15;
          explanationParts.push("📋 Your preference: hard tasks first (+15)");
        } else if (userProfile.task_start_preference === 'loved_first' && task.is_liked) {
          score += 10;
          explanationParts.push("📋 Your preference: loved tasks first (+10)");
        }
      }

      // 6. EFFORT BALANCE - Prefer quick tasks when no specific preference
      if (!userProfile?.task_start_preference || userProfile.task_start_preference === 'balanced') {
        if (task.ai_effort === 'quick') {
          score += 8;
          explanationParts.push("⚖️ Quick task for momentum (+8)");
        } else if (task.ai_effort === 'medium') {
          score += 5;
          explanationParts.push("⚖️ Medium effort task (+5)");
        } else {
          score += 2;
          explanationParts.push("⚖️ Long task - scheduled later (+2)");
        }
      }

      // 7. COMBINATION BONUSES
      if (task.is_liked && task.is_quick) {
        score += 10;
        explanationParts.push("🎯 Loved + Quick combo bonus (+10)");
      }
      
      if (task.is_urgent && task.is_quick) {
        score += 8;
        explanationParts.push("🔥⚡ Urgent + Quick combo bonus (+8)");
      }

      const explanation = explanationParts.length > 0 
        ? explanationParts.join(" • ")
        : "📊 Base priority scoring applied";

      return {
        id: task.id,
        title: task.title,
        priority_score: score,
        explanation,
        is_liked: task.is_liked,
        is_urgent: task.is_urgent,
        is_quick: task.is_quick,
        ai_effort: task.ai_effort
      };
    });

    // Sort by priority score (highest first)
    const sortedTasks = scoredTasks.sort((a, b) => b.priority_score - a.priority_score);
    
    console.log('Prioritized tasks:', sortedTasks);
    return sortedTasks;
  };

  const handleShuffle = () => {
    console.log('Shuffle button clicked');
    const prioritized = prioritizeTasks();
    setPrioritizedTasks(prioritized);
    setCurrentStep('prioritized');
    
    toast({
      title: "Tasks Prioritized!",
      description: `Organized ${prioritized.length} tasks based on your preferences and tags`,
    });
  };

  const handleManualOrder = async () => {
    await saveTasks();
  };

  const saveTasks = async () => {
    if (!user) return;

    try {
      const tasksToSave = taggedTasks.map((task, index) => ({
        title: task.title,
        user_id: user.id,
        source: 'brain_dump' as const,
        is_liked: task.is_liked,
        is_urgent: task.is_urgent,
        is_quick: task.is_quick,
        card_position: index + 1
      }));

      const { error } = await supabase
        .from('tasks')
        .insert(tasksToSave);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `${taggedTasks.length} tasks saved`,
      });

      setCurrentStep('cards');
    } catch (error) {
      console.error('Error saving tasks:', error);
      toast({
        title: "Error",
        description: "Failed to save tasks",
        variant: "destructive",
      });
    }
  };

  const savePrioritizedTasks = async (tasksToSave: any[]) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .insert(tasksToSave);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `${tasksToSave.length} prioritized tasks saved`,
      });

      setCurrentStep('cards');
    } catch (error) {
      console.error('Error saving prioritized tasks:', error);
      toast({
        title: "Error",
        description: "Failed to save prioritized tasks",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          {currentStep !== 'input' && (
            <Button
              onClick={() => {
                if (currentStep === 'prioritized') {
                  setCurrentStep('review');
                } else {
                  setCurrentStep('input');
                }
              }}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <div className="text-center space-y-4 flex-1">
            <h1 className="text-3xl font-bold">Task Creation</h1>
            <p className="text-muted-foreground">
              Transform your thoughts into organized, prioritized tasks
            </p>
          </div>
        </div>

        {/* Input Step */}
        {currentStep === 'input' && (
          <Card className="border-2 border-dashed border-muted-foreground/30">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                Brain Dump Space
              </CardTitle>
              <p className="text-muted-foreground">
                Just dump everything on your mind here - AI will organize it into tasks
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Let it all out... thoughts, tasks, ideas, anything!\n\nFor example:\nNeed to call mom about dinner this weekend, also grocery shopping for the party, fix that leaky faucet that's been bugging me, send the quarterly report to Sarah by Friday, maybe clean the garage this weekend if I have time..."
                value={brainDumpText}
                onChange={(e) => setBrainDumpText(e.target.value)}
                className="min-h-[250px] resize-none text-base leading-relaxed border-none bg-muted/50 focus:bg-background transition-colors"
                rows={12}
              />
              <Button 
                onClick={handleBrainDumpSubmit}
                disabled={!brainDumpText.trim() || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Brain className="mr-2 h-4 w-4 animate-pulse" />
                    AI is organizing your thoughts...
                  </>
                ) : (
                  <>
                    Make a List
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Processing Step */}
        {currentStep === 'processing' && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="space-y-4">
                <Brain className="h-12 w-12 mx-auto animate-pulse text-primary" />
                <h3 className="text-xl font-semibold">AI is organizing your thoughts...</h3>
                <p className="text-muted-foreground">
                  Extracting actionable tasks from your brain dump
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review & Tag Step */}
        {currentStep === 'review' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Task List - Add Tags ({reviewedTasks.length} tasks)
              </CardTitle>
              <p className="text-muted-foreground">
                Review your tasks, add tags, and drag to reorder
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {reviewedTasks.map((task, index) => (
                  <TaskListItem
                    key={index}
                    task={task}
                    index={index}
                    onReorder={handleReorder}
                    onTaskUpdate={(updatedTask) => {
                      setTaggedTasks(prev => {
                        const updated = [...prev];
                        const existingIndex = updated.findIndex(t => t.id === `temp-${index}`);
                        const newTask: Task = {
                          id: `temp-${index}`,
                          title: task,
                          status: 'active',
                          is_liked: updatedTask.is_liked,
                          is_urgent: updatedTask.is_urgent,
                          is_quick: updatedTask.is_quick,
                          card_position: index + 1
                        };
                        
                        if (existingIndex >= 0) {
                          updated[existingIndex] = newTask;
                        } else {
                          updated.push(newTask);
                        }
                        return updated;
                      });
                    }}
                  />
                ))}
              </div>
              
              {/* Direct Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                <Button
                  onClick={handleShuffle}
                  className="h-24 flex-col gap-2"
                  size="lg"
                >
                  <Shuffle className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold">Shuffle Button</div>
                    <div className="text-xs opacity-90">
                      AI prioritizes based on tags
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={handleManualOrder}
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  size="lg"
                >
                  <Brain className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold">Start in Order</div>
                    <div className="text-xs opacity-90">
                      Keep current order
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prioritized Step - Show AI-ordered list with explanations */}
        {currentStep === 'prioritized' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shuffle className="h-5 w-5" />
                AI-Prioritized Task Order ({prioritizedTasks.length} tasks)
              </CardTitle>
              <p className="text-muted-foreground">
                Here's how I've prioritized your tasks based on your preferences and tags
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {prioritizedTasks.map((task, index) => (
                  <div key={task.id} className="p-4 bg-card border rounded-lg">
                    <div className="flex items-start gap-4">
                      {/* Priority Position */}
                      <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg font-bold">
                        {index + 1}
                      </div>
                      
                      {/* Task Content */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">{task.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            Score: {task.priority_score}
                          </Badge>
                        </div>
                        
                        {/* Tags */}
                        <div className="flex gap-1">
                          {task.is_liked && (
                            <Badge variant="secondary" className="text-xs bg-rose-100 text-rose-700">
                              Love
                            </Badge>
                          )}
                          {task.is_urgent && (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                              Urgent
                            </Badge>
                          )}
                          {task.is_quick && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                              Quick
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            AI: {task.ai_effort} effort
                          </Badge>
                        </div>
                        
                        {/* Explanation */}
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {task.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <Button 
                  onClick={() => {
                    // Save prioritized tasks to database
                    const tasksToSave = prioritizedTasks.map((task, index) => ({
                      title: task.title,
                      user_id: user.id,
                      source: 'brain_dump' as const,
                      is_liked: task.is_liked,
                      is_urgent: task.is_urgent,
                      is_quick: task.is_quick,
                      ai_priority_score: task.priority_score,
                      card_position: index + 1
                    }));
                    savePrioritizedTasks(tasksToSave);
                  }}
                  className="flex-1" 
                  size="lg"
                >
                  Save This Order
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  onClick={() => setCurrentStep('review')} 
                  variant="outline"
                  size="lg"
                >
                  Adjust Tags
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cards Step */}
        {currentStep === 'cards' && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="space-y-4">
                <Check className="h-12 w-12 mx-auto text-green-500" />
                <h3 className="text-xl font-semibold">Tasks Created Successfully!</h3>
                <p className="text-muted-foreground">
                  Your tasks have been organized and are ready to work on.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={resetFlow} variant="outline">
                    Create More Tasks
                  </Button>
                  <Button onClick={() => window.location.href = '/tasks/cards'}>
                    Start Working
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Tasks;