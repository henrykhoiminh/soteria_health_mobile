import { useAuth } from '@/lib/contexts/AuthContext';
import { AppColors } from '@/constants/theme';
import { getDisplayName } from '@/lib/utils/username';
import {
  getFriends,
  getPendingFriendRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  unfriend,
  getUserCircles,
  getPublicCircles,
  createCircle,
  joinCircle,
  getFormattedFriendActivity,
} from '@/lib/utils/social';
import {
  FriendWithProfile,
  FriendRequest,
  UserSearchResult,
  Circle,
  ActivityFeedItem,
} from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';

type Tab = 'friends' | 'circles' | 'activity';

export default function SocialScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, [activeTab]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, activeTab]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load data based on active tab - will be handled in individual components
    } catch (error) {
      console.error('Error loading social data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please sign in to access social features</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Social</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'circles' && styles.tabActive]}
          onPress={() => setActiveTab('circles')}
        >
          <Text style={[styles.tabText, activeTab === 'circles' && styles.tabTextActive]}>
            Circles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
          onPress={() => setActiveTab('activity')}
        >
          <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>
            Activity
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'friends' && <FriendsTab userId={user.id} onRefresh={onRefresh} />}
      {activeTab === 'circles' && <CirclesTab userId={user.id} onRefresh={onRefresh} />}
      {activeTab === 'activity' && <ActivityTab userId={user.id} onRefresh={onRefresh} />}
    </View>
  );
}

// =====================================================
// FRIENDS TAB
// =====================================================

function FriendsTab({ userId, onRefresh }: { userId: string; onRefresh: () => void }) {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const [friendsData, requestsData] = await Promise.all([
        getFriends(userId),
        getPendingFriendRequests(userId),
      ]);
      setFriends(friendsData);
      setPendingRequests(requestsData);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFriends();
    setRefreshing(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await searchUsers(query, userId);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (friendId: string) => {
    try {
      await sendFriendRequest(userId, friendId);
      Alert.alert('Success', 'Friend request sent!');
      handleSearch(searchQuery); // Refresh search results
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await acceptFriendRequest(friendshipId);
      await loadFriends();
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept request');
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    try {
      await declineFriendRequest(friendshipId);
      await loadFriends();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to decline request');
    }
  };

  const handleUnfriend = async (friendshipId: string, friendName: string) => {
    Alert.alert(
      'Unfriend?',
      `Remove ${friendName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfriend',
          style: 'destructive',
          onPress: async () => {
            try {
              await unfriend(friendshipId);
              await loadFriends();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unfriend');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Find Friends Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Find Friends</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={AppColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name"
            placeholderTextColor={AppColors.textPlaceholder}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="words"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={AppColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Searching indicator */}
        {searching && (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="small" color={AppColors.primary} />
            <Text style={styles.searchingText}>Searching...</Text>
          </View>
        )}

        {/* No results message */}
        {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={32} color={AppColors.textTertiary} />
            <Text style={styles.noResultsText}>No users found</Text>
            <Text style={styles.noResultsSubtext}>Try a different search term</Text>
          </View>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            <Text style={styles.resultsCount}>
              {searchResults.length} {searchResults.length === 1 ? 'user' : 'users'} found
            </Text>
            {searchResults.map((user) => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userAvatar}>
                  {user.profile_picture_url ? (
                    <Text style={styles.avatarText}>👤</Text>
                  ) : (
                    <Ionicons name="person" size={24} color={AppColors.textSecondary} />
                  )}
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{getDisplayName(user)}</Text>
                  {user.full_name && user.username && (
                    <Text style={styles.userRealName}>{user.full_name}</Text>
                  )}
                  <Text style={styles.userMeta}>
                    {user.journey_focus} • {user.fitness_level}
                  </Text>
                </View>
                {!user.friendship_status && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleSendRequest(user.id)}
                  >
                    <Ionicons name="person-add" size={20} color={AppColors.primary} />
                  </TouchableOpacity>
                )}
                {user.friendship_status === 'pending' && (
                  <Text style={styles.pendingText}>Pending</Text>
                )}
                {user.friendship_status === 'accepted' && (
                  <Ionicons name="checkmark-circle" size={24} color={AppColors.success} />
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Requests ({pendingRequests.length})</Text>
          {pendingRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={24} color={AppColors.textSecondary} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {getDisplayName(request.requester_profile)}
                </Text>
                {request.requester_profile.full_name && request.requester_profile.username && (
                  <Text style={styles.userRealName}>{request.requester_profile.full_name}</Text>
                )}
                <Text style={styles.userMeta}>
                  {new Date(request.created_at).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptRequest(request.id)}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => handleDeclineRequest(request.id)}
              >
                <Ionicons name="close" size={20} color={AppColors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* My Friends */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Friends ({friends.length})</Text>
        {friends.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={AppColors.textTertiary} />
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySubtext}>Search above to find and add friends</Text>
          </View>
        ) : (
          friends.map((friendship) => {
            const friend = friendship.friend_profile;
            return (
              <View key={friendship.id} style={styles.friendCard}>
                <View style={styles.userAvatar}>
                  <Ionicons name="person" size={24} color={AppColors.textSecondary} />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{getDisplayName(friend)}</Text>
                  {friend.full_name && friend.username && (
                    <Text style={styles.userRealName}>{friend.full_name}</Text>
                  )}
                  <Text style={styles.userMeta}>
                    Friends since {new Date(friendship.accepted_at!).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.unfriendButton}
                  onPress={() => handleUnfriend(friendship.id, friend.full_name || 'this user')}
                >
                  <Ionicons name="trash-outline" size={20} color={AppColors.destructive} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// =====================================================
// CIRCLES TAB
// =====================================================

function CirclesTab({ userId, onRefresh }: { userId: string; onRefresh: () => void }) {
  const router = useRouter();
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [publicCircles, setPublicCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadCircles();
  }, []);

  const loadCircles = async () => {
    try {
      setLoading(true);
      const [myCirclesData, publicCirclesData] = await Promise.all([
        getUserCircles(userId),
        getPublicCircles(),
      ]);
      setMyCircles(myCirclesData);
      setPublicCircles(publicCirclesData);
    } catch (error) {
      console.error('Error loading circles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCircles();
    setRefreshing(false);
  };

  const handleJoinCircle = async (circleId: string) => {
    try {
      await joinCircle(circleId, userId);
      await loadCircles();
      Alert.alert('Success', 'Joined circle!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join circle');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Create Circle Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add-circle" size={24} color={AppColors.textPrimary} />
            <Text style={styles.createButtonText}>Create Circle</Text>
          </TouchableOpacity>
        </View>

        {/* My Circles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Circles ({myCircles.length})</Text>
          {myCircles.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-circle-outline" size={48} color={AppColors.textTertiary} />
              <Text style={styles.emptyText}>No circles yet</Text>
              <Text style={styles.emptySubtext}>Create or join a circle to get started</Text>
            </View>
          ) : (
            myCircles.map((circle) => (
              <TouchableOpacity
                key={circle.id}
                style={styles.circleCard}
                onPress={() => router.push(`/circles/${circle.id}`)}
              >
                <View style={styles.circleIcon}>
                  <Ionicons
                    name={circle.is_private ? 'lock-closed' : 'globe'}
                    size={24}
                    color={AppColors.primary}
                  />
                </View>
                <View style={styles.circleInfo}>
                  <Text style={styles.circleName}>{circle.name}</Text>
                  <Text style={styles.circleDescription} numberOfLines={2}>
                    {circle.description || 'No description'}
                  </Text>
                  <Text style={styles.circleMeta}>{circle.member_count || 0} members</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={AppColors.textSecondary} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Public Circles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discover Public Circles</Text>
          {publicCircles.length === 0 ? (
            <Text style={styles.emptySubtext}>No public circles available</Text>
          ) : (
            publicCircles
              .filter((circle) => !myCircles.some((mc) => mc.id === circle.id))
              .map((circle) => (
                <View key={circle.id} style={styles.circleCard}>
                  <View style={styles.circleIcon}>
                    <Ionicons name="globe" size={24} color={AppColors.primary} />
                  </View>
                  <View style={styles.circleInfo}>
                    <Text style={styles.circleName}>{circle.name}</Text>
                    <Text style={styles.circleDescription} numberOfLines={2}>
                      {circle.description || 'No description'}
                    </Text>
                    <Text style={styles.circleMeta}>{circle.member_count || 0} members</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={() => handleJoinCircle(circle.id)}
                  >
                    <Text style={styles.joinButtonText}>Join</Text>
                  </TouchableOpacity>
                </View>
              ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Create Circle Modal */}
      <CreateCircleModal
        visible={showCreateModal}
        userId={userId}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadCircles();
        }}
      />
    </>
  );
}

// =====================================================
// ACTIVITY TAB
// =====================================================

function ActivityTab({ userId, onRefresh }: { userId: string; onRefresh: () => void }) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    try {
      setLoading(true);
      const activityData = await getFormattedFriendActivity(userId, 50);
      setActivities(activityData);
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActivity();
    setRefreshing(false);
  };

  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  };

  const getActivityIcon = (type: string): string => {
    switch (type) {
      case 'completed_routine':
        return 'checkmark-circle';
      case 'created_routine':
        return 'add-circle';
      case 'streak_milestone':
        return 'flame';
      case 'joined_circle':
        return 'people';
      case 'shared_routine':
        return 'share-social';
      default:
        return 'radio-button-on';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.tabContent}
      data={activities}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ListEmptyComponent={() => (
        <View style={styles.emptyState}>
          <Ionicons name="newspaper-outline" size={48} color={AppColors.textTertiary} />
          <Text style={styles.emptyText}>No activity yet</Text>
          <Text style={styles.emptySubtext}>Add friends to see their activity</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.activityCard}
          onPress={() => {
            if (item.routineId) {
              router.push(`/routines/${item.routineId}`);
            }
          }}
        >
          <View style={styles.activityIconContainer}>
            <Ionicons
              name={getActivityIcon(item.activityType) as any}
              size={24}
              color={AppColors.primary}
            />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>
              <Text style={styles.activityUserName}>{item.user.full_name}</Text>{' '}
              {item.message}
            </Text>
            <Text style={styles.activityTime}>{getTimeAgo(item.timestamp)}</Text>
          </View>
        </TouchableOpacity>
      )}
      contentContainerStyle={{ paddingBottom: 100 }}
    />
  );
}

// =====================================================
// CREATE CIRCLE MODAL
// =====================================================

function CreateCircleModal({
  visible,
  userId,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a circle name');
      return;
    }

    try {
      setCreating(true);
      await createCircle(userId, name.trim(), description.trim(), isPrivate);
      Alert.alert('Success', 'Circle created!');
      setName('');
      setDescription('');
      setIsPrivate(true);
      onSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create circle');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Circle</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={AppColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Circle Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Recovery Warriors"
              placeholderTextColor={AppColors.textPlaceholder}
              value={name}
              onChangeText={setName}
              maxLength={100}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What is this circle about?"
              placeholderTextColor={AppColors.textPlaceholder}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <View style={styles.privacyOption}>
              <TouchableOpacity
                style={styles.privacyToggle}
                onPress={() => setIsPrivate(!isPrivate)}
              >
                <Ionicons
                  name={isPrivate ? 'lock-closed' : 'globe'}
                  size={24}
                  color={AppColors.primary}
                />
                <View style={styles.privacyInfo}>
                  <Text style={styles.privacyTitle}>
                    {isPrivate ? 'Private Circle' : 'Public Circle'}
                  </Text>
                  <Text style={styles.privacyDescription}>
                    {isPrivate
                      ? 'Only invited members can join'
                      : 'Anyone can discover and join'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.createModalButton, creating && styles.createModalButtonDisabled]}
              onPress={handleCreate}
              disabled={creating}
            >
              <Text style={styles.createModalButtonText}>
                {creating ? 'Creating...' : 'Create Circle'}
              </Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: AppColors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: AppColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: AppColors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  tabTextActive: {
    color: AppColors.primary,
  },
  tabContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.inputBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  searchingText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginTop: 12,
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 13,
    color: AppColors.textTertiary,
  },
  searchResults: {
    marginTop: 16,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  userRealName: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginBottom: 2,
  },
  userMeta: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  addButton: {
    padding: 8,
  },
  pendingText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontStyle: 'italic',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  acceptButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  acceptButtonText: {
    color: AppColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    padding: 8,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  unfriendButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
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
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  circleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  circleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  circleInfo: {
    flex: 1,
  },
  circleName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  circleDescription: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  circleMeta: {
    fontSize: 12,
    color: AppColors.textTertiary,
  },
  joinButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  joinButtonText: {
    color: AppColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: AppColors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  activityUserName: {
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 12,
    color: AppColors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AppColors.inputBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: AppColors.textPrimary,
    borderWidth: 1,
    borderColor: AppColors.border,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  privacyOption: {
    marginTop: 8,
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
  },
  privacyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  privacyDescription: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
  },
  createModalButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  createModalButtonDisabled: {
    opacity: 0.5,
  },
  createModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  errorText: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
});
