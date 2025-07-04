import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface EnergyTimeStepsProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
}

const timeOptions = [
  { value: "morning", label: "Morning (6am–12pm)" },
  { value: "afternoon", label: "Afternoon (12pm–3pm)" },
  { value: "late_afternoon", label: "Late Afternoon (3pm–5pm)" },
  { value: "evening", label: "Evening (5pm–8pm)" },
  { value: "night", label: "Night (8pm–11pm)" },
];

export const EnergyTimeSteps = ({ title, value, onChange }: EnergyTimeStepsProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-muted-foreground">
          Choose the time period that best describes you.
        </p>
      </div>
      
      <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
        {timeOptions.map((option) => (
          <div key={option.value} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <RadioGroupItem value={option.value} id={option.value} />
            <Label htmlFor={option.value} className="flex-1 cursor-pointer">
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};