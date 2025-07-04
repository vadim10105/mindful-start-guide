import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Brain, List, Shuffle, ArrowRight, Edit3, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type FlowStep = 'input' | 'processing' | 'review' | 'tagging' | 'ordering' | 'cards';

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

const Tasks = () => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('input');
  const [isManualMode, setIsManualMode] = useState(false);
  const [brainDumpText, setBrainDumpText] = useState("");
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [reviewedTasks, setReviewedTasks] = useState<string[]>([]);
  const [taggedTasks, setTaggedTasks] = useState<Task[]>([]);
  const [currentTagIndex, setCurrentTagIndex] = useState(0);
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
    if (!brainDumpText.trim()) return;

    setIsProcessing(true);
    setCurrentStep('processing');

    try {
      const { data, error } = await supabase.functions.invoke('process-brain-dump', {
        body: { brainDumpText }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error('Failed to process brain dump');
      }

      if (!data?.tasks) {
        throw new Error('No tasks extracted from brain dump');
      }

      setExtractedTasks(data.tasks);
      setReviewedTasks(data.tasks.map((task: ExtractedTask) => task.title));
      setCurrentStep('review');
      
      toast({
        title: "Brain dump processed!",
        description: `Extracted ${data.tasks.length} tasks`,
      });

    } catch (error) {
      console.error('Error processing brain dump:', error);
      toast({
        title: "Error",
        description: "Failed to process brain dump. Please try again.",
        variant: "destructive",
      });
      setCurrentStep('input');
    } finally {
      setIsProcessing(false);
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

  const proceedToTagging = () => {
    setCurrentStep('tagging');
    setCurrentTagIndex(0);
  };

  const handleTaskTag = (isLiked: boolean, isUrgent: boolean, isQuick: boolean) => {
    const currentTask = reviewedTasks[currentTagIndex];
    const newTask: Task = {
      id: `temp-${currentTagIndex}`,
      title: currentTask,
      status: 'active' as const,
      is_liked: isLiked,
      is_urgent: isUrgent,
      is_quick: isQuick,
      card_position: currentTagIndex + 1
    };

    setTaggedTasks(prev => [...prev, newTask]);

    if (currentTagIndex < reviewedTasks.length - 1) {
      setCurrentTagIndex(prev => prev + 1);
    } else {
      setCurrentStep('ordering');
    }
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

  const resetFlow = () => {
    setCurrentStep('input');
    setBrainDumpText("");
    setExtractedTasks([]);
    setReviewedTasks([]);
    setTaggedTasks([]);
    setCurrentTagIndex(0);
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {isManualMode ? <List className="h-5 w-5" /> : <Brain className="h-5 w-5" />}
                  {isManualMode ? "Create Task List" : "Brain Dump"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="mode-toggle">List Mode</Label>
                  <Switch 
                    id="mode-toggle"
                    checked={isManualMode}
                    onCheckedChange={setIsManualMode}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={isManualMode 
                  ? "Enter your tasks, one per line:\n• Call mom\n• Buy groceries\n• Fix leaky faucet"
                  : "Just dump everything on your mind here...\n\nNeed to call mom, also grocery shopping for dinner party this weekend, fix the leaky faucet sometime, send that report to Sarah by friday..."
                }
                value={brainDumpText}
                onChange={(e) => setBrainDumpText(e.target.value)}
                className="min-h-[200px] resize-none"
                rows={8}
              />
              <Button 
                onClick={isManualMode ? handleManualSubmit : handleBrainDumpSubmit}
                disabled={!brainDumpText.trim() || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? "Processing..." : isManualMode ? "Create List" : "Make a List"}
                <ArrowRight className="ml-2 h-4 w-4" />
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

        {/* Review Step */}
        {currentStep === 'review' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Review & Edit Tasks ({reviewedTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {reviewedTasks.map((task, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="flex-1">{task}</span>
                    <Button variant="ghost" size="sm">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button onClick={proceedToTagging} className="w-full" size="lg">
                Tag Tasks
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tagging Step */}
        {currentStep === 'tagging' && (
          <Card>
            <CardHeader>
              <CardTitle>
                Tag Task ({currentTagIndex + 1} of {reviewedTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center p-6 bg-muted rounded-lg">
                <h3 className="text-xl font-semibold mb-2">
                  {reviewedTasks[currentTagIndex]}
                </h3>
                <p className="text-muted-foreground">
                  How do you feel about this task?
                </p>
              </div>

              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="font-medium">Choose all that apply:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline">1. If you love the task</Badge>
                    <Badge variant="outline">2. If it's urgent</Badge>
                    <Badge variant="outline">3. If it's quick</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => handleTaskTag(true, false, false)}
                  >
                    <span className="text-2xl">❤️</span>
                    <span>Love It</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => handleTaskTag(false, true, false)}
                  >
                    <span className="text-2xl">🔥</span>
                    <span>Urgent</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => handleTaskTag(false, false, true)}
                  >
                    <span className="text-2xl">⚡</span>
                    <span>Quick</span>
                  </Button>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => handleTaskTag(true, true, false)}
                  >
                    <span className="text-2xl">🚀</span>
                    <span>Love + Urgent</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => handleTaskTag(true, false, true)}
                  >
                    <span className="text-2xl">💖</span>
                    <span>Love + Quick</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => handleTaskTag(false, true, true)}
                  >
                    <span className="text-2xl">⚡🔥</span>
                    <span>Urgent + Quick</span>
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => handleTaskTag(false, false, false)}
                >
                  Skip (No special tags)
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