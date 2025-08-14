import { useDroppable } from "@dnd-kit/core";

interface DroppableZoneProps {
  id: string;
  children: React.ReactNode;
}

export const DroppableZone = ({ id, children }: DroppableZoneProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef}
      className={`transition-all duration-200 ${
        isOver ? 'bg-muted/20 rounded-lg min-h-[60px] pb-4' : ''
      }`}
    >
      {children}
    </div>
  );
};