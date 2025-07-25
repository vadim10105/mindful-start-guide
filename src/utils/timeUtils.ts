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