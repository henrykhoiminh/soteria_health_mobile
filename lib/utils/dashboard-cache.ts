/**
 * Simple in-memory cache for dashboard data
 * Used to preload data during routine completion animation
 * so navigation to dashboard is instant
 */

import { ActivityFeedItem, AvatarState, DailyProgress, HarmonyStatus, PainCheckIn, PainStatistics, UserStats } from '@/types';

interface DashboardCacheData {
  todayProgress: DailyProgress | null;
  stats: UserStats | null;
  friendActivity: ActivityFeedItem[];
  avatarStates: AvatarState[];
  painStats: PainStatistics | null;
  painHistory: PainCheckIn[];
  harmonyStatus: HarmonyStatus | null;
  timestamp: number;
}

let cachedData: DashboardCacheData | null = null;

// Cache is valid for 30 seconds
const CACHE_TTL_MS = 30000;

/**
 * Store preloaded dashboard data in cache
 */
export function setDashboardCache(data: Omit<DashboardCacheData, 'timestamp'>): void {
  cachedData = {
    ...data,
    timestamp: Date.now(),
  };
}

/**
 * Get cached dashboard data if available and not expired
 * Returns null if cache is empty or expired
 */
export function getDashboardCache(): Omit<DashboardCacheData, 'timestamp'> | null {
  if (!cachedData) {
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
 * Clear the dashboard cache
 */
export function clearDashboardCache(): void {
  cachedData = null;
}
