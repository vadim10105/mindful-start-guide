import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Heart, AlertTriangle, Zap, Check, Wand2, Loader2, ChevronUp, ChevronDown, Play, Pause, Maximize2 } from "lucide-react";
import { TaskActions } from "./TaskActions";
import { TaskProgressManagerHook, taskTimers } from "./TaskProgressManager";
import { TaskTimeDisplay } from "./TaskTimeDisplay";
import { BlockStackingProgress } from "./BlockStackingProgress";

// Global pause timestamps to persist across navigation and PiP
const pauseTimestamps = new Map<string, number>();
import { NotesTypewriterPlaceholder } from "@/components/ui/NotesTypewriterPlaceholder";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseTimeToMinutes } from '@/utils/timeUtils';

// Function to balance text across lines (bottom-heavy preferred)
const balanceText = (text: string, maxLines: number = 3): string => {
  const words = text.split(' ');
  if (words.length <= 4) return text; // Short text doesn't need balancing
  
  const totalWords = words.length;
  const lines: string[] = [];
  
  if (maxLines === 2) {
    // For 2 lines: try to balance, but prefer bottom if odd number
    const firstLineWords = Math.floor(totalWords / 2);
    lines.push(words.slice(0, firstLineWords).join(' '));
    lines.push(words.slice(firstLineWords).join(' '));
  } else {
    // For 3+ lines: distribute with preference for bottom being heavier
    const baseWordsPerLine = Math.floor(totalWords / maxLines);
    const remainder = totalWords % maxLines;
    
    let currentIndex = 0;
    for (let i = 0; i < maxLines; i++) {
      let wordsInThisLine = baseWordsPerLine;
      // Add extra words to later lines (bottom-heavy)
      if (i >= maxLines - remainder) {
        wordsInThisLine++;
      }
      
      if (currentIndex < totalWords) {
        lines.push(words.slice(currentIndex, currentIndex + wordsInThisLine).join(' '));
        currentIndex += wordsInThisLine;
      }
    }
  }
  
  return lines.join('\n');
};

interface TaskCardData {
  id: string;
  title: string;
  priority_score: number;
  explanation: string;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  notes?: string;
  estimated_time?: string;
}

interface TaskCardProps {
  task: TaskCardData;
  index: number;
  totalTasks: number;
  isCompleted: boolean;
  isPaused: boolean;
  pausedTime: number;
  isActiveCommitted: boolean;
  hasCommittedToTask: boolean;
  isCurrentTask: boolean;
  activeCommittedIndex: number;
  flowProgress: number;
  sunsetImageUrl: string;
  attribution?: string;
  attributionUrl?: string;
  description?: string;
  caption?: string;
  cardNumber?: number;
  taskStartTimes: Record<string, number>;
  progressManager: TaskProgressManagerHook;
  onCommit: () => void;
  onComplete: (taskId: string) => void;
  onMadeProgress: (taskId: string) => void;
  onMoveOn: (taskId: string) => void;
  onCarryOn: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  onBackToActive: () => void;
  onNotesChange?: (taskId: string, notes: string) => void;
  onBreakdown?: (taskId: string) => void;
  navigationUnlocked: boolean;
  formatTime: (minutes: number) => string;
  hideTaskActions?: boolean;
  pipWindow?: Window;
  onEnterPiP?: () => void;
  hasAnyPausedTask?: boolean;
  hasAnyCompletedTask?: boolean;
}

