import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NameStepProps {
  value: string;
  onChange: (value: string) => void;
}

export const NameStep = ({ value, onChange }: NameStepProps) => {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">What is your name?</h2>
        <p className="text-muted-foreground">
          We'd love to know what to call you!
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="displayName">Your name</Label>
        <Input
          id="displayName"
          type="text"
          placeholder="Enter your name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-lg"
          autoFocus
        />
      </div>
    </div>
  );
};