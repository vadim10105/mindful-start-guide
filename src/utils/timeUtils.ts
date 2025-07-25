/**
 * Utility functions for parsing and formatting time estimates
 */

/**
 * Parse various time format strings into minutes
 * Supports: "15", "15m", "1h", "1h 30m", "90m", "1.5h", etc.
 */
export function parseTimeToMinutes(input: string): number | null {
  if (!input || typeof input !== 'string') return null;
  
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;
  
  // Handle pure numbers (assume minutes)
  if (/^\d+$/.test(normalized)) {
    const minutes = parseInt(normalized, 10);
    return isValidMinutes(minutes) ? minutes : null;
  }
  
  // Handle decimal hours like "1.5h"
  const decimalHourMatch = normalized.match(/^(\d*\.?\d+)h?$/);
  if (decimalHourMatch) {
    const hours = parseFloat(decimalHourMatch[1]);
    const minutes = Math.round(hours * 60);
    return isValidMinutes(minutes) ? minutes : null;
  }
  
  // Handle formats like "15m", "90m"
  const minutesMatch = normalized.match(/^(\d+)m(in|ins|inutes?)?$/);
  if (minutesMatch) {
    const minutes = parseInt(minutesMatch[1], 10);
    return isValidMinutes(minutes) ? minutes : null;
  }
  
  // Handle formats like "1h", "2h"
  const hoursMatch = normalized.match(/^(\d+)h(r|rs|our|ours)?$/);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10);
    const minutes = hours * 60;
    return isValidMinutes(minutes) ? minutes : null;
  }
  
  // Handle formats like "1h 30m", "2h 15m", "1h30m", "2h15"
  const combinedMatch = normalized.match(/^(\d+)h\s*(\d+)m?$/);
  if (combinedMatch) {
    const hours = parseInt(combinedMatch[1], 10);
    const minutes = parseInt(combinedMatch[2], 10);
    const totalMinutes = hours * 60 + minutes;
    return isValidMinutes(totalMinutes) ? totalMinutes : null;
  }
  
  return null;
}

/**
 * Format minutes into a standardized display string
 * Examples: 15 -> "15m", 60 -> "1h", 90 -> "1h 30m"
 */
export function formatMinutesToDisplay(minutes: number): string {
  if (!isValidMinutes(minutes)) return '';
  
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Parse an existing time display string back to minutes
 * Used when editing existing time estimates
 */
export function parseDisplayToMinutes(display: string): number | null {
  return parseTimeToMinutes(display);
}

/**
 * Validate that minutes is within reasonable bounds
 */
function isValidMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes > 0 && minutes <= 8 * 60; // Max 8 hours
}

/**
 * Get suggestions for common time estimates
 */
export function getCommonTimeEstimates(): string[] {
  return ['15m', '30m', '45m', '1h', '1h 30m', '2h', '3h', '4h'];
}

/**
 * Validate and format user input for time estimation
 * Returns formatted string or null if invalid
 */
export function validateAndFormatTimeInput(input: string): string | null {
  const minutes = parseTimeToMinutes(input);
  if (minutes === null) return null;
  return formatMinutesToDisplay(minutes);
}

/**
 * Simplify task names for timeline display
 * Extract key words while preserving context
 */
export function simplifyTaskName(taskName: string): string {
  if (!taskName || taskName.length <= 20) return taskName;
  
  // Remove common filler words but keep important context
  const fillerWords = ['with', 'the', 'for', 'on', 'in', 'at', 'to', 'of', 'and', 'or', 'but', 'a', 'an'];
  
  // Split into words and filter
  const words = taskName.split(' ');
  
  // Always keep first 2-3 important words
  const importantWords: string[] = [];
  
  for (let i = 0; i < words.length && importantWords.length < 3; i++) {
    const word = words[i].toLowerCase();
    
    // Always include the first word
    if (i === 0) {
      importantWords.push(words[i]);
      continue;
    }
    
    // Skip common filler words unless it's short
    if (!fillerWords.includes(word) || words.length <= 4) {
      importantWords.push(words[i]);
    }
  }
  
  const simplified = importantWords.join(' ');
  
  // If still too long, truncate with ellipsis
  return simplified.length > 25 ? simplified.substring(0, 22) + '...' : simplified;
}

/**
 * Round time to nearest 10-minute block
 */
function roundToNearest10Minutes(date: Date): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 10) * 10;
  
  if (roundedMinutes === 60) {
    rounded.setHours(rounded.getHours() + 1);
    rounded.setMinutes(0);
  } else {
    rounded.setMinutes(roundedMinutes);
  }
  
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  
  return rounded;
}

/**
 * Calculate timeline blocks from current time
 */
export interface TimelineBlock {
  taskName: string;
  simplifiedName: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  startTimeString: string;
  endTimeString: string;
}

export function calculateTimelineBlocks(
  tasks: string[],
  timeEstimates: Record<string, string>,
  startTime: Date = new Date()
): TimelineBlock[] {
  const blocks: TimelineBlock[] = [];
  let currentTime = roundToNearest10Minutes(startTime);
  
  tasks.forEach((taskName) => {
    const timeEstimate = timeEstimates[taskName];
    const durationMinutes = timeEstimate ? parseTimeToMinutes(timeEstimate) || 15 : 15;
    
    const blockStartTime = new Date(currentTime);
    const blockEndTime = new Date(currentTime.getTime() + durationMinutes * 60000);
    
    blocks.push({
      taskName,
      simplifiedName: simplifyTaskName(taskName),
      startTime: blockStartTime,
      endTime: blockEndTime,
      durationMinutes,
      startTimeString: blockStartTime.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      endTimeString: blockEndTime.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    });
    
    currentTime = blockEndTime;
  });
  
  return blocks;
}