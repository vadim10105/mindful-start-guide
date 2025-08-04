
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit } from "lucide-react";

interface ReviewStepProps {
  data: {
    displayName: string;
    peakEnergyTime: string;
    lowestEnergyTime: string;
    taskStartPreference: string;
    taskPreferences: Record<string, string>;
  };
  onEdit: (step: number) => void;
}

// Updated to match TaskSwipeCards categories
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

export const ReviewStep = ({ data, onEdit }: ReviewStepProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Review Your Profile</h2>
        <p className="text-muted-foreground">
          Check your preferences and make any changes before finishing
        </p>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Display Name</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onEdit(1)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{data.displayName}</p>
          </CardContent>
        </Card>

        {/* Energy Times */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Energy Patterns</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(2)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Peak Energy: </span>
              <span className="font-medium">{data.peakEnergyTime}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Lowest Energy: </span>
              <span className="font-medium">{data.lowestEnergyTime}</span>
            </div>
          </CardContent>
        </Card>

        {/* Task Start Preference */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Task Start Preference</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onEdit(4)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{data.taskStartPreference}</p>
          </CardContent>
        </Card>

        {/* Task Preferences */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Task Preferences</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onEdit(5)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {taskTypes.map((task) => (
                <div key={task.id} className="flex justify-between items-center">
                  <span className="text-sm">{task.title}</span>
                  <Badge variant={
                    data.taskPreferences[task.id] === 'liked' ? 'default' : 
                    data.taskPreferences[task.id] === 'disliked' ? 'destructive' : 
                    'secondary'
                  }>
                    {data.taskPreferences[task.id]}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