export const TaskCard = ({
  task,
  index,
  totalTasks,
  isCompleted,
  isPaused,
  pausedTime,
  isActiveCommitted,
  hasCommittedToTask,
  isCurrentTask,
  activeCommittedIndex,
  flowProgress,
  sunsetImageUrl,
  attribution,
  attributionUrl,
  description,
  caption,
  cardNumber,
  taskStartTimes,
  progressManager,
  onCommit,
  onComplete,
  onMadeProgress,
  onMoveOn,
  onCarryOn,
  onSkip,
  onBackToActive,
  onNotesChange,
  onBreakdown,
  navigationUnlocked,
  formatTime,
  hideTaskActions = false,
  pipWindow,
  onEnterPiP,
  hasAnyPausedTask = false,
  hasAnyCompletedTask = false
}: TaskCardProps) => {
  const [notes, setNotes] = useState(task.notes || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);
  const [isNotesFocused, setIsNotesFocused] = useState(false);
  const [isUltraCompact, setIsUltraCompact] = useState(false);
  
  // Auto-detect ultra-compact mode based on PiP window size
  useEffect(() => {
    if (pipWindow && !pipWindow.closed) {
      const shouldBeUltraCompact = pipWindow.innerHeight <= 150;
      setIsUltraCompact(shouldBeUltraCompact);
    }
  }, [pipWindow]);
  
  // Track the last props value to detect actual changes
  const lastPropsNotesRef = useRef(task.notes);
  
  // Sync with props only when not actively focused and props actually changed
  useEffect(() => {
    // Only sync if user is not currently typing AND the props value actually changed
    if (!isNotesFocused && task.notes !== lastPropsNotesRef.current) {
      console.log(`📝 TaskCard syncing notes for task ${task.id}:`, {
        from: lastPropsNotesRef.current?.substring(0, 30) + '...',
        to: task.notes?.substring(0, 30) + '...',
        isNotesFocused
      });
      setNotes(task.notes || "");
      lastPropsNotesRef.current = task.notes;
    }
  }, [task.notes, isNotesFocused]);
  
  const [isPauseHovered, setIsPauseHovered] = useState(false);
  const [isPlayHovered, setIsPlayHovered] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [pausedOverlayVisible, setPausedOverlayVisible] = useState(isPaused);

  // Track when pause starts/stops using global map
  useEffect(() => {
    if (isPaused && !pauseTimestamps.has(task.id)) {
      pauseTimestamps.set(task.id, Date.now());
    } else if (!isPaused && pauseTimestamps.has(task.id)) {
      pauseTimestamps.delete(task.id);
    }
    
    // Always update overlay visibility based on isPaused state
    setPausedOverlayVisible(isPaused);
  }, [isPaused, task.id]);

  // Update timer for paused display
  useEffect(() => {
    if (isPaused && pauseTimestamps.has(task.id)) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isPaused, task.id]);

  // Get the pause start time from global map
  const pausedStartTime = pauseTimestamps.get(task.id) || null;


  const handleNotesClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const clickPos = textarea.selectionStart;
    const text = textarea.value;
    const lines = text.split('\n');
    
    let currentPos = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineStart = currentPos;
      const lineEnd = currentPos + line.length;
      
      // Check if click is within this line
      if (clickPos >= lineStart && clickPos <= lineEnd) {
        // Calculate relative position within the line
        const relativePos = clickPos - lineStart;
        
        // Find checkbox positions in the line
        const uncheckedPos = line.indexOf('☐');
        const checkedPos = line.indexOf('☑');
        
        // Only toggle if click is precisely on a checkbox character (☐ or ☑)
        // Allow a small tolerance of 1 character before/after for easier clicking
        if (uncheckedPos !== -1 && relativePos >= uncheckedPos && relativePos <= uncheckedPos + 1) {
          lines[i] = line.replace('☐', '☑');
          const newNotes = lines.join('\n');
          setNotes(newNotes);
          onNotesChange?.(task.id, newNotes);
          break;
        } else if (checkedPos !== -1 && relativePos >= checkedPos && relativePos <= checkedPos + 1) {
          lines[i] = line.replace('☑', '☐');
          const newNotes = lines.join('\n');
          setNotes(newNotes);
          onNotesChange?.(task.id, newNotes);
          break;
        }
      }
      currentPos = lineEnd + 1; // +1 for the newline character
    }
  };

  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    
    // Ctrl/Cmd + L: Convert current line to checklist
    if ((e.ctrlKey || e.metaKey) && e.key === 'l' && !e.shiftKey) {
      e.preventDefault();
      
      const lines = value.split('\n');
      let currentPos = 0;
      
      // Find which line the cursor is on
      for (let i = 0; i < lines.length; i++) {
        const lineStart = currentPos;
        const lineEnd = currentPos + lines[i].length;
        
        if (selectionStart >= lineStart && selectionStart <= lineEnd) {
          const line = lines[i].trim();
          
          // Skip if already a checklist item
          if (line.startsWith('☐') || line.startsWith('☑')) {
            return;
          }
          
          // Convert to checklist item
          lines[i] = line ? `☐ ${line}` : '☐ ';
          const newNotes = lines.join('\n');
          setNotes(newNotes);
          onNotesChange?.(task.id, newNotes);
          
          // Restore cursor position (adjust for added characters)
          setTimeout(() => {
            const adjustment = line ? 2 : 2; // "☐ " = 2 characters
            textarea.setSelectionRange(selectionStart + adjustment, selectionStart + adjustment);
          }, 0);
          
          break;
        }
        currentPos = lineEnd + 1;
      }
    }
    
    // Ctrl/Cmd + Shift + L: Convert selection to checklist items
    if ((e.ctrlKey || e.metaKey) && e.key === 'L' && e.shiftKey) {
      e.preventDefault();
      
      if (selectionStart === selectionEnd) return; // No selection
      
      const beforeSelection = value.substring(0, selectionStart);
      const selectedText = value.substring(selectionStart, selectionEnd);
      const afterSelection = value.substring(selectionEnd);
      
      // Split selected text into lines and convert each to checklist
      const selectedLines = selectedText.split('\n');
      const convertedLines = selectedLines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return line; // Keep empty lines
        if (trimmed.startsWith('☐') || trimmed.startsWith('☑')) return line; // Already checklist
        return line.replace(trimmed, `☐ ${trimmed}`);
      });
      
      const newNotes = beforeSelection + convertedLines.join('\n') + afterSelection;
      setNotes(newNotes);
      onNotesChange?.(task.id, newNotes);
      
      // Restore selection (adjust for added characters)
      setTimeout(() => {
        const addedChars = convertedLines.reduce((acc, line, i) => {
          const original = selectedLines[i].trim();
          return acc + (original && !original.startsWith('☐') && !original.startsWith('☑') ? 2 : 0);
        }, 0);
        textarea.setSelectionRange(selectionStart, selectionEnd + addedChars);
      }, 0);
    }
  };

  const generateSubtasks = async () => {
    if (isGenerating) return;
    
    // Exit ultra-compact mode if in PiP
    if (isUltraCompact && pipWindow && !pipWindow.closed) {
      setIsUltraCompact(false);
      try {
        pipWindow.resizeTo(368, 575);
      } catch (error) {
        console.warn('Failed to resize PiP window:', error);
      }
    }
    
    // Call the onBreakdown callback if provided (for PiP window resize)
    onBreakdown?.(task.id);
    
    // Expand notes section when generating subtasks
    setIsNotesCollapsed(false);
    
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('breakdown-task', {
        body: {
          task: task.title,
          context: `Break down this task into actionable subtasks for someone with ADHD/neurodivergent traits. Make steps clear, specific, and not overwhelming.`
        }
      });

      if (error) throw error;

      // Format the AI response into checkbox list with blank lines between items
      const subtasks = data.subtasks.map((subtask: any) => `☐ ${subtask.subtask}`);
      const generatedBreakdown = subtasks.join('\n\n');
      
      // Preserve existing notes and append breakdown underneath
      const newNotes = notes.trim() 
        ? `${notes}\n\n${generatedBreakdown}`
        : generatedBreakdown;
      
      setNotes(newNotes);
      onNotesChange?.(task.id, newNotes);
      
    } catch (error) {
      console.error('Error generating subtasks:', error);
      // Fallback to simple breakdown
      const fallbackSubtasks = [
        "☐ Break down the task",
        "☐ Complete the first step", 
        "☐ Review progress",
        "☐ Finish and wrap up"
      ];
      const generatedBreakdown = fallbackSubtasks.join('\n');
      
      // Preserve existing notes and append breakdown underneath
      const newNotes = notes.trim() 
        ? `${notes}\n\n${generatedBreakdown}`
        : generatedBreakdown;
      
      setNotes(newNotes);
      onNotesChange?.(task.id, newNotes);
    } finally {
      setIsGenerating(false);
    }
  };


  // Timer state for ultra-compact progress updates
  const [ultraCompactTime, setUltraCompactTime] = useState(Date.now());
  const [isUltraCompactHovered, setIsUltraCompactHovered] = useState(false);
  
  // Feature flag for block stacking progress (set to true to enable)
  const useBlockStackingProgress = true;
  
  // Update timer for ultra-compact view
  useEffect(() => {
    if (isUltraCompact && isActiveCommitted && !isPaused && pipWindow) {
      const timerState = taskTimers.get(task.id);
      if (timerState) {
        // Reset the session start when resuming from pause to account for paused time
        const now = Date.now();
        const startTime = taskStartTimes?.[task.id];
        if (startTime) {
          const totalElapsedMs = now - startTime;
          timerState.sessionStartElapsedMs = timerState.baseElapsedMs - totalElapsedMs;
        }
        timerState.currentSessionStart = now;
      }
      
      setUltraCompactTime(Date.now());
      
      const interval = setInterval(() => {
        setUltraCompactTime(Date.now());
      }, 1000); // Update every second
      
      return () => clearInterval(interval);
    }
  }, [isUltraCompact, isActiveCommitted, isPaused, pipWindow, task.id, taskStartTimes]);
  
  // Get actual session progress using the same logic as ProgressBar
  const getUltraCompactProgress = () => {
    if (!isUltraCompact || !task.estimated_time) {
      return 0;
    }
    
    // Access the same timer state used by ProgressBar
    const timerState = taskTimers.get(task.id);
    
    if (!timerState) {
      return 0;
    }
    
    const currentTime = ultraCompactTime;
    const estimatedMinutes = parseTimeToMinutes(task.estimated_time);
    if (!estimatedMinutes) return 0;
    const estimatedSeconds = estimatedMinutes * 60;
    
    // Calculate session elapsed time (same logic as ProgressBar)
    const sessionElapsedMs = timerState.currentSessionStart 
      ? (timerState.baseElapsedMs - timerState.sessionStartElapsedMs) + (currentTime - timerState.currentSessionStart)
      : (timerState.baseElapsedMs - timerState.sessionStartElapsedMs);
      
    const sessionElapsedSeconds = sessionElapsedMs / 1000;
    
    // Calculate progress percentage using session time (capped at 100% for visual)
    return Math.min((sessionElapsedSeconds / estimatedSeconds) * 100, 100);
  };
  
  // Use the same logic as normal TaskTimeDisplay
  const hasStartTime = taskStartTimes[task.id];

  {/* ========== ULTRA-COMPACT PIP VIEW START ========== */}
  if (isUltraCompact && pipWindow) {
    return (
      <Card 
        className="h-[90px] w-[368px] relative overflow-hidden border-2 border-transparent rounded-2xl shadow-lg"
        style={{ backgroundColor: '#B0E0E6' }}
        onMouseEnter={() => setIsUltraCompactHovered(true)}
        onMouseLeave={() => setIsUltraCompactHovered(false)}
      >
        {/* Floating Mario-style block clouds */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Cloud 1 */}
          <div 
            className="absolute"
            style={{
              top: '8px',
              left: '60px',
              opacity: 0.9,
              animation: 'float 8s ease-in-out infinite, move 20s linear infinite'
            }}
          >
            <div className="grid grid-cols-4 gap-0">
              <div style={{width: '4px', height: '4px', background: '#FFFFFF'}}></div>
              <div style={{width: '4px', height: '4px', background: '#FFFFFF'}}></div>
              <div style={{width: '4px', height: '4px', background: '#FFFFFF'}}></div>
              <div style={{width: '4px', height: '4px', background: 'transparent'}}></div>
              <div style={{width: '4px', height: '4px', background: '#FFFFFF'}}></div>
              <div style={{width: '4px', height: '4px', background: '#FFFFFF'}}></div>
              <div style={{width: '4px', height: '4px', background: '#FFFFFF'}}></div>
              <div style={{width: '4px', height: '4px', background: '#FFFFFF'}}></div>
            </div>
          </div>
          {/* Cloud 2 */}
          <div 
            className="absolute"
            style={{
              top: '18px',
              left: '180px',
              opacity: 0.7,
              animation: 'float 12s ease-in-out infinite reverse, move 25s linear infinite reverse'
            }}
          >
            <div className="grid grid-cols-5 gap-0">
              <div style={{width: '3px', height: '3px', background: 'transparent'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: 'transparent'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: 'transparent'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: 'transparent'}}></div>
            </div>
          </div>
          {/* Cloud 3 */}
          <div 
            className="absolute"
            style={{
              top: '12px',
              left: '280px',
              opacity: 0.8,
              animation: 'float 10s ease-in-out infinite, move 30s linear infinite'
            }}
          >
            <div className="grid grid-cols-3 gap-0">
              <div style={{width: '4px', height: '4px', background: '#FFFFFF'}}></div>
              <div style={{width: '4px', height: '4px', background: '#FFFFFF'}}></div>
              <div style={{width: '4px', height: '4px', background: '#FFFFFF'}}></div>
              <div style={{width: '4px', height: '4px', background: '#FFFFFF'}}></div>
              <div style={{width: '4px', height: '4px', background: '#FFFFFF'}}></div>
              <div style={{width: '4px', height: '4px', background: 'transparent'}}></div>
            </div>
          </div>
          {/* Cloud 4 */}
          <div 
            className="absolute"
            style={{
              top: '25px',
              left: '40px',
              opacity: 0.5,
              animation: 'float 15s ease-in-out infinite, move 35s linear infinite reverse'
            }}
          >
            <div className="grid grid-cols-2 gap-0">
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
            </div>
          </div>
          {/* Cloud 5 */}
          <div 
            className="absolute"
            style={{
              top: '6px',
              left: '320px',
              opacity: 0.6,
              animation: 'float 9s ease-in-out infinite reverse, move 45s linear infinite'
            }}
          >
            <div className="grid grid-cols-3 gap-0">
              <div style={{width: '3px', height: '3px', background: 'transparent'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: 'transparent'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
            </div>
          </div>
          {/* Cloud 6 */}
          <div 
            className="absolute"
            style={{
              top: '22px',
              left: '120px',
              opacity: 0.4,
              animation: 'float 18s ease-in-out infinite, move 60s linear infinite reverse'
            }}
          >
            <div className="grid grid-cols-4 gap-0">
              <div style={{width: '3px', height: '3px', background: 'transparent'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: 'transparent'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
              <div style={{width: '3px', height: '3px', background: '#FFFFFF'}}></div>
            </div>
          </div>
          {/* Cloud 7 */}
          <div 
            className="absolute"
            style={{
              top: '14px',
              left: '240px',
              opacity: 0.5,
              animation: 'float 22s ease-in-out infinite reverse, move 55s linear infinite'
            }}
          >
            <div className="grid grid-cols-4 gap-0">
              <div style={{width: '2px', height: '2px', background: 'transparent'}}></div>
              <div style={{width: '2px', height: '2px', background: '#FFFFFF'}}></div>
              <div style={{width: '2px', height: '2px', background: '#FFFFFF'}}></div>
              <div style={{width: '2px', height: '2px', background: 'transparent'}}></div>
              <div style={{width: '2px', height: '2px', background: '#FFFFFF'}}></div>
              <div style={{width: '2px', height: '2px', background: '#FFFFFF'}}></div>
              <div style={{width: '2px', height: '2px', background: '#FFFFFF'}}></div>
              <div style={{width: '2px', height: '2px', background: '#FFFFFF'}}></div>
            </div>
          </div>
          {/* Cloud 8 */}
          <div 
            className="absolute"
            style={{
              top: '4px',
              left: '10px',
              opacity: 0.3,
              animation: 'float 25s ease-in-out infinite, move 70s linear infinite'
            }}
          >
            <div className="grid grid-cols-4 gap-0">
              <div style={{width: '2px', height: '2px', background: 'transparent'}}></div>
              <div style={{width: '2px', height: '2px', background: '#FFFFFF'}}></div>
              <div style={{width: '2px', height: '2px', background: '#FFFFFF'}}></div>
              <div style={{width: '2px', height: '2px', background: 'transparent'}}></div>
              <div style={{width: '2px', height: '2px', background: '#FFFFFF'}}></div>
              <div style={{width: '2px', height: '2px', background: '#FFFFFF'}}></div>
              <div style={{width: '2px', height: '2px', background: '#FFFFFF'}}></div>
              <div style={{width: '2px', height: '2px', background: '#FFFFFF'}}></div>
            </div>
          </div>
        </div>
        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-3px); }
          }
          @keyframes move {
            0% { transform: translateX(0px); }
            100% { transform: translateX(400px); }
          }
        `}</style>
        
        {/* Progress background - fills from left dynamically */}
        {!useBlockStackingProgress && (
          <div 
            className="absolute inset-0"
            style={{
              background: (() => {
                const progress = getUltraCompactProgress();
                const estimatedMinutes = parseTimeToMinutes(task.estimated_time || '');
                const timerState = taskTimers.get(task.id);
                const sessionElapsedMs = timerState?.currentSessionStart 
                  ? (timerState.baseElapsedMs - timerState.sessionStartElapsedMs) + (ultraCompactTime - timerState.currentSessionStart)
                  : (timerState?.baseElapsedMs || 0) - (timerState?.sessionStartElapsedMs || 0);
                const elapsedMinutes = Math.floor(sessionElapsedMs / 60000);
                const isOvertime = estimatedMinutes > 0 && elapsedMinutes > estimatedMinutes;
                
                let progressColor;
                if (isPaused) {
                  progressColor = 'rgba(251, 191, 36, 0.4)'; // Yellow with low opacity when paused
                } else if (isOvertime) {
                  progressColor = '#f59e0b'; // Orange when overtime
                } else {
                  progressColor = 'rgb(251 191 36)'; // Yellow when normal
                }
                
                return progress > 0
                  ? `linear-gradient(to right, ${progressColor} ${progress}%, transparent ${progress}%)`
                  : 'transparent';
              })()
            }} 
          />
        )}
        
        {/* Block stacking progress - new animated version */}
        {useBlockStackingProgress && (
          <BlockStackingProgress 
            progress={getUltraCompactProgress()}
            isPaused={isPaused}
            isOvertime={(() => {
              const estimatedMinutes = parseTimeToMinutes(task.estimated_time || '');
              const timerState = taskTimers.get(task.id);
              const sessionElapsedMs = timerState?.currentSessionStart 
                ? (timerState.baseElapsedMs - timerState.sessionStartElapsedMs) + (ultraCompactTime - timerState.currentSessionStart)
                : (timerState?.baseElapsedMs || 0) - (timerState?.sessionStartElapsedMs || 0);
              const elapsedMinutes = Math.floor(sessionElapsedMs / 60000);
              return estimatedMinutes > 0 && elapsedMinutes > estimatedMinutes;
            })()}
            taskTitle={task.title}
            estimatedTime={task.estimated_time}
          />
        )}
      
        {/* Top-right timer container */}
        <div className="absolute z-30 w-[110px]" style={{ position: 'absolute', top: '12px', right: '16px' }}>
          {/* Time display - visible when not hovering */}
          <div className={`absolute right-0 flex items-center justify-end w-full transition-opacity duration-300 ${isUltraCompactHovered ? 'opacity-0' : 'opacity-100'}`}>
            <div className="font-medium whitespace-nowrap [&>span]:!text-xs" style={{ color: 'hsl(220 10% 50%)' }}>
              {hasStartTime ? (
                <TaskTimeDisplay
                  taskId={task.id}
                  startTime={taskStartTimes[task.id]}
                  estimatedTime={task.estimated_time}
                  isActiveCommitted={isActiveCommitted}
                  isUltraCompact={true}
                  totalPausedTime={pausedTime * 60000}
                />
              ) : (
                <span style={{ color: 'hsl(220 10% 50%)' }}>--:-- → --:--</span>
              )}
            </div>
          </div>
          
          {/* Timer + Play/Pause + Chevron container - visible on hover */}
          <div className={`absolute right-0 flex items-center justify-end gap-0.5 w-full transition-opacity duration-300 ${isUltraCompactHovered ? 'opacity-100' : 'opacity-0'}`}>
            {/* Timer */}
            <div className="font-medium whitespace-nowrap text-xs mr-2" style={{ color: 'hsl(220 10% 50%)' }}>
              {(() => {
                const timerState = taskTimers.get(task.id);
                if (!timerState) return '0:00';
                
                // If paused, return the frozen elapsed time (don't keep counting)
                let sessionElapsedMs;
                if (isPaused) {
                  // When paused, use the elapsed time from when pause was triggered (frozen)
                  sessionElapsedMs = timerState.baseElapsedMs - timerState.sessionStartElapsedMs;
                } else {
                  sessionElapsedMs = timerState.currentSessionStart 
                    ? (timerState.baseElapsedMs - timerState.sessionStartElapsedMs) + (ultraCompactTime - timerState.currentSessionStart)
                    : (timerState.baseElapsedMs - timerState.sessionStartElapsedMs);
                }
                
                const totalSeconds = Math.floor(sessionElapsedMs / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                
                return `${minutes}:${seconds.toString().padStart(2, '0')}`;
              })()}
            </div>
            
            {/* Play/Pause button */}
            <button
              className="group relative w-6 h-6 rounded-full transition-all duration-300 ease-out flex items-center justify-center border border-gray-200/50 hover:border-yellow-400/50 hover:shadow-sm overflow-hidden flex-shrink-0"
              style={{ backgroundColor: 'transparent' }}
              onClick={() => {
                // Same logic as progress bar play/pause
                if (isPaused) {
                  onCarryOn(task.id);
                } else if (isActiveCommitted) {
                  onMoveOn(task.id);
                } else if (isCurrentTask && !hasCommittedToTask) {
                  onCommit();
                }
              }}
            >
              <div className="absolute inset-0 bg-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out" />
              {(() => {
                const timerState = taskTimers.get(task.id);
                
                // If paused, return the frozen elapsed time (don't keep counting)
                let sessionElapsedMs;
                if (isPaused) {
                  // When paused, use the elapsed time from when pause was triggered (frozen)
                  sessionElapsedMs = timerState?.baseElapsedMs ? timerState.baseElapsedMs - timerState.sessionStartElapsedMs : 0;
                } else {
                  sessionElapsedMs = timerState?.currentSessionStart 
                    ? (timerState.baseElapsedMs - timerState.sessionStartElapsedMs) + (ultraCompactTime - timerState.currentSessionStart)
                    : (timerState?.baseElapsedMs || 0) - (timerState?.sessionStartElapsedMs || 0);
                }
                
                return (isPaused || sessionElapsedMs < 1000) ? (
                  <Play className="w-3 h-3 flex-shrink-0 text-gray-600 group-hover:text-white transition-colors duration-300 relative z-10" fill="currentColor" />
                ) : (
                  <Pause className="w-3 h-3 flex-shrink-0 text-gray-600 group-hover:text-white transition-colors duration-300 relative z-10" fill="currentColor" />
                );
              })()}
            </button>
            
            {/* Expand chevron */}
            <button
              className="group relative w-6 h-6 rounded-full transition-all duration-300 ease-out flex items-center justify-center border border-gray-200/50 hover:border-gray-600/50 hover:shadow-sm overflow-hidden flex-shrink-0"
              style={{ backgroundColor: 'transparent' }}
              onClick={() => {
                setIsUltraCompact(false);
                if (pipWindow && !pipWindow.closed) {
                  try {
                    pipWindow.resizeTo(368, 575);
                  } catch (error) {
                    console.warn('Failed to resize PiP window:', error);
                  }
                }
              }}
            >
              <div className="absolute inset-0 bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out" />
              <Maximize2 className="w-3 h-3 flex-shrink-0 text-gray-600 group-hover:text-white transition-colors duration-300 relative z-10" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </Card>
    );
  }
  {/* ========== ULTRA-COMPACT PIP VIEW END ========== */}

  return (
    <div className={`w-full h-full transition-transform ${
      isCompleted ? '[transform:rotateY(180deg)]' : ''
    }`} style={{ 
      transformStyle: 'preserve-3d',
      transitionDuration: '2000ms'
    }}>
      
      
      {/* Front of Card */}
      <Card className="w-full h-full border-2 border-transparent z-[10] overflow-hidden rounded-2xl relative transition-all duration-500 ease-out" style={{ 
        backfaceVisibility: 'hidden',
        backgroundColor: '#FFFFF7',
        color: 'hsl(220 10% 20%)'
      }}>
        {/* Overlay Logic */}
        <>
          {/* Blur layer */}
          <div className={`absolute inset-0 backdrop-blur-sm rounded-2xl z-20 pointer-events-none transition-all duration-500 ${
            ((!isActiveCommitted && !hasAnyPausedTask && (!hasAnyCompletedTask || hasCommittedToTask)) || isPaused) 
              ? (isPaused ? 'opacity-100' : (isPlayHovered ? 'opacity-0' : 'opacity-100'))
              : 'opacity-0'
          }`} />
          {/* Dark overlay layer */}
          <div className={`absolute inset-0 bg-black/25 rounded-2xl z-20 pointer-events-none transition-all duration-500 ${
            ((!isActiveCommitted && !hasAnyPausedTask && (!hasAnyCompletedTask || hasCommittedToTask)) || isPaused)
              ? (isPaused ? 'opacity-100' : (isPlayHovered ? 'opacity-0' : 'opacity-100'))
              : 'opacity-0'
          }`} />
          
          {/* Paused Timer Overlay - only for this specific paused card */}
          {isPaused && pausedStartTime && (
            <div className={`absolute inset-0 flex items-center justify-center z-30 pointer-events-none transition-all duration-500 ease-out ${
              pausedOverlayVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
            }`}>
              <div className={`bg-black/40 backdrop-blur-md rounded-2xl px-6 py-4 w-[240px] transition-all duration-500 ease-out transform ${
                pausedOverlayVisible ? 'scale-100' : 'scale-90'
              }`}>
                <p className="text-white text-xl font-medium text-center">
                  Paused for {(() => {
                    if (!pausedStartTime) return '00:00';
                    const pausedDuration = Math.max(0, Math.floor((currentTime - pausedStartTime) / 1000));
                    const minutes = Math.floor(pausedDuration / 60);
                    const seconds = pausedDuration % 60;
                    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                  })()}
                </p>
              </div>
            </div>
          )}
        </>
        <div className="h-full flex flex-col">
          <CardHeader className="text-center pb-4 flex-shrink-0 relative overflow-visible px-8 py-6">
            
            {/* Task Tags - Top Center */}
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 flex gap-1 hidden">
              {/* Show liked tag if tagged */}
              {task.is_liked && (
                <Heart className="w-4 h-4 fill-red-500 text-red-500 transition-colors" />
              )}
              {/* Show urgent tag if tagged */}
              {task.is_urgent && (
                <AlertTriangle className="w-4 h-4 fill-yellow-500 text-yellow-500 transition-colors" />
              )}
              {/* Show quick tag if tagged */}
              {task.is_quick && (
                <Zap className="w-4 h-4 fill-green-500 text-green-500 transition-colors" />
              )}
            </div>
            
            
            <div className="flex items-center justify-center gap-1" style={{ marginBottom: '16px', color: 'hsl(220 10% 50%)' }}>
              {taskStartTimes[task.id] ? (
                <TaskTimeDisplay
                  taskId={task.id}
                  startTime={taskStartTimes[task.id]}
                  estimatedTime={task.estimated_time}
                  isActiveCommitted={isActiveCommitted}
                  totalPausedTime={pausedTime * 60000}
                />
              ) : (
                <>
                  <span className="text-sm">
                    {index + 1}
                  </span>
                  <span className="text-sm">
                    of {totalTasks}
                  </span>
                </>
              )}
            </div>
            <CardTitle className="text-2xl leading-tight tracking-wide whitespace-pre-line" style={{ color: '#7C7C7C' }}>
              {balanceText(task.title, 2)}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col justify-between px-4 pb-4 overflow-hidden">

            {/* Progress Bar + Notes Section Combined */}
            <div className="flex-1 flex flex-col space-y-2">
              {/* Progress Bar - Temporarily Hidden */}
              {/* <progressManager.ProgressBar
                taskId={task.id}
                estimatedTime={task.estimated_time}
                isActiveCommitted={isActiveCommitted}
                isPauseHovered={isPauseHovered}
                isPaused={isPaused}
                showPlayPauseIcon={isActiveCommitted || isPaused || (isCurrentTask && !hasCommittedToTask)}
                onPlayPause={() => {
                  if (isPaused) {
                    onCarryOn(task.id);
                  } else if (isActiveCommitted) {
                    onMoveOn(task.id);
                  } else if (isCurrentTask && !hasCommittedToTask) {
                    onCommit();
                  }
                }}
              /> */}

              {/* Notes Section */}
              <div className="flex-1 flex flex-col min-h-0">
              {/* Collapsible Divider */}
              <div 
                onClick={() => {
                  // Always toggle notes collapse/expand
                  setIsNotesCollapsed(!isNotesCollapsed);
                }}
                className="cursor-pointer py-2 px-4 flex items-center justify-center group relative"
              >
                {/* Full line */}
                <div className="w-full h-[1px] bg-[#989898] opacity-20 group-hover:opacity-50 transition-all duration-700 ease-out"></div>
                
                {/* Chevron overlay */}
                <div className="absolute opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out transform scale-75 group-hover:scale-100 px-1" style={{ backgroundColor: '#FFFFF7' }}>
                  {isNotesCollapsed ? (
                    <ChevronDown className="w-4 h-4" style={{ color: 'hsl(220 10% 40%)' }} />
                  ) : (
                    <ChevronUp className="w-4 h-4" style={{ color: 'hsl(220 10% 40%)' }} />
                  )}
                </div>
              </div>
              
              {/* Notes Content */}
              <div 
                data-notes-container
                className={`relative transition-all duration-300 ease-out overflow-hidden ${
                isNotesCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100 flex-1'
              }`}>
                <Textarea
                  value={notes}
                  onChange={(e) => {
                    console.log(`✏️ Notes onChange for task ${task.id}:`, e.target.value.substring(0, 30) + '...');
                    setNotes(e.target.value);
                    onNotesChange?.(task.id, e.target.value);
                  }}
                  onClick={handleNotesClick}
                  onKeyDown={handleNotesKeyDown}
                  onFocus={() => {
                    console.log(`🎯 Notes focused for task ${task.id}`);
                    setIsNotesFocused(true);
                  }}
                  onBlur={() => {
                    console.log(`💨 Notes blurred for task ${task.id}`);
                    setIsNotesFocused(false);
                  }}
                  placeholder=""
                  className="resize-none !text-sm leading-relaxed border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[#7C7C7C] placeholder:text-[#7C7C7C] h-full min-h-[80px] cursor-text hover:cursor-pointer"
                  style={{ backgroundColor: 'transparent' }}
                />
                {/* Typewriter placeholder */}
                <NotesTypewriterPlaceholder
                  isVisible={notes.trim() === '' && !isNotesFocused}
                  taskStartTime={taskStartTimes[task.id] ? new Date(taskStartTimes[task.id]) : undefined}
                />
              </div>
            </div>
            </div>

            {/* Task Actions */}
            {!hideTaskActions && (
              <div className="px-4 pb-2 relative z-30">
                <TaskActions
                task={task}
                isCompleted={isCompleted}
                isPaused={isPaused}
                pausedTime={pausedTime}
                isActiveCommitted={isActiveCommitted}
                hasCommittedToTask={hasCommittedToTask}
                isCurrentTask={isCurrentTask}
                activeCommittedIndex={activeCommittedIndex}
                onCommit={onCommit}
                onComplete={onComplete}
                onMadeProgress={onMadeProgress}
                onMoveOn={onMoveOn}
                onCarryOn={onCarryOn}
                onSkip={onSkip}
                onBackToActive={onBackToActive}
                onBreakdown={() => generateSubtasks()}
                onMinify={() => {
                  if (pipWindow && !pipWindow.closed) {
                    // In PiP: toggle ultra-compact mode
                    const newUltraCompact = !isUltraCompact;
                    setIsUltraCompact(newUltraCompact);
                    try {
                      pipWindow.resizeTo(368, newUltraCompact ? 125 : 575);
                    } catch (error) {
                      console.warn('Failed to resize PiP window:', error);
                    }
                  } else {
                    // In main window: open PiP
                    onEnterPiP?.();
                  }
                }}
                isGenerating={isGenerating}
                navigationUnlocked={navigationUnlocked}
                formatTime={formatTime}
                onPauseHover={setIsPauseHovered}
                onPlayHover={setIsPlayHovered}
                pipWindow={pipWindow}
                taskStartTimes={taskStartTimes}
                hasAnyPausedTask={hasAnyPausedTask}
                hasAnyCompletedTask={hasAnyCompletedTask}
              />
              </div>
            )}
          </CardContent>
        </div>
      </Card>

      {/* Back of Card (Sunset Image) */}
      {isCompleted && (
        <div 
          className="absolute inset-0 rounded-2xl border-2 border-transparent [transform:rotateY(180deg)] z-20"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div 
            className="absolute inset-0 bg-cover bg-center rounded-2xl"
            style={{ 
              backgroundImage: `url('${sunsetImageUrl}')` 
            }}
          />
          <div className="absolute inset-0 bg-black/10 rounded-2xl" />
          <div className="absolute inset-0 paper-texture rounded-2xl" />
          {/* White border inside the card */}
          <div className="absolute inset-0 border-2 border-white rounded-2xl opacity-80" />
          {cardNumber && (
            <div className="absolute top-2 right-4 text-white text-4xl font-bold z-30" style={{ fontFamily: 'Calendas Plus' }}>
              {cardNumber.toString().padStart(2, '0')}
            </div>
          )}
          {caption && (
            <div className="absolute top-4 left-4 z-20">
              <span className="inline-flex items-center bg-gray-600/10 backdrop-blur-md rounded-md px-2 py-1">
                <span className="text-lg font-bold text-white" style={{ fontFamily: 'Calendas Plus' }}>{caption}</span>
              </span>
            </div>
          )}
          <div className="relative h-full flex flex-col justify-end p-6 text-white z-10">
            <div className="text-left flex flex-col gap-3">
              {attribution && (
                attributionUrl ? (
                  <a 
                    href={attributionUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-white hover:text-gray-200 underline transition-colors"
                  >
                    {attribution}
                  </a>
                ) : (
                  <div className="text-sm text-white">
                    {attribution}
                  </div>
                )
              )}
              {description && (
                <p className="text-xs text-white leading-relaxed italic mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};