import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PiPCard } from './PiPCard';
import { usePiP } from './PiPContext';
import { TaskCardData, GameStateType } from '../GameState';

interface PiPControllerProps {
  tasks: TaskCardData[];
  onComplete: () => void;
  onTaskComplete?: (taskId: string) => void;
  isLoading?: boolean;
  isProcessing?: boolean;
  onLoadingComplete?: () => void;
  gameState: GameStateType;
}

export const PiPController: React.FC<PiPControllerProps> = ({
  tasks,
  onComplete,
  onTaskComplete,
  isLoading,
  isProcessing,
  onLoadingComplete,
  gameState
}) => {
  const { isPiPActive, pipWindow } = usePiP();
  const reactRootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const queryClientRef = useRef<QueryClient | null>(null);

  useEffect(() => {
    if (isPiPActive && pipWindow && !pipWindow.closed) {
      // Create a container div that fills the entire PiP window
      const container = pipWindow.document.createElement('div');
      container.id = 'pip-react-root';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.margin = '0';
      container.style.padding = '0';
      container.style.overflow = 'hidden';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      
      // Clear any existing content and add our container
      pipWindow.document.body.innerHTML = '';
      pipWindow.document.body.appendChild(container);

      // Create React root and render our component with necessary providers
      reactRootRef.current = createRoot(container);
      
      // Create a new QueryClient for the PiP window
      if (!queryClientRef.current) {
        queryClientRef.current = new QueryClient({
          defaultOptions: {
            queries: {
              staleTime: 1000 * 60 * 5, // 5 minutes
              cacheTime: 1000 * 60 * 10, // 10 minutes
            },
          },
        });
      }
      
      reactRootRef.current.render(
        <QueryClientProvider client={queryClientRef.current}>
          <TooltipProvider>
            <PiPCard
              tasks={tasks}
              onComplete={onComplete}
              onTaskComplete={onTaskComplete}
              isLoading={isLoading}
              isProcessing={isProcessing}
              onLoadingComplete={onLoadingComplete}
              pipWindow={pipWindow}
              gameState={gameState}
            />
          </TooltipProvider>
        </QueryClientProvider>
      );

      console.log('Rendered React content in PiP window');

      // Cleanup when the component unmounts or PiP window closes
      return () => {
        if (reactRootRef.current) {
          try {
            reactRootRef.current.unmount();
            reactRootRef.current = null;
          } catch (error) {
            console.warn('Error unmounting React root in PiP window:', error);
          }
        }
      };
    }
  }, [isPiPActive, pipWindow, tasks, onComplete, onTaskComplete, isLoading, isProcessing, onLoadingComplete]);

  // Update the rendered content when props change
  useEffect(() => {
    if (isPiPActive && pipWindow && !pipWindow.closed && reactRootRef.current) {
      reactRootRef.current.render(
        <QueryClientProvider client={queryClientRef.current}>
          <TooltipProvider>
            <PiPCard
              tasks={tasks}
              onComplete={onComplete}
              onTaskComplete={onTaskComplete}
              isLoading={isLoading}
              isProcessing={isProcessing}
              onLoadingComplete={onLoadingComplete}
              pipWindow={pipWindow}
              gameState={gameState}
            />
          </TooltipProvider>
        </QueryClientProvider>
      );
    }
  }, [tasks, onComplete, onTaskComplete, isLoading, isProcessing, onLoadingComplete, isPiPActive, pipWindow]);

  // This component doesn't render anything in the main window
  return null;
};