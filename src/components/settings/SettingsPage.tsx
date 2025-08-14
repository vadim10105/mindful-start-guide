
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type UserProfile = {
  display_name: string;
  peak_energy_time: string;
  lowest_energy_time: string;
  task_start_preference: string;
  task_preferences: Record<string, string>;
};

const timeOptions = [
  { value: "morning", label: "Morning (6am–12pm)" },
  { value: "afternoon", label: "Afternoon (12pm–3pm)" },
  { value: "late_afternoon", label: "Late Afternoon (3pm–5pm)" },
  { value: "evening", label: "Evening (5pm–8pm)" },
  { value: "night", label: "Night (8pm–11pm)" },
];

const taskPreferences = [
  { value: "easier_first", label: "Start with easier tasks to build momentum" },
  { value: "hardest_first", label: "Tackle the hardest task first and get it over with" },
  { value: "not_sure", label: "I'm not sure..." },
];

// Updated to match onboarding task categories
const taskTypes = [
  { id: "creative_work", title: "Creative Work" },
  { id: "data_analysis", title: "Data Analysis" },
  { id: "team_meetings", title: "Team Meetings" },
  { id: "physical_tasks", title: "Physical Tasks" },
  { id: "admin_work", title: "Admin Work" },
  { id: "learning_new_skills", title: "Learning New Skills" },
  { id: "project_planning", title: "Project Planning" },
  { id: "technical_work", title: "Technical Work" }
];

export const SettingsPage = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, peak_energy_time, lowest_energy_time, task_start_preference, task_preferences')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProfile({
            ...data,
            task_preferences: data.task_preferences as Record<string, string> || {}
          });
        } else {
          navigate('/onboarding');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast({
          title: "Error",
          description: "Failed to load your profile.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [navigate, toast]);

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name,
          peak_energy_time: profile.peak_energy_time,
          lowest_energy_time: profile.lowest_energy_time,
          task_start_preference: profile.task_start_preference,
          task_preferences: profile.task_preferences,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save your settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateTaskPreference = (taskId: string, rating: string) => {
    if (!profile) return;
    
    setProfile({
      ...profile,
      task_preferences: {
        ...profile.task_preferences,
        [taskId]: rating
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div>Loading your settings...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div>No profile found. Please complete onboarding first.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Settings</h1>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Peak Energy Time</h3>
              <RadioGroup
                value={profile.peak_energy_time}
                onValueChange={(value) => setProfile({ ...profile, peak_energy_time: value })}
              >
                {timeOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`peak-${option.value}`} />
                    <Label htmlFor={`peak-${option.value}`}>{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Lowest Energy Time</h3>
              <RadioGroup
                value={profile.lowest_energy_time}
                onValueChange={(value) => setProfile({ ...profile, lowest_energy_time: value })}
              >
                {timeOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`low-${option.value}`} />
                    <Label htmlFor={`low-${option.value}`}>{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Task Approach Preference</h3>
              <RadioGroup
                value={profile.task_start_preference}
                onValueChange={(value) => setProfile({ ...profile, task_start_preference: value })}
              >
                {taskPreferences.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`pref-${option.value}`} />
                    <Label htmlFor={`pref-${option.value}`}>{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Task Type Preferences</h3>
              <div className="space-y-3">
                {taskTypes.map((task) => (
                  <div key={task.id} className="flex justify-between items-center p-3 border rounded">
                    <span className="font-medium">{task.title}</span>
                    <div className="flex gap-2">
                      {['disliked', 'neutral', 'liked'].map((rating) => (
                        <Button
                          key={rating}
                          size="sm"
                          variant={profile.task_preferences[task.id] === rating ? 'default' : 'outline'}
                          onClick={() => updateTaskPreference(task.id, rating)}
                        >
                          {rating}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
