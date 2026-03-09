import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getUserCircles } from '../utils/social';
import { subscribeToCircleMessages } from '../utils/circle-chat';
import {
  getAllLastReadTimestamps,
  getLatestMessageTimestamps,
  setLastReadTimestamp,
} from '../utils/chat-notifications';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatNotificationsContextType {
  unreadCircles: Map<string, boolean>;
  hasAnyUnread: boolean;
  markCircleAsRead: (circleId: string) => void;
  refreshUnreadState: () => Promise<void>;
}

const ChatNotificationsContext = createContext<ChatNotificationsContextType | undefined>(undefined);

export function ChatNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCircles, setUnreadCircles] = useState<Map<string, boolean>>(new Map());
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const circleIdsRef = useRef<string[]>([]);

  const hasAnyUnread = Array.from(unreadCircles.values()).some(Boolean);

  const cleanup = useCallback(() => {
    for (const channel of channelsRef.current) {
      channel.unsubscribe();
    }
    channelsRef.current = [];
  }, []);

  const refreshUnreadState = useCallback(async () => {
    if (!user) return;

    try {
      const circles = await getUserCircles(user.id);
      const circleIds = circles.map((c) => c.id);
      circleIdsRef.current = circleIds;

      if (circleIds.length === 0) {
        setUnreadCircles(new Map());
        cleanup();
        return;
      }

      const [lastRead, latestMessages] = await Promise.all([
        getAllLastReadTimestamps(user.id),
        getLatestMessageTimestamps(circleIds),
      ]);

      // Compare timestamps to determine unread status
      const newUnread = new Map<string, boolean>();
      for (const circleId of circleIds) {
        const lastReadTs = lastRead.get(circleId);
        const latestMsgTs = latestMessages.get(circleId);

        if (!latestMsgTs) {
          // No messages in circle
          newUnread.set(circleId, false);
        } else if (!lastReadTs) {
          // Never read — has messages → unread
          newUnread.set(circleId, true);
        } else {
          newUnread.set(circleId, latestMsgTs > lastReadTs);
        }
      }
      setUnreadCircles(newUnread);

      // Tear down old subscriptions and set up new ones
      cleanup();
      const newChannels: RealtimeChannel[] = [];
      for (const circleId of circleIds) {
        const channel = subscribeToCircleMessages(circleId, (message) => {
          if (message.user_id !== user.id) {
            setUnreadCircles((prev) => {
              const next = new Map(prev);
              next.set(circleId, true);
              return next;
            });
          }
        });
        newChannels.push(channel);
      }
      channelsRef.current = newChannels;
    } catch (error) {
      console.error('Error refreshing unread state:', error);
    }
  }, [user, cleanup]);

  // Hydrate on mount when user exists
  useEffect(() => {
    if (user) {
      refreshUnreadState();
    } else {
      setUnreadCircles(new Map());
      cleanup();
    }

    return cleanup;
  }, [user?.id]);

  const markCircleAsRead = useCallback(
    (circleId: string) => {
      if (!user) return;

      // Optimistic local update
      setUnreadCircles((prev) => {
        if (!prev.get(circleId)) return prev;
        const next = new Map(prev);
        next.set(circleId, false);
        return next;
      });

      // Persist to AsyncStorage
      setLastReadTimestamp(user.id, circleId).catch((err) =>
        console.error('Error persisting last read timestamp:', err)
      );
    },
    [user]
  );

  return (
    <ChatNotificationsContext.Provider
      value={{ unreadCircles, hasAnyUnread, markCircleAsRead, refreshUnreadState }}
    >
      {children}
    </ChatNotificationsContext.Provider>
  );
}

export function useChatNotifications(): ChatNotificationsContextType {
  const context = useContext(ChatNotificationsContext);
  if (!context) {
    throw new Error('useChatNotifications must be used within a ChatNotificationsProvider');
  }
  return context;
}
