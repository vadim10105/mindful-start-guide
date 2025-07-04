import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NameStep } from "./NameStep";
import { EnergyTimeSteps } from "./EnergyTimeSteps";
import { TaskPreferenceStep } from "./TaskPreferenceStep";
import { TaskSwipeCards } from "./TaskSwipeCards";
import { ReviewStep } from "./ReviewStep";

type OnboardingData = {
  displayName: string;
  peakEnergyTime: string;
  lowestEnergyTime: string;
  taskStartPreference: string;
  taskPreferences: Record<string, string>;
};

export const OnboardingFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    displayName: "",
    peakEnergyTime: "",
    lowestEnergyTime: "",
    taskStartPreference: "",
    taskPreferences: {},
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  // Check if user is authenticated and already completed onboarding
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.onboarding_completed) {
        navigate('/');
      }
    };
    checkUser();
  }, [navigate]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: data.displayName,
          peak_energy_time: data.peakEnergyTime,
          lowest_energy_time: data.lowestEnergyTime,
          task_start_preference: data.taskStartPreference,
          task_preferences: data.taskPreferences,
          onboarding_completed: true,
        });

      if (error) throw error;

      toast({
        title: "Welcome aboard!",
        description: "Your preferences have been saved successfully.",
      });

      navigate('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to save your preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return data.displayName.trim().length > 0;
      case 2: return data.peakEnergyTime.length > 0;
      case 3: return data.lowestEnergyTime.length > 0;
      case 4: return data.taskStartPreference.length > 0;
      case 5: return Object.keys(data.taskPreferences).length === 7;
      case 6: return true; // Review step is always valid
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="space-y-4">
              <Progress value={progress} className="w-full" />
              <CardTitle className="text-center">
                Step {currentStep} of {totalSteps}
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <NameStep 
                value={data.displayName}
                onChange={(displayName) => updateData({ displayName })}
              />
            )}
            
            {currentStep === 2 && (
              <EnergyTimeSteps
                title="When do you usually have the most energy?"
                value={data.peakEnergyTime}
                onChange={(peakEnergyTime) => updateData({ peakEnergyTime })}
              />
            )}
            
            {currentStep === 3 && (
              <EnergyTimeSteps
                title="When do you usually have the least energy?"
                value={data.lowestEnergyTime}
                onChange={(lowestEnergyTime) => updateData({ lowestEnergyTime })}
              />
            )}
            
            {currentStep === 4 && (
              <TaskPreferenceStep
                value={data.taskStartPreference}
                onChange={(taskStartPreference) => updateData({ taskStartPreference })}
              />
            )}
            
            {currentStep === 5 && (
              <TaskSwipeCards
                preferences={data.taskPreferences}
                onChange={(taskPreferences) => updateData({ taskPreferences })}
              />
            )}
            
            {currentStep === 6 && (
              <ReviewStep
                data={data}
                onEdit={(step) => setCurrentStep(step)}
              />
            )}
            
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                Back
              </Button>
              
              {currentStep < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!canProceed() || isLoading}
                >
                  {isLoading ? "Saving..." : "Complete"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};