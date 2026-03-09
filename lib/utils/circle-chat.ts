import { supabase } from '../supabase/client';
import { CircleMessageWithProfile } from '@/types';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Send a message to a circle chat.
 * RLS ensures only circle members can insert.
 */
export async function sendCircleMessage(
  circleId: string,
  userId: string,
  content: string
): Promise<void> {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 2000) {
    throw new Error('Message must be between 1 and 2000 characters');
  }

  const { error } = await supabase
    .from('circle_messages')
    .insert({
      circle_id: circleId,
      user_id: userId,
      content: trimmed,
    });

  if (error) throw error;
}

/**
 * Fetch paginated messages for a circle (newest first).
 * Uses `created_at` cursor for efficient pagination.
 */
export async function getCircleMessages(
  circleId: string,
  limit: number = 50,
  before?: string
): Promise<CircleMessageWithProfile[]> {
  // Fetch messages (no FK join to profiles — user_id references auth.users)
  let query = supabase
    .from('circle_messages')
    .select('id, circle_id, user_id, content, created_at')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data: messages, error } = await query;
  if (error) throw error;
  if (!messages || messages.length === 0) return [];

  // Batch-fetch profiles for all unique user IDs
  const userIds = [...new Set(messages.map((m) => m.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, username, profile_picture_url')
    .in('id', userIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, {
      first_name: p.first_name,
      last_name: p.last_name,
      username: p.username,
      profile_picture_url: p.profile_picture_url,
    }])
  );

  const fallbackProfile = { first_name: null, last_name: null, username: null, profile_picture_url: null };

  return messages.map((m) => ({
    ...m,
    profile: profileMap.get(m.user_id) || fallbackProfile,
  }));
}

/**
 * Subscribe to new messages in a circle via Supabase Realtime.
 * Returns the channel for cleanup.
 */
export function subscribeToCircleMessages(
  circleId: string,
  onMessage: (message: CircleMessageWithProfile) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`circle-chat-${circleId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'circle_messages',
        filter: `circle_id=eq.${circleId}`,
      },
      async (payload) => {
        const newRow = payload.new as {
          id: string;
          circle_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };

        // Fetch the sender's profile to enrich the message
        const profile = await getUserProfileForMessage(newRow.user_id);

        const enriched: CircleMessageWithProfile = {
          ...newRow,
          profile,
        };

        onMessage(enriched);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Fetch a user's profile fields needed for chat display.
 */
async function getUserProfileForMessage(
  userId: string
): Promise<CircleMessageWithProfile['profile']> {
  const { data, error } = await supabase
    .from('profiles')
    .select('first_name, last_name, username, profile_picture_url')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return { first_name: null, last_name: null, username: null, profile_picture_url: null };
  }

  return data;
}
