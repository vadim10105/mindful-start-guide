import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Brain, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExtractedTask {
  title: string;
  estimated_urgency: 'low' | 'medium' | 'high';
  estimated_effort: 'quick' | 'medium' | 'long';
}

const BrainDumpPage = () => {
  const [brainDumpText, setBrainDumpText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleBrainDumpSubmit = async () => {
    if (!brainDumpText.trim()) {
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-brain-dump', {
        body: { brainDumpText }
      });

      if (error) {
        throw new Error('Failed to process brain dump');
      }

      if (!data?.tasks) {
        throw new Error('No tasks extracted from brain dump');
      }

      localStorage.setItem('extractedTasks', JSON.stringify(data.tasks));
      navigate('/tagging');
      
      toast({
        title: "Brain dump processed!",
        description: `Extracted ${data.tasks.length} tasks`,
      });

    } catch (error: unknown) {
      const err = error as Error;
      let errorMessage = "Failed to process brain dump. Please try again.";
      
      if (err.message.includes("quota") || err.message.includes("billing")) {
        errorMessage = "OpenAI API quota exceeded. Please check your OpenAI billing at platform.openai.com/usage.";
      } else {
        errorMessage = err.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="max-w-4xl mx-auto space-y-6 w-full">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Task Creation</h1>
          <p className="text-muted-foreground">
            Transform your thoughts into organized, prioritized tasks
          </p>
        </div>

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
      </div>
    </div>
  );
};

export default BrainDumpPage;
