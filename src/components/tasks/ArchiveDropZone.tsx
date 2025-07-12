import { useDroppable } from "@dnd-kit/core";
import { Archive, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ArchiveDropZoneProps {
  isCollapsed: boolean;
  onToggle: () => void;
  archivedCount: number;
  isDragOver: boolean;
}

export const ArchiveDropZone = ({ 
  isCollapsed, 
  onToggle, 
  archivedCount,
  isDragOver 
}: ArchiveDropZoneProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'archive-zone',
  });

  return (
    <div className="mt-8 border-t pt-6">
      {/* Archive Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <Archive className="w-4 h-4" />
          <span className="font-medium">Archive</span>
          {archivedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {archivedCount}
            </Badge>
          )}
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Drop Zone - Only show when no archived tasks */}
      {!isCollapsed && archivedCount === 0 && (
        <div
          ref={setNodeRef}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all
            ${(isOver || isDragOver)
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50'
            }
          `}
        >
          <Archive className={`w-8 h-8 mx-auto mb-2 ${(isOver || isDragOver) ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="font-medium">
            {(isOver || isDragOver) ? 'Drop to Archive' : 'Drag tasks here to archive'}
          </p>
          <p className="text-sm mt-1 opacity-75">
            Archived tasks will be stored for future reference
          </p>
        </div>
      )}

      {/* Invisible drop zone when tasks exist - for drag functionality */}
      {!isCollapsed && archivedCount > 0 && (
        <div
          ref={setNodeRef}
          className="h-0 w-full"
        />
      )}
    </div>
  );
};