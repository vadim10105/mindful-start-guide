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
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="shadow-xl rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
        <div className="overflow-y-auto max-h-[80vh] p-4">
          <div className="space-y-2">
            {tasks.map((task, index) => {
              const isCompleted = gameState.completedTasks.has(task.id);
              const isPaused = gameState.pausedTasks.has(task.id);
              const isActive = index === gameState.activeCommittedIndex;
              const isCurrent = index === gameState.currentViewingIndex;
              const startTime = gameState.taskStartTimes[task.id];
              const timeSpent = startTime ? Math.round((Date.now() - startTime) / 60000) : 0;
              
              return (
                <div key={task.id}>
                  <div
                    className={`group py-4 px-6 transition-all duration-200 rounded-lg ${
                      !isActive ? 'opacity-50' : 'opacity-100'
                    }`}
                    style={{ 
                      backgroundColor: isActive ? 'rgba(250, 204, 21, 0.1)' : 'transparent'
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                        style={{ 
                          backgroundColor: isCompleted ? '#16a34a' :
                                        isActive ? '#facc15' : 
                                        isPaused ? '#fb923c' : '#606060',
                          color: isActive || isCompleted || isPaused ? '#000' : '#fff'
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
                                  backgroundColor: '#404040',
                                  color: '#a0a0a0'
                                }}
                              >
                                {task.estimated_time}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {timeSpent > 0 && (
                          <div className="flex items-center gap-4 text-sm mb-1" style={{ color: '#a0a0a0' }}>
                            <div className="text-blue-400 font-medium">
                              {timeSpent}min spent
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {index < tasks.length - 1 && (
                    <div 
                      className="h-px mx-6" 
                      style={{ backgroundColor: '#404040' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};