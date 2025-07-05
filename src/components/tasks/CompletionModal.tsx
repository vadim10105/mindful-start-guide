import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Clock } from "lucide-react";

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  timeSpent: number;
  onAddToCollection: () => void;
  formatTime: (minutes: number) => string;
}

export const CompletionModal = ({
  isOpen,
  onClose,
  taskTitle,
  timeSpent,
  onAddToCollection,
  formatTime
}: CompletionModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="h-6 w-6 text-primary" />
            Task Complete!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="font-semibold mb-2">{taskTitle}</h3>
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary">
              <Clock className="h-6 w-6" />
              {formatTime(timeSpent)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Time spent in focused work
            </p>
          </div>
          
          <div className="flex justify-center">
            <Button 
              onClick={onAddToCollection}
              className="px-8 bg-primary hover:bg-primary/90"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Add to Collection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};