import React from 'react';
import { Heart, AlertTriangle, Zap } from "lucide-react";
import { TaskCardData, GameStateType } from './GameState';

interface WhatsAheadMainWindowProps {
  tasks: TaskCardData[];
  gameState: GameStateType;
}

export const WhatsAheadMainWindow = ({ 
  tasks, 
  gameState
}: WhatsAheadMainWindowProps) => {
  return (
    <>
      {/* Dark overlay background */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]" />
      
      <div className="flex-1 flex items-center justify-center p-8 relative z-[95]">
        <div className="rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden backdrop-blur-md" style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div className="overflow-y-auto max-h-[80vh] p-4">
          <div className="space-y-2">
            {tasks.map((task, index) => {
              const isCompleted = gameState.completedTasks.has(task.id);
              const isPaused = gameState.pausedTasks.has(task.id);
              const isActive = index === gameState.activeCommittedIndex;
              const isCurrent = index === gameState.currentViewingIndex;
              // Get time from todaysCompletedTasks (like PiPCard does)
              const completedTask = gameState.todaysCompletedTasks.find(t => t.id === task.id);
              const timeSpent = completedTask?.timeSpent || 0;
              
              return (
                <div key={task.id}>
                  <div
                    className={`group py-4 px-6 transition-all duration-200 rounded-lg ${
                      !isActive ? 'opacity-50' : 'opacity-100'
                    }`}
                    style={{ 
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      border: isActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent'
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                        style={{ 
                          backgroundColor: isCompleted ? 'rgba(34, 197, 94, 0.8)' :
                                        isActive ? 'rgba(251, 191, 36, 0.8)' : 
                                        isPaused ? 'rgba(251, 146, 60, 0.8)' : 'rgba(255, 255, 255, 0.2)',
                          color: isActive || isCompleted || isPaused ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)'
                        }}
                      >
                        {index + 1}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white leading-snug">{task.title}</h3>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <div className="flex items-center gap-1">
                              {task.is_liked && <Heart className="h-4 w-4 fill-red-500 text-red-500" />}
                              {task.is_urgent && <AlertTriangle className="h-4 w-4 fill-yellow-500 text-yellow-500" />}
                              {task.is_quick && <Zap className="h-4 w-4 fill-green-500 text-green-500" />}
                            </div>
                            
                            {task.estimated_time && (
                              <div 
                                className="px-2 py-1 rounded text-xs font-medium"
                                style={{ 
                                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                  color: 'rgba(255, 255, 255, 0.7)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)'
                                }}
                              >
                                {task.estimated_time}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {timeSpent > 0 && (
                          <div className="flex items-center gap-4 text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            <div className="font-medium" style={{ color: 'rgba(147, 197, 253, 0.9)' }}>
                              {timeSpent}min spent
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};