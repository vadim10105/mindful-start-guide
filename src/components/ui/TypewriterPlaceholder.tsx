import { useTypewriter } from '@/hooks/use-typewriter';

interface TypewriterPlaceholderProps {
  isVisible: boolean;
}

export const TypewriterPlaceholder = ({ isVisible }: TypewriterPlaceholderProps) => {
  const { text, showCursor } = useTypewriter();
  
  return (
    <div className={`absolute top-0 left-0 w-full h-full p-3 text-muted-foreground pointer-events-none flex items-start transition-all duration-300 ease-out ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
    }`}>
      <span className="text-base leading-relaxed">
        {text}
        {showCursor && <span className="animate-pulse">|</span>}
      </span>
    </div>
  );
};