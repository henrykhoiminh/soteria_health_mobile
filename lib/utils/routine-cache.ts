/**
 * Simple in-memory cache for routine execution data.
 * Prefetched on the detail page so the execute screen
 * can render immediately without its loading state.
 */

import { AvatarLightState, Routine } from '@/types';

interface RoutineCacheData {
  routine: Routine;
  startingLightState: 'Dormant' | 'Sleepy';
  initialAvatarState: AvatarLightState;
  timestamp: number;
}

let cachedData: RoutineCacheData | null = null;

// Cache is valid for 30 seconds
const CACHE_TTL_MS = 30000;

/**
 * Store prefetched routine execution data in cache
 */
export function setRoutineCache(data: Omit<RoutineCacheData, 'timestamp'>): void {
  cachedData = {
    ...data,
    timestamp: Date.now(),
  };
}

/**
 * Get cached routine data if available, ID matches, and not expired.
 * Returns null if cache is empty, expired, or for a different routine.
 */
export function getRoutineCache(routineId: string): Omit<RoutineCacheData, 'timestamp'> | null {
  if (!cachedData) {
    return null;
  }

  if (cachedData.routine.id !== routineId) {
    return null;
  }

  const age = Date.now() - cachedData.timestamp;
  if (age > CACHE_TTL_MS) {
    cachedData = null;
    return null;
  }

  const { timestamp, ...data } = cachedData;
  return data;
}

/**
 * Clear the routine cache
 */
export function clearRoutineCache(): void {
  cachedData = null;
}
