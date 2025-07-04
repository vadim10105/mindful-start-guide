import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface TaskPreferenceStepProps {
  value: string;
  onChange: (value: string) => void;
}

const preferences = [
  {
    value: "easier_first",
    label: "Start with easier tasks to build momentum",
    description: "Work your way up to the bigger challenges"
  },
  {
    value: "hardest_first",
    label: "Tackle the hardest task first and get it over with",
    description: "Get the biggest challenge out of the way early"
  },
  {
    value: "not_sure",
    label: "I'm not sure...",
    description: "Still figuring out what works best for me"
  },
];

export const TaskPreferenceStep = ({ value, onChange }: TaskPreferenceStepProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">How do you prefer to approach your tasks?</h2>
        <p className="text-muted-foreground">
          Everyone has a different strategy that works for them.
        </p>
      </div>
      
      <RadioGroup value={value} onValueChange={onChange} className="space-y-4">
        {preferences.map((preference) => (
          <div key={preference.value} className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
            <RadioGroupItem value={preference.value} id={preference.value} className="mt-1" />
            <div className="flex-1">
              <Label htmlFor={preference.value} className="cursor-pointer block">
                <div className="font-medium">{preference.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{preference.description}</div>
              </Label>
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};