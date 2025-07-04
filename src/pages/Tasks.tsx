import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Brain, List, Shuffle, ArrowRight, Edit3, Check, X, Heart, Clock, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type FlowStep = 'input' | 'processing' | 'review' | 'ordering' | 'cards';

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

interface TaskListItemProps {
  task: string;
  index: number;
  onTaskUpdate: (updatedTask: { is_liked?: boolean; is_urgent?: boolean; is_quick?: boolean }) => void;
}

const TaskListItem = ({ task, index, onTaskUpdate }: TaskListItemProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isQuick, setIsQuick] = useState(false);

  // Update parent whenever any tag changes
  useEffect(() => {
    onTaskUpdate({ is_liked: isLiked, is_urgent: isUrgent, is_quick: isQuick });
  }, [isLiked, isUrgent, isQuick, onTaskUpdate]);

  return (
    <div className="flex items-center gap-4 p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors">
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
      
      {/* Visual Tags */}
      <div className="flex gap-1">
        {isLiked && (
          <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700">
            ❤️
          </Badge>
        )}
        {isUrgent && (
          <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700">
            🔥
          </Badge>
        )}
        {isQuick && (
          <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-green-100 text-green-700">
            ⚡
          </Badge>
        )}
      </div>
    </div>
  );
};

const Tasks = () => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('input');
  const [isManualMode, setIsManualMode] = useState(false);
  const [brainDumpText, setBrainDumpText] = useState("");
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [reviewedTasks, setReviewedTasks] = useState<string[]>([]);
  const [taggedTasks, setTaggedTasks] = useState<Task[]>([]);
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
          errorMessage = "OpenAI API quota exceeded. Please check your OpenAI billing at platform.openai.com/usage or use Task List mode instead.";
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

  const handleManualSubmit = () => {
    if (!brainDumpText.trim()) return;
    
    // Split by lines and filter out empty lines
    const tasks = brainDumpText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(title => ({
        title,
        estimated_urgency: 'medium' as const,
        estimated_effort: 'medium' as const
      }));

    setExtractedTasks(tasks);
    setReviewedTasks(tasks.map(task => task.title));
    setCurrentStep('review');
  };

  const resetFlow = () => {
    setCurrentStep('input');
    setBrainDumpText("");
    setExtractedTasks([]);
    setReviewedTasks([]);
    setTaggedTasks([]);
  };

  const handleShuffle = async () => {
    // TODO: Implement AI shuffle logic based on user preferences
    // For now, just save tasks to database
    await saveTasks();
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Task Creation</h1>
          <p className="text-muted-foreground">
            Transform your thoughts into organized, prioritized tasks
          </p>
        </div>

        {/* Input Step */}
        {currentStep === 'input' && (
          <div className="space-y-6">
            {/* Mode Toggle */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-center gap-4">
                  <div className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                    !isManualMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}>
                    <Brain className="h-5 w-5" />
                    <span className="font-medium">Brain Dump</span>
                  </div>
                  <Switch 
                    checked={isManualMode}
                    onCheckedChange={setIsManualMode}
                  />
                  <div className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                    isManualMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}>
                    <List className="h-5 w-5" />
                    <span className="font-medium">Task List</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Brain Dump Interface */}
            {!isManualMode && (
              <Card className="border-2 border-dashed border-muted-foreground/30">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Brain className="h-6 w-6 text-primary" />
                    Brain Dump Space
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Just dump everything on your mind here - don't worry about structure
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

            {/* Task List Interface */}
            {isManualMode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <List className="h-5 w-5" />
                    Create Task List
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Enter your tasks in a structured format, one per line
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-list">Task List</Label>
                    <Textarea
                      id="task-list"
                      placeholder="• Call mom about weekend dinner&#10;• Buy groceries for dinner party&#10;• Fix leaky faucet in kitchen&#10;• Send quarterly report to Sarah"
                      value={brainDumpText}
                      onChange={(e) => setBrainDumpText(e.target.value)}
                      className="min-h-[200px] resize-none font-mono"
                      rows={10}
                    />
                  </div>
                  <Button 
                    onClick={handleManualSubmit}
                    disabled={!brainDumpText.trim()}
                    className="w-full"
                    size="lg"
                  >
                    Create List
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
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
                <List className="h-5 w-5" />
                Task List - Add Tags ({reviewedTasks.length} tasks)
              </CardTitle>
              <p className="text-muted-foreground">
                Review your tasks and add tags to help prioritize them
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {reviewedTasks.map((task, index) => (
                  <TaskListItem
                    key={index}
                    task={task}
                    index={index}
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
              
              <div className="flex gap-4 pt-6">
                <Button 
                  onClick={() => setCurrentStep('ordering')} 
                  className="flex-1" 
                  size="lg"
                >
                  Continue to Prioritization
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  onClick={resetFlow} 
                  variant="outline"
                  size="lg"
                >
                  Start Over
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ordering Step */}
        {currentStep === 'ordering' && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Approach</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">How would you like to tackle your tasks?</h3>
                <p className="text-muted-foreground">
                  Our AI can shuffle based on your preferences to reduce decision fatigue
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={handleShuffle}
                  className="h-32 flex-col gap-4 text-left"
                  size="lg"
                >
                  <Shuffle className="h-8 w-8" />
                  <div>
                    <div className="font-semibold">Shuffle Button</div>
                    <div className="text-sm opacity-90">
                      AI prioritizes based on tags + your preferences to reduce decision fatigue
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={handleManualOrder}
                  variant="outline"
                  className="h-32 flex-col gap-4 text-left"
                  size="lg"
                >
                  <List className="h-8 w-8" />
                  <div>
                    <div className="font-semibold">Start in Order</div>
                    <div className="text-sm opacity-90">
                      Keep your tasks in the current order for manual control
                    </div>
                  </div>
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