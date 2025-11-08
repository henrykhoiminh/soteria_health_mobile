import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getFriends, getPendingCircleInvitationsByCircle } from '@/lib/utils/social';
import { getDisplayName } from '@/lib/utils/username';
import { FriendWithProfile } from '@/types';

interface FriendInviteModalProps {
  visible: boolean;
  onClose: () => void;
  onInvite: (friendId: string, friendName: string) => Promise<void>;
  currentMemberIds: string[];
  userId: string;
  circleId: string;
}

export default function FriendInviteModal({
  visible,
  onClose,
  onInvite,
  currentMemberIds,
  userId,
  circleId,
}: FriendInviteModalProps) {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<FriendWithProfile[]>([]);
  const [pendingInviteeIds, setPendingInviteeIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadFriends();
      setSearchQuery('');
    }
  }, [visible, userId]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = friends.filter((friendship) => {
        const friend = friendship.friend_profile;
        const displayName = getDisplayName(friend).toLowerCase();
        const fullName = friend.full_name?.toLowerCase() || '';
        const username = friend.username?.toLowerCase() || '';

        return displayName.includes(query) ||
               fullName.includes(query) ||
               username.includes(query);
      });
      setFilteredFriends(filtered);
    } else {
      setFilteredFriends(friends);
    }
  }, [searchQuery, friends]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const [allFriends, pendingInvitees] = await Promise.all([
        getFriends(userId),
        getPendingCircleInvitationsByCircle(circleId),
      ]);

      setPendingInviteeIds(pendingInvitees);

      // Filter out friends who are already members or have pending invitations
      const availableFriends = allFriends.filter(
        (friendship) => !currentMemberIds.includes(friendship.friend_id) &&
                        !pendingInvitees.includes(friendship.friend_id)
      );

      setFriends(availableFriends);
      setFilteredFriends(availableFriends);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (friendId: string, friendName: string) => {
    setInviting(friendId);
    try {
      await onInvite(friendId, friendName);
      // Add to pending invitees and remove from available friends
      setPendingInviteeIds([...pendingInviteeIds, friendId]);
      const updatedFriends = friends.filter(f => f.friend_id !== friendId);
      setFriends(updatedFriends);
      setFilteredFriends(updatedFriends);
    } catch (error) {
      console.error('Error inviting friend:', error);
    } finally {
      setInviting(null);
    }
  };

  const renderFriendItem = ({ item }: { item: FriendWithProfile }) => {
    const friend = item.friend_profile;
    const isInviting = inviting === item.friend_id;

    return (
      <View style={styles.friendItem}>
        <View style={styles.friendAvatar}>
          <Ionicons name="person" size={24} color={AppColors.textSecondary} />
        </View>
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{getDisplayName(friend)}</Text>
          {friend.full_name && friend.username && (
            <Text style={styles.friendRealName}>{friend.full_name}</Text>
          )}
          <Text style={styles.friendMeta}>
            {friend.journey_focus} • {friend.fitness_level}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.inviteButton, isInviting && styles.inviteButtonDisabled]}
          onPress={() => handleInvite(item.friend_id, getDisplayName(friend))}
          disabled={isInviting}
        >
          {isInviting ? (
            <ActivityIndicator size="small" color={AppColors.primary} />
          ) : (
            <Ionicons name="add-circle" size={24} color={AppColors.primary} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Invite Friends</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={AppColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={AppColors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search friends by name or username..."
                placeholderTextColor={AppColors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color={AppColors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Friends List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={AppColors.primary} />
                <Text style={styles.loadingText}>Loading friends...</Text>
              </View>
            ) : filteredFriends.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={AppColors.textTertiary} />
                <Text style={styles.emptyText}>
                  {searchQuery ? `No friends matching "${searchQuery}"` : friends.length === 0 ? 'All friends are already members' : 'No friends to invite'}
                </Text>
                {friends.length === 0 && (
                  <Text style={styles.emptySubtext}>
                    Add more friends to invite them to circles
                  </Text>
                )}
              </View>
            ) : (
              <FlatList
                data={filteredFriends}
                renderItem={renderFriendItem}
                keyExtractor={(item) => item.friend_id}
                style={styles.friendsList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: AppColors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.inputBackground,
    borderRadius: 12,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textPrimary,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: AppColors.textTertiary,
    textAlign: 'center',
  },
  friendsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  friendRealName: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginBottom: 2,
  },
  friendMeta: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  inviteButton: {
    padding: 8,
  },
  inviteButtonDisabled: {
    opacity: 0.5,
  },
});
