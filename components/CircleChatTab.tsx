import { useAuth } from '@/lib/contexts/AuthContext';
import { AppColors } from '@/constants/theme';
import { getDisplayName } from '@/lib/utils/username';
import {
  getCircleMessages,
  sendCircleMessage,
  subscribeToCircleMessages,
} from '@/lib/utils/circle-chat';
import {
  getAvailableRoutinesForCircle,
  shareRoutineToCircle,
} from '@/lib/utils/social';
import { CircleMessageWithProfile, Routine } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HapticPressable from '@/components/HapticPressable';
import { useChatNotifications } from '@/lib/contexts/ChatNotificationsContext';

const PAGE_SIZE = 50;
const ROUTINE_TAG_REGEX = /\[\[routine:([a-f0-9-]+)(?::(\w+))?\]\]$/;

interface CircleChatTabProps {
  circleId: string;
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'Mind': return AppColors.mind;
    case 'Body': return AppColors.body;
    case 'Soul': return AppColors.soul;
    default: return AppColors.primary;
  }
}

export default function CircleChatTab({ circleId }: CircleChatTabProps) {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { markCircleAsRead } = useChatNotifications();
  const [messages, setMessages] = useState<CircleMessageWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showRoutinePicker, setShowRoutinePicker] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Animated value for keyboard-driven bottom offset
  const keyboardOffset = useRef(new Animated.Value(insets.bottom)).current;

  // Mark circle as read when chat tab is mounted
  useEffect(() => {
    markCircleAsRead(circleId);
  }, [circleId, markCircleAsRead]);

  // Keyboard listeners — animate input bar in sync with keyboard
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (e) => {
      Animated.spring(keyboardOffset, {
        toValue: e.endCoordinates.height + 8,
        damping: 20,
        stiffness: 300,
        mass: 0.5,
        useNativeDriver: false,
      }).start();
    });

    const onHide = Keyboard.addListener(hideEvent, (e) => {
      Animated.spring(keyboardOffset, {
        toValue: insets.bottom,
        damping: 20,
        stiffness: 300,
        mass: 0.5,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [insets.bottom]);

  // Load initial messages
  useEffect(() => {
    loadMessages();
  }, [circleId]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = subscribeToCircleMessages(circleId, (newMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [newMessage, ...prev];
      });
      // Mark as read since user is actively viewing chat
      markCircleAsRead(circleId);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [circleId, markCircleAsRead]);

  const loadMessages = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await getCircleMessages(circleId, PAGE_SIZE);
      setMessages(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOlderMessages = async (): Promise<void> => {
    if (loadingMore || !hasMore || messages.length === 0) return;

    try {
      setLoadingMore(true);
      const oldest = messages[messages.length - 1];
      const data = await getCircleMessages(circleId, PAGE_SIZE, oldest.created_at);
      setMessages((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSend = async (): Promise<void> => {
    if (!user || !inputText.trim() || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const sentMessage = await sendCircleMessage(circleId, user.id, text);
      // Add to list immediately so the sender sees their own bubble
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMessage.id)) return prev;
        return [sentMessage, ...prev];
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const handleShareRoutine = async (routine: Routine): Promise<void> => {
    if (!user) return;

    setShowRoutinePicker(false);

    try {
      await shareRoutineToCircle(circleId, routine.id, user.id);
      // Send a chat message with embedded routine ID for navigation
      const sentMessage = await sendCircleMessage(
        circleId,
        user.id,
        `Shared a routine: ${routine.name}\n(${routine.category} - ${routine.duration_minutes} min) [[routine:${routine.id}:${routine.category}]]`
      );
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMessage.id)) return prev;
        return [sentMessage, ...prev];
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to share routine');
    }
  };

  const formatTime = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (diffDays === 0) return time;
    if (diffDays === 1) return `Yesterday ${time}`;
    if (diffDays < 7) {
      const day = date.toLocaleDateString([], { weekday: 'short' });
      return `${day} ${time}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` ${time}`;
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: CircleMessageWithProfile }) => {
      const isOwn = item.user_id === user?.id;
      const displayName = item.profile
        ? getDisplayName(item.profile)
        : 'Unknown';
      const initial = item.profile?.first_name?.charAt(0).toUpperCase() || 'U';

      // Check if this is a routine share message
      const routineMatch = item.content.match(ROUTINE_TAG_REGEX);
      const routineId = routineMatch ? routineMatch[1] : null;
      const routineCategory = routineMatch ? routineMatch[2] : null;
      const displayContent = routineId
        ? item.content.replace(ROUTINE_TAG_REGEX, '').trim()
        : item.content;

      // Routine share bubbles use the category color
      const isRoutineShare = !!routineId;
      const routineBubbleColor = routineCategory
        ? getCategoryColor(routineCategory)
        : AppColors.primary;

      const bubbleContent = (
        <>
          {!isOwn && (
            <Text style={[styles.senderName, isRoutineShare && styles.senderNameRoutine]}>
              {displayName}
            </Text>
          )}
          <Text style={[styles.messageText, isOwn && styles.messageTextOwn, isRoutineShare && styles.messageTextLight]}>
            {displayContent}
          </Text>
          {routineId && (
            <View style={styles.routineLink}>
              <Text style={styles.routineLinkText}>Tap to view routine</Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.85)" />
            </View>
          )}
          <Text style={[styles.timestamp, isOwn && styles.timestampOwn, isRoutineShare && styles.timestampLight]}>
            {formatTime(item.created_at)}
          </Text>
        </>
      );

      return (
        <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
          {!isOwn && (
            <View style={styles.avatarContainer}>
              {item.profile?.profile_picture_url ? (
                <Image
                  source={{ uri: item.profile.profile_picture_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              )}
            </View>
          )}

          {routineId ? (
            <HapticPressable
              style={[styles.bubble, { backgroundColor: routineBubbleColor }, styles.bubbleRoutine]}
              onPress={() => router.push(`/routines/${routineId}`)}
            >
              {bubbleContent}
            </HapticPressable>
          ) : (
            <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
              {bubbleContent}
            </View>
          )}
        </View>
      );
    },
    [user?.id, formatTime, router]
  );

  const keyExtractor = useCallback((item: CircleMessageWithProfile) => item.id, []);

  const hasText = inputText.trim().length > 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Message List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        inverted
        contentContainerStyle={styles.listContent}
        onEndReached={loadOlderMessages}
        onEndReachedThreshold={0.3}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              size="small"
              color={AppColors.textTertiary}
              style={styles.loadingMore}
            />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={AppColors.textTertiary} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        }
      />

      {/* Input Bar */}
      <Animated.View style={[styles.inputBarWrapper, { paddingBottom: keyboardOffset }]}>
        <View style={styles.inputBarContainer}>
          {/* Share routine button */}
          <HapticPressable
            style={styles.plusButton}
            onPress={() => setShowRoutinePicker(true)}
          >
            <Ionicons name="add" size={24} color={AppColors.primary} />
          </HapticPressable>

          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={AppColors.textPlaceholder}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
          />

          {/* Send button — only visible when there's text */}
          {hasText && (
            <View
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onTouchEnd={handleSend}
            >
              {sending ? (
                <ActivityIndicator size="small" color={AppColors.primaryText} />
              ) : (
                <Ionicons name="send" size={18} color={AppColors.primaryText} />
              )}
            </View>
          )}
        </View>
      </Animated.View>

      {/* Routine Picker Modal */}
      <ShareRoutineModal
        visible={showRoutinePicker}
        circleId={circleId}
        onClose={() => setShowRoutinePicker(false)}
        onSelect={handleShareRoutine}
      />
    </View>
  );
}

// =====================================================
// SHARE ROUTINE MODAL
// =====================================================

function ShareRoutineModal({
  visible,
  circleId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  circleId: string;
  onClose: () => void;
  onSelect: (routine: Routine) => void;
}) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) {
      loadRoutines();
    }
  }, [visible]);

  const loadRoutines = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await getAvailableRoutinesForCircle(circleId);
      setRoutines(data);
    } catch (error) {
      console.error('Error loading routines:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? routines.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.description.toLowerCase().includes(search.toLowerCase())
      )
    : routines;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.content}>
          {/* Header */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Share a Routine</Text>
            <HapticPressable onPress={onClose}>
              <Ionicons name="close" size={28} color={AppColors.textPrimary} />
            </HapticPressable>
          </View>

          {/* Search */}
          <View style={modalStyles.searchContainer}>
            <Ionicons name="search" size={20} color={AppColors.textTertiary} />
            <TextInput
              style={modalStyles.searchInput}
              placeholder="Search routines..."
              placeholderTextColor={AppColors.textPlaceholder}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Routine List */}
          {loading ? (
            <View style={modalStyles.loadingContainer}>
              <ActivityIndicator size="large" color={AppColors.primary} />
            </View>
          ) : filtered.length === 0 ? (
            <View style={modalStyles.emptyContainer}>
              <Ionicons name="barbell-outline" size={48} color={AppColors.textTertiary} />
              <Text style={modalStyles.emptyText}>
                {search ? 'No routines match your search' : 'No routines available to share'}
              </Text>
            </View>
          ) : (
            <ScrollView style={modalStyles.list}>
              {filtered.map((routine) => (
                <HapticPressable
                  key={routine.id}
                  style={modalStyles.routineCard}
                  onPress={() => onSelect(routine)}
                >
                  <View style={modalStyles.routineHeader}>
                    <View
                      style={[
                        modalStyles.categoryDot,
                        { backgroundColor: getCategoryColor(routine.category) },
                      ]}
                    />
                    <Text style={modalStyles.routineName} numberOfLines={1}>
                      {routine.name}
                    </Text>
                  </View>
                  <Text style={modalStyles.routineDescription} numberOfLines={2}>
                    {routine.description}
                  </Text>
                  <Text style={modalStyles.routineMeta}>
                    {routine.duration_minutes} min  {routine.difficulty}
                  </Text>
                </HapticPressable>
              ))}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // Message row
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  messageRowOwn: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },

  // Avatar
  avatarContainer: {
    marginRight: 8,
    marginBottom: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primary,
  },

  // Bubble
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  bubbleOwn: {
    backgroundColor: AppColors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: AppColors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },

  // Text
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.primary,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    color: AppColors.textPrimary,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: AppColors.primaryText,
  },
  messageTextLight: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 11,
    color: AppColors.textTertiary,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timestampOwn: {
    color: 'rgba(26, 26, 26, 0.5)',
  },
  timestampLight: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  senderNameRoutine: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  bubbleRoutine: {
    borderBottomLeftRadius: 4,
  },

  // Routine share link
  routineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
  },
  routineLinkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: 48,
    transform: [{ scaleY: -1 }],
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: AppColors.textTertiary,
  },

  // Loading more indicator
  loadingMore: {
    paddingVertical: 16,
  },

  // Input bar
  inputBarWrapper: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
  },
  inputBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 4,
  },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: AppColors.textPrimary,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.inputBackground,
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: AppColors.textPrimary,
    paddingVertical: 12,
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: AppColors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 20,
  },
  routineCard: {
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routineName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  routineDescription: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  routineMeta: {
    fontSize: 12,
    color: AppColors.textTertiary,
  },
});
