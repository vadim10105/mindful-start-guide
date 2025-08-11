import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Heart, AlertTriangle, Zap, Check, Wand2, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { TaskActions } from "./TaskActions";
import { TaskProgressManagerHook } from "./TaskProgressManager";
import { TaskTimeDisplay } from "./TaskTimeDisplay";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  pipWindow
}: TaskCardProps) => {
  const [notes, setNotes] = useState(task.notes || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);
  
  // Update notes when task prop changes (important for PiP synchronization)
  useEffect(() => {
    setNotes(task.notes || "");
  }, [task.notes, task.id]);
  
  const [isPauseHovered, setIsPauseHovered] = useState(false);




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

      // Format the AI response into checkbox list
      const subtasks = data.subtasks.map((subtask: any) => `☐ ${subtask.subtask}`);
      const generatedBreakdown = subtasks.join('\n');
      
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


  return (
    <div className={`w-full h-full transition-transform ${
      isCompleted ? '[transform:rotateY(180deg)]' : ''
    }`} style={{ 
      transformStyle: 'preserve-3d',
      transitionDuration: '2000ms'
    }}>
      
      
      {/* Front of Card */}
      <Card className={`w-full h-full border-2 border-transparent z-[10] overflow-visible rounded-2xl relative ${
        isActiveCommitted ? 'shadow-2xl' : 'shadow-xl'
      }`} style={{ 
        backfaceVisibility: 'hidden',
        backgroundColor: 'hsl(48 20% 97%)',
        color: 'hsl(220 10% 20%)',
        ...(isActiveCommitted && {
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.05)'
        })
      }}>
        <div className="h-full flex flex-col">
          <CardHeader className="text-center pb-4 flex-shrink-0 relative overflow-visible px-8 py-6">
            
            {/* Task Tags - Top Left */}
            <div className="absolute top-3 left-2 flex gap-1">
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
            
            {/* Magic Wand - Top Right */}
            <Button
              variant="ghost"
              size="sm"
              onClick={generateSubtasks}
              disabled={isGenerating}
              className="absolute top-1 right-2 h-6 w-6 p-0 hover:bg-muted/20 disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'hsl(220 10% 40%)' }} />
              ) : (
                <Wand2 className="w-3 h-3" style={{ color: 'hsl(220 10% 40%)' }} />
              )}
            </Button>
            
            <div className="flex items-center justify-center gap-1" style={{ marginBottom: '16px', color: 'hsl(220 10% 50%)' }}>
              {taskStartTimes[task.id] ? (
                <TaskTimeDisplay
                  taskId={task.id}
                  startTime={taskStartTimes[task.id]}
                  estimatedTime={task.estimated_time}
                  isActiveCommitted={isActiveCommitted}
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
            <CardTitle className="text-2xl leading-tight tracking-wide whitespace-pre-line" style={{ color: 'hsl(220 10% 20%)' }}>
              {balanceText(task.title, 2)}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col justify-between px-4 pb-4 overflow-hidden">

            {/* Progress Bar + Notes Section Combined */}
            <div className="flex-1 flex flex-col space-y-2">
              {/* Progress Bar */}
              <progressManager.ProgressBar
                taskId={task.id}
                estimatedTime={task.estimated_time}
                isActiveCommitted={isActiveCommitted}
                isPauseHovered={isPauseHovered}
              />

              {/* Notes Section */}
              <div className="flex-1 flex flex-col min-h-0">
              {/* Collapsible Divider */}
              <div 
                onClick={() => {
                  const newCollapsedState = !isNotesCollapsed;
                  
                  // Resize PiP window if we're in PiP mode
                  if (pipWindow && !pipWindow.closed) {
                    try {
                      // Get current window height
                      const currentHeight = pipWindow.innerHeight || 514;
                      let newHeight;
                      
                      if (newCollapsedState) {
                        // Collapsing: measure the notes container height to subtract
                        const notesContainer = pipWindow.document.querySelector('[data-notes-container]');
                        if (notesContainer) {
                          const notesHeight = notesContainer.getBoundingClientRect().height;
                          // Only subtract the visible content height, keep some space for the collapsed state
                          // Reduce the subtraction amount - we were being too aggressive
                          newHeight = Math.max(320, currentHeight - notesHeight + 60);
                        } else {
                          // Fallback to original logic if container not found
                          newHeight = 314;
                        }
                      } else {
                        // Expanding: restore to default height
                        newHeight = 514;
                      }
                      
                      pipWindow.resizeTo(368, newHeight);
                    } catch (error) {
                      console.warn('Failed to resize PiP window:', error);
                    }
                  }
                  
                  setIsNotesCollapsed(newCollapsedState);
                }}
                className="cursor-pointer py-2 px-4 flex items-center justify-center group relative"
              >
                {/* Full line */}
                <div className="w-full h-[1px] bg-[hsl(220_10%_60%)] opacity-30 group-hover:opacity-50 transition-all duration-700 ease-out"></div>
                
                {/* Chevron overlay */}
                <div className="absolute opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out transform scale-75 group-hover:scale-100 bg-[hsl(48_20%_97%)] px-1">
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
                    setNotes(e.target.value);
                    onNotesChange?.(task.id, e.target.value);
                  }}
                  onClick={handleNotesClick}
                  onKeyDown={handleNotesKeyDown}
                  placeholder="Add notes... (Ctrl/Cmd+L for checklist)"
                  className="resize-none !text-sm leading-relaxed border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[hsl(220_10%_30%)] placeholder:text-[hsl(220_10%_60%)] h-full min-h-[80px] cursor-text hover:cursor-pointer"
                  style={{ backgroundColor: 'transparent' }}
                />
              </div>
            </div>
            </div>

            {/* Task Actions */}
            {!hideTaskActions && (
              <div className="px-4 pb-2">
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
                navigationUnlocked={navigationUnlocked}
                formatTime={formatTime}
                onPauseHover={setIsPauseHovered}
              />
              </div>
            )}
          </CardContent>
        </div>
      </Card>

      {/* Back of Card (Sunset Image) */}
      {isCompleted && (
        <div 
          className="absolute inset-0 rounded-2xl shadow-xl border-2 border-transparent [transform:rotateY(180deg)] z-20"
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
            <div className="absolute top-2 right-4 text-gray-300 text-4xl font-bold z-30" style={{ fontFamily: 'Calendas Plus' }}>
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