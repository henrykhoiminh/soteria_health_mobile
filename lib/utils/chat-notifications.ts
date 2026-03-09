import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase/client';

const KEY_PREFIX = '@soteria_chat_last_read';

function buildKey(userId: string, circleId: string): string {
  return `${KEY_PREFIX}:${userId}:${circleId}`;
}

/**
 * Get the last-read timestamp for a specific circle.
 */
export async function getLastReadTimestamp(
  userId: string,
  circleId: string
): Promise<string | null> {
  return AsyncStorage.getItem(buildKey(userId, circleId));
}

/**
 * Set the last-read timestamp for a circle to now.
 */
export async function setLastReadTimestamp(
  userId: string,
  circleId: string
): Promise<void> {
  await AsyncStorage.setItem(buildKey(userId, circleId), new Date().toISOString());
}

/**
 * Batch-load all last-read timestamps for a user's circles.
 * Returns a Map of circleId -> ISO timestamp string.
 */
export async function getAllLastReadTimestamps(
  userId: string
): Promise<Map<string, string>> {
  const allKeys = await AsyncStorage.getAllKeys();
  const prefix = `${KEY_PREFIX}:${userId}:`;
  const matchingKeys = allKeys.filter((k) => k.startsWith(prefix));

  if (matchingKeys.length === 0) return new Map();

  const pairs = await AsyncStorage.multiGet(matchingKeys);
  const result = new Map<string, string>();

  for (const [key, value] of pairs) {
    if (value) {
      const circleId = key.replace(prefix, '');
      result.set(circleId, value);
    }
  }

  return result;
}

/**
 * Query Supabase for the newest message created_at per circle.
 * Returns a Map of circleId -> ISO timestamp string.
 */
export async function getLatestMessageTimestamps(
  circleIds: string[]
): Promise<Map<string, string>> {
  if (circleIds.length === 0) return new Map();

  const results = await Promise.all(
    circleIds.map(async (circleId) => {
      const { data, error } = await supabase
        .from('circle_messages')
        .select('created_at')
        .eq('circle_id', circleId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) return null;
      return { circleId, timestamp: data[0].created_at as string };
    })
  );

  const map = new Map<string, string>();
  for (const entry of results) {
    if (entry) {
      map.set(entry.circleId, entry.timestamp);
    }
  }
  return map;
}
