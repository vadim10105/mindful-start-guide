import { useNotesTypewriter } from '@/hooks/use-notes-typewriter';

interface NotesTypewriterPlaceholderProps {
  isVisible: boolean;
  taskStartTime?: Date;
}

export const NotesTypewriterPlaceholder = ({ isVisible, taskStartTime }: NotesTypewriterPlaceholderProps) => {
  const { text, showCursor } = useNotesTypewriter(taskStartTime);
  
  return (
    <div className={`absolute top-0 left-0 w-full h-full p-3 text-muted-foreground pointer-events-none flex items-start justify-center text-center transition-all duration-300 ease-out ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
    }`}>
      <span className="!text-sm leading-relaxed text-[#989898]">
        {text}
        <span className="inline-block w-2 animate-pulse">{showCursor ? '|' : '\u00A0'}</span>
      </span>
    </div>
  );
};