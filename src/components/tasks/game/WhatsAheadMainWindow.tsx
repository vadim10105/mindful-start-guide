import React, { useState, useEffect } from 'react';
import { Heart, AlertTriangle, Zap, Sparkles } from "lucide-react";
import { TaskCardData, GameStateType } from './GameState';
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { parseTimeToMinutes } from "@/utils/timeUtils";

interface WhatsAheadMainWindowProps {
  tasks: TaskCardData[];
  gameState: GameStateType;
}

export const WhatsAheadMainWindow = ({ 
  tasks, 
  gameState
}: WhatsAheadMainWindowProps) => {
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Fetch user profile for energy times
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('peak_energy_time, lowest_energy_time, task_preferences, target_hours')
          .eq('user_id', user.id)
          .single();
        setUserProfile(data);
      }
    };
    fetchProfile();
  }, []);
  
  // Fetch AI explanation if tasks were shuffled
  const { data: explanation, isLoading: isLoadingExplanation } = useQuery({
    queryKey: ['task-order-explanation', tasks.map(t => t.id).join(','), gameState.wasShuffled],
    queryFn: async () => {
      if (!gameState.wasShuffled) return null;
      
      // Calculate finish time on client side with user's timezone
      const totalMinutes = tasks.reduce((sum, task) => {
        const minutes = task.estimated_time ? parseTimeToMinutes(task.estimated_time) || 30 : 30;
        return sum + minutes;
      }, 0);
      
      const sessionHoursRounded = Math.round(totalMinutes/60);
      
      // Add breaks: roughly 10-15 min break per hour of work
      const breakMinutes = sessionHoursRounded <= 1 ? 0 : 
                          sessionHoursRounded <= 2 ? 15 :
                          sessionHoursRounded <= 3 ? 30 :
                          sessionHoursRounded <= 4 ? 45 :
                          60; // For 4+ hour sessions
      
      const totalTimeWithBreaks = totalMinutes + breakMinutes;
      const now = new Date();
      const finishTime = new Date(now.getTime() + totalTimeWithBreaks * 60 * 1000);
      
      // Round to nearest half hour
      const minutes = finishTime.getMinutes();
      const roundedMinutes = Math.round(minutes / 30) * 30;
      finishTime.setMinutes(roundedMinutes);
      
      // If rounding pushed us to the next hour, adjust
      if (roundedMinutes === 60) {
        finishTime.setMinutes(0);
        finishTime.setHours(finishTime.getHours() + 1);
      }
      
      const finishTimeString = finishTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      const { data, error } = await supabase.functions.invoke('explain-task-order', {
        body: {
          tasks: tasks.map((task, index) => ({
            title: task.title,
            position: index + 1,
            score: task.priority_score,
            is_liked: task.is_liked || false,
            is_urgent: task.is_urgent || false,
            is_quick: task.is_quick || false,
            category: task.category,
            estimated_minutes: task.estimated_time ? parseTimeToMinutes(task.estimated_time) || 30 : 30
          })),
          userPreferences: userProfile?.task_preferences || {},
          peakEnergyTime: userProfile?.peak_energy_time,
          lowestEnergyTime: userProfile?.lowest_energy_time,
          targetHours: userProfile?.target_hours,
          isShuffled: gameState.wasShuffled,
          clientFinishTime: finishTimeString // Pass calculated finish time
        }
      });
      
      if (error) {
        console.error('Error fetching task explanation:', error);
        return null;
      }
      
      return data?.explanation;
    },
    enabled: gameState.wasShuffled && !!userProfile,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });
  return (
    <>
      {/* Dark overlay background */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" />
      
      <div className="flex-1 flex items-center justify-center p-8 relative z-[95]">
        <div className="rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden backdrop-blur-md" style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.05)'
      }}>
        <div className="overflow-y-auto max-h-[80vh] p-6">
          {/* AI Explanation Section */}
          {gameState.wasShuffled && explanation && (
            <div className="mb-6 p-4 pr-8 rounded-lg" style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.06)'
            }}>
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-yellow-400/80 flex-shrink-0 mt-0.5" />
                <div 
                  className="text-white/90 text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: explanation
                      .replace(/\*\*\[(\d+)\]\s*([^*]+)\*\*/g, 
                        '<span style="background-color: rgba(251, 191, 36, 0.25); padding: 2px 6px; border-radius: 4px; font-weight: 500;">[$1] $2</span>')
                      .replace(/\n/g, '<br />')
                  }}
                />
              </div>
            </div>
          )}
          
          {/* Loading skeleton for explanation */}
          {gameState.wasShuffled && isLoadingExplanation && (
            <div className="mb-6 p-4 pr-8 rounded-lg animate-pulse" style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.06)'
            }}>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-white/20 rounded flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/20 rounded w-3/4"></div>
                  <div className="h-3 bg-white/20 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            {tasks.map((task, index) => {
              const isCompleted = gameState.completedTasks.has(task.id);
              const isPaused = gameState.pausedTasks.has(task.id);
              const isActive = index === gameState.activeCommittedIndex;
              const isCurrent = index === gameState.currentViewingIndex;
              
              // Calculate time spent from multiple sources
              let timeSpent = 0;
              
              // 1. Check completed tasks
              const completedTask = gameState.todaysCompletedTasks.find(t => t.id === task.id);
              if (completedTask?.timeSpent) {
                timeSpent = completedTask.timeSpent;
              }
              // 2. Check paused tasks
              else if (gameState.pausedTasks.has(task.id)) {
                timeSpent = gameState.pausedTasks.get(task.id) || 0;
              }
              // 3. Check if it's the active task (currently being worked on)
              else if (isActive && gameState.taskStartTimes[task.id]) {
                const elapsedMs = Date.now() - gameState.taskStartTimes[task.id];
                timeSpent = Math.round(elapsedMs / 60000);
              }
              // 4. Check saved time_spent_minutes from database
              else if (task.time_spent_minutes) {
                timeSpent = task.time_spent_minutes;
              }
              
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
                                  color: 'rgba(255, 255, 255, 0.7)'
                                }}
                              >
                                {task.estimated_time}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {timeSpent > 0 && (
                          <div className="flex items-center gap-4 text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            <div className="font-medium" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
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