import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut } from "lucide-react";

type UserProfile = {
  display_name: string;
  peak_energy_time: string;
  lowest_energy_time: string;
  task_start_preference: string;
  task_preferences: Record<string, string>;
};

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

const taskTypes = [
  { id: "creative_work", title: "Creative Work" },
  { id: "data_analysis", title: "Data Analysis" },
  { id: "team_meetings", title: "Team Meetings" },
  { id: "physical_tasks", title: "Physical Tasks" },
  { id: "admin_work", title: "Admin Work" },
  { id: "learning_new_skills", title: "Learning New Skills" },
  { id: "project_planning", title: "Project Planning" }
];

export const SettingsModal = ({ open, onOpenChange }: SettingsModalProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
  }, [toast]);

  useEffect(() => {
    if (open) {
      loadProfile();
    }
  }, [open, loadProfile]);

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
      onOpenChange(false);
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      onOpenChange(false);
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error",
        description: "Failed to log out.",
        variant: "destructive",
      });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div>Loading your settings...</div>
            </div>
          ) : !profile ? (
            <div className="flex items-center justify-center py-8">
              <div>No profile found. Please complete onboarding first.</div>
            </div>
          ) : (
            <div className="space-y-6">
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
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2 mr-auto"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !profile}
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};