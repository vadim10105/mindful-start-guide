import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PiPCard } from './PiPCard';
import { usePiP } from './PiPContext';
import { TaskCardData, GameStateType } from '../GameState';

interface PiPControllerProps {
  tasks: TaskCardData[];
  onComplete: () => void;
  onTaskComplete?: (taskId: string) => Promise<void>;
  onMadeProgress?: (taskId: string) => Promise<void>;
  onPauseTask?: (taskId: string) => Promise<void>;
  onCommitToCurrentTask?: () => void;
  onCarryOn?: (taskId: string) => void;
  onSkip?: (taskId: string) => Promise<void>;
  isLoading?: boolean;
  isProcessing?: boolean;
  onLoadingComplete?: () => void;
  gameState: GameStateType;
}

export const PiPController: React.FC<PiPControllerProps> = ({
  tasks,
  onComplete,
  onTaskComplete,
  onMadeProgress,
  onPauseTask,
  onCommitToCurrentTask,
  onCarryOn,
  onSkip,
  isLoading,
  isProcessing,
  onLoadingComplete,
  gameState
}) => {
  const { isPiPActive, pipWindow } = usePiP();
  const reactRootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const queryClientRef = useRef<QueryClient | null>(null);
  const renderedWindow = useRef<Window | null>(null);

  // Create PiP window and setup
  useEffect(() => {
    if (isPiPActive && pipWindow && !pipWindow.closed && renderedWindow.current !== pipWindow) {
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

      // Create React root
      reactRootRef.current = createRoot(container);
      
      // Create a new QueryClient for the PiP window
      queryClientRef.current = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            cacheTime: 1000 * 60 * 10, // 10 minutes
          },
        },
      });

      renderedWindow.current = pipWindow;
      console.log('Set up PiP window');

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
        queryClientRef.current = null;
        renderedWindow.current = null;
      };
    }
  }, [isPiPActive, pipWindow]);

  // Update PiP content when state changes
  useEffect(() => {
    if (isPiPActive && pipWindow && !pipWindow.closed && reactRootRef.current && queryClientRef.current) {
      reactRootRef.current.render(
        <QueryClientProvider client={queryClientRef.current}>
          <TooltipProvider>
            <PiPCard
              tasks={tasks}
              onComplete={onComplete}
              onTaskComplete={onTaskComplete}
              onMadeProgress={onMadeProgress}
              onPauseTask={onPauseTask}
              onCommitToCurrentTask={onCommitToCurrentTask}
              onCarryOn={onCarryOn}
              onSkip={onSkip}
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
  }, [isPiPActive, pipWindow, tasks, gameState, isLoading, isProcessing]);

  // This component doesn't render anything in the main window
  return null;
};