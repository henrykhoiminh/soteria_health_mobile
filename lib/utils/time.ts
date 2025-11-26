/**
 * Time formatting utilities for exercise and routine durations
 */

/**
 * Format seconds to MM:SS display format (e.g., "1:30")
 * Used in timer displays during routine execution
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to a readable duration string
 * Examples: "30s", "1m 30s", "2m"
 * Used for displaying exercise durations on cards and lists
 */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (seconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}

/**
 * Parse minutes and seconds strings into total seconds
 * Returns the total seconds, handling empty/invalid inputs
 */
export function parseMinutesSeconds(minutesStr: string, secondsStr: string): number {
  const minutes = parseInt(minutesStr, 10) || 0;
  const seconds = parseInt(secondsStr, 10) || 0;
  return minutes * 60 + seconds;
}

/**
 * Convert total seconds to minutes and seconds components
 * Returns { minutes, seconds } object
 */
export function secondsToMinutesSeconds(totalSeconds: number): { minutes: number; seconds: number } {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { minutes, seconds };
}

/**
 * Validate duration is within acceptable range
 * @param totalSeconds - Duration in seconds to validate
 * @param minSeconds - Minimum allowed (default 5 seconds)
 * @param maxSeconds - Maximum allowed (default 30 minutes = 1800 seconds)
 * @returns Error message if invalid, null if valid
 */
export function validateDuration(
  totalSeconds: number,
  minSeconds: number = 5,
  maxSeconds: number = 1800
): string | null {
  if (totalSeconds < minSeconds) {
    return `Duration must be at least ${formatDuration(minSeconds)}`;
  }
  if (totalSeconds > maxSeconds) {
    return `Duration cannot exceed ${formatDuration(maxSeconds)}`;
  }
  return null;
}
