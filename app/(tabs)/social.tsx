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
  getFormattedGlobalActivity,
  getPendingCircleInvitations,
  acceptCircleInvitation,
  declineCircleInvitation,
} from '@/lib/utils/social';
import {
  sendHealthTeamInvitation,
  hasPendingInvitation,
} from '@/lib/utils/health-team';
import {
  FriendWithProfile,
  FriendRequest,
  UserSearchResult,
  Circle,
  ActivityFeedItem,
  CircleInvitation,
} from '@/types';
import { getLevelFromXp } from '@/lib/utils/leveling';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ActivityCard from '@/components/ActivityCard';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
} from 'react-native';
import SanctumBackground from '@/components/Dashboard/SanctumBackground';
import HapticPressable from '@/components/HapticPressable';
import UserProfileModal from '@/components/UserProfileModal';
import { useChatNotifications } from '@/lib/contexts/ChatNotificationsContext';

type Tab = 'friends' | 'circles' | 'activity';

export default function SocialScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('circles');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Handle tab query parameter from navigation (e.g., from dashboard "See All" link)
  useEffect(() => {
    if (params.tab) {
      const tab = params.tab as Tab;
      if (tab === 'friends' || tab === 'circles' || tab === 'activity') {
        setActiveTab(tab);
      }
    }
  }, [params.tab]);

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
    <SanctumBackground>
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Social</Text>
        <Text style={styles.headerSubtitle}>Connect with friends and wellness circles</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <HapticPressable
          hapticStyle="selection"
          style={[styles.tab, activeTab === 'circles' && styles.tabActive]}
          onPress={() => setActiveTab('circles')}
        >
          <Text style={[styles.tabText, activeTab === 'circles' && styles.tabTextActive]}>
            Circles
          </Text>
        </HapticPressable>
        <HapticPressable
          hapticStyle="selection"
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            Friends
          </Text>
        </HapticPressable>
        <HapticPressable
          hapticStyle="selection"
          style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
          onPress={() => setActiveTab('activity')}
        >
          <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>
            Activity
          </Text>
        </HapticPressable>
      </View>

      {/* Tab Content */}
      {activeTab === 'circles' && <CirclesTab userId={user.id} onRefresh={onRefresh} />}
      {activeTab === 'friends' && <FriendsTab userId={user.id} onRefresh={onRefresh} />}
      {activeTab === 'activity' && <ActivityTab userId={user.id} onRefresh={onRefresh} />}
    </View>
    </SanctumBackground>
  );
}

// =====================================================
// FRIENDS TAB
// =====================================================

function FriendsTab({ userId, onRefresh }: { userId: string; onRefresh: () => void }) {
  const { profile } = useAuth();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [selectedFriend, setSelectedFriend] = useState<FriendWithProfile | null>(null);

  const isHealthTeam = profile?.role === 'health_team' || profile?.role === 'admin';

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

  const handleInviteToHealthTeam = async (inviteeId: string, userName: string) => {
    try {
      // Check if already invited
      const hasPending = await hasPendingInvitation(inviteeId);
      if (hasPending) {
        Alert.alert('Already Invited', `${userName} already has a pending Health Team invitation.`);
        return;
      }

      Alert.alert(
        'Invite to Health Team',
        `Invite ${userName} to join the Soteria Health Team? They will be able to create official routines and edit existing official content.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Invitation',
            onPress: async () => {
              try {
                await sendHealthTeamInvitation(inviteeId);
                setInvitedUsers(prev => new Set(prev).add(inviteeId));
                Alert.alert('Success', `Health Team invitation sent to ${userName}!`);
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to send invitation');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check invitation status');
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
            <HapticPressable onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={AppColors.textSecondary} />
            </HapticPressable>
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
                    <Image
                      source={{ uri: user.profile_picture_url }}
                      style={styles.userAvatarImage}
                    />
                  ) : (
                    <Text style={styles.userAvatarText}>
                      {user.first_name?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  )}
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{getDisplayName(user)}</Text>
                  {user.full_name && user.username && (
                    <Text style={styles.userRealName}>{user.full_name}</Text>
                  )}
                  <View style={styles.userMetaRow}>
                    <Text style={styles.userMeta}>
                      {user.journey_focus || 'New User'}
                    </Text>
                    {(user.total_xp ?? 0) > 0 && (
                      <Text style={styles.levelBadge}>
                        Lv.{getLevelFromXp(user.total_xp ?? 0).level}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.userActions}>
                  {/* Health Team Invite Button (only for health_team/admin viewing non-health_team users) */}
                  {isHealthTeam && user.role === 'user' && !invitedUsers.has(user.id) && (
                    <HapticPressable
                      style={styles.healthTeamInviteButton}
                      onPress={() => handleInviteToHealthTeam(user.id, getDisplayName(user))}
                    >
                      <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                    </HapticPressable>
                  )}
                  {invitedUsers.has(user.id) && (
                    <View style={styles.invitedBadge}>
                      <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                      <Text style={styles.invitedText}>Invited</Text>
                    </View>
                  )}
                  {/* Friend Request Button */}
                  {!user.friendship_status && (
                    <HapticPressable
                      style={styles.addButton}
                      onPress={() => handleSendRequest(user.id)}
                    >
                      <Ionicons name="person-add" size={20} color={AppColors.primary} />
                    </HapticPressable>
                  )}
                  {user.friendship_status === 'pending' && (
                    <Text style={styles.pendingText}>Pending</Text>
                  )}
                  {user.friendship_status === 'accepted' && (
                    <Ionicons name="checkmark-circle" size={24} color={AppColors.success} />
                  )}
                </View>
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
                {request.requester_profile.profile_picture_url ? (
                  <Image
                    source={{ uri: request.requester_profile.profile_picture_url }}
                    style={styles.userAvatarImage}
                  />
                ) : (
                  <Text style={styles.userAvatarText}>
                    {request.requester_profile.first_name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {getDisplayName(request.requester_profile)}
                </Text>
                {request.requester_profile.first_name && request.requester_profile.username && (
                  <Text style={styles.userRealName}>
                    {request.requester_profile.first_name}{request.requester_profile.last_name ? ` ${request.requester_profile.last_name}` : ''}
                  </Text>
                )}
                <Text style={styles.userMeta}>
                  {new Date(request.created_at).toLocaleDateString()}
                </Text>
              </View>
              <HapticPressable
                style={styles.acceptButton}
                onPress={() => handleAcceptRequest(request.id)}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </HapticPressable>
              <HapticPressable
                style={styles.declineButton}
                onPress={() => handleDeclineRequest(request.id)}
              >
                <Ionicons name="close" size={20} color={AppColors.textSecondary} />
              </HapticPressable>
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
              <HapticPressable
                key={friendship.id}
                style={styles.friendCard}
                onPress={() => setSelectedFriend(friendship)}
              >
                <View style={styles.userAvatar}>
                  {friend.profile_picture_url ? (
                    <Image
                      source={{ uri: friend.profile_picture_url }}
                      style={styles.userAvatarImage}
                    />
                  ) : (
                    <Text style={styles.userAvatarText}>
                      {friend.first_name?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  )}
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{getDisplayName(friend)}</Text>
                  {friend.first_name && friend.username && (
                    <Text style={styles.userRealName}>
                      {friend.first_name}{friend.last_name ? ` ${friend.last_name}` : ''}
                    </Text>
                  )}
                  <Text style={styles.userMeta}>
                    Friends since {new Date(friendship.accepted_at!).toLocaleDateString()}
                  </Text>
                </View>
                <HapticPressable
                  hapticStyle="medium"
                  style={styles.unfriendButton}
                  onPress={() => handleUnfriend(friendship.id, friend.first_name || 'this user')}
                >
                  <Ionicons name="trash-outline" size={20} color={AppColors.destructive} />
                </HapticPressable>
              </HapticPressable>
            );
          })
        )}
      </View>

      <View style={{ height: 100 }} />

      <UserProfileModal
        visible={selectedFriend !== null}
        onClose={() => setSelectedFriend(null)}
        profile={selectedFriend?.friend_profile ?? null}
        memberRole="member"
        joinedAt={selectedFriend?.accepted_at ?? ''}
        isCurrentUser={false}
        isCurrentUserAdmin={false}
        onRemoveMember={() => {}}
      />
    </ScrollView>
  );
}

// =====================================================
// CIRCLES TAB
// =====================================================

function CirclesTab({ userId, onRefresh }: { userId: string; onRefresh: () => void }) {
  const router = useRouter();
  const { unreadCircles } = useChatNotifications();
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [publicCircles, setPublicCircles] = useState<Circle[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<CircleInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadCircles();
  }, []);

  const loadCircles = async () => {
    try {
      setLoading(true);
      const [myCirclesData, publicCirclesData, invitationsData] = await Promise.all([
        getUserCircles(userId),
        getPublicCircles(),
        getPendingCircleInvitations(userId),
      ]);

      setMyCircles(myCirclesData);
      setPublicCircles(publicCirclesData);
      setPendingInvitations(invitationsData);
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

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await acceptCircleInvitation(invitationId);
      await loadCircles();
      Alert.alert('Success', 'You have joined the circle!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      await declineCircleInvitation(invitationId);
      await loadCircles();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to decline invitation');
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
        {/* Pending Circle Invitations */}
        {pendingInvitations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Circle Invitations ({pendingInvitations.length})</Text>
            {pendingInvitations.map((invitation) => {
              return (
              <View key={invitation.id} style={styles.invitationCard}>
                <View style={styles.circleIcon}>
                  <Ionicons name="lock-closed" size={24} color={AppColors.primary} />
                </View>
                <View style={styles.invitationInfo}>
                  <Text style={styles.circleName}>Circle Invitation</Text>
                  <Text style={styles.invitationMeta}>
                    Invited by {getDisplayName(invitation.inviter_profile || { full_name: 'Unknown', username: null })}
                  </Text>
                  <Text style={styles.invitationDate}>
                    {new Date(invitation.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.invitationActions}>
                  <HapticPressable
                    style={styles.acceptInviteButton}
                    onPress={() => handleAcceptInvitation(invitation.id)}
                  >
                    <Text style={styles.acceptInviteButtonText}>Accept</Text>
                  </HapticPressable>
                  <HapticPressable
                    style={styles.declineInviteButton}
                    onPress={() => handleDeclineInvitation(invitation.id)}
                  >
                    <Text style={styles.declineInviteButtonText}>Decline</Text>
                  </HapticPressable>
                </View>
              </View>
              );
            })}
          </View>
        )}

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
            myCircles.map((circle) => {
              const isUnread = unreadCircles.get(circle.id) === true;
              return (
                <HapticPressable
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
                    <View style={styles.circleNameRow}>
                      <Text style={[styles.circleName, isUnread && styles.circleNameUnread]}>
                        {circle.name}
                      </Text>
                      {isUnread && (
                        <View style={styles.circleUnreadBadge}>
                          <Ionicons name="chatbubble-ellipses" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.circleDescription} numberOfLines={2}>
                      {circle.description || 'No description'}
                    </Text>
                    <Text style={styles.circleMeta}>{circle.member_count || 0} members</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={AppColors.textSecondary} />
                </HapticPressable>
              );
            })
          )}
        </View>

        {/* Public Circles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discover Public Circles</Text>
          {publicCircles.length === 0 ? (
            <Text style={styles.emptySubtext}>No public circles available</Text>
          ) : (
            publicCircles.map((circle) => {
              const isMember = myCircles.some((mc) => mc.id === circle.id);
              return (
                <HapticPressable
                  key={circle.id}
                  style={styles.circleCard}
                  onPress={() => router.push(`/circles/${circle.id}`)}
                >
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
                  {isMember ? (
                    <Ionicons name="checkmark-circle" size={18} color={AppColors.success} />
                  ) : (
                    <HapticPressable
                      style={styles.joinButton}
                      onPress={() => handleJoinCircle(circle.id)}
                    >
                      <Text style={styles.joinButtonText}>Join</Text>
                    </HapticPressable>
                  )}
                </HapticPressable>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Create Circle Button */}
      <HapticPressable
        style={styles.floatingCreateButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add-circle" size={28} color={AppColors.primaryText} />
        <Text style={styles.floatingCreateButtonText}>Create Circle</Text>
      </HapticPressable>

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
      const activityData = await getFormattedGlobalActivity(userId, 50, 0);
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
          <Text style={styles.emptySubtext}>Add friends or join circles to see activity</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={{ paddingHorizontal: 16 }}>
          <ActivityCard
            activity={item}
            onRoutinePress={(routineId) => router.push(`/routines/${routineId}`)}
            onCirclePress={(circleId) => router.push(`/circles/${circleId}`)}
          />
        </View>
      )}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
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
            <HapticPressable onPress={onClose}>
              <Ionicons name="close" size={28} color={AppColors.textPrimary} />
            </HapticPressable>
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
              <HapticPressable
                hapticStyle="selection"
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
              </HapticPressable>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <HapticPressable
              style={[styles.createModalButton, creating && styles.createModalButtonDisabled]}
              onPress={handleCreate}
              disabled={creating}
            >
              <Text style={styles.createModalButtonText}>
                {creating ? 'Creating...' : 'Create Circle'}
              </Text>
            </HapticPressable>
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
    backgroundColor: 'transparent',
  },
  header: {
    padding: 24,
    paddingTop: 100,
    backgroundColor: AppColors.glassBackground,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 16,
    color: AppColors.textSecondary,
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: AppColors.glassBackground,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.glassEdge,
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
    backgroundColor: AppColors.glassBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.glassEdge,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
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
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userMeta: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  levelBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.primary,
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
    backgroundColor: AppColors.glassBackground,
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
    color: AppColors.primaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    padding: 8,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.glassBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.glassEdge,
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
  floatingCreateButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingCreateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.primaryText,
    letterSpacing: 0.5,
  },
  circleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.glassBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.glassEdge,
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
  circleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  circleName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  circleNameUnread: {
    fontWeight: '700',
    color: AppColors.success,
  },
  circleUnreadBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.success,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: AppColors.primaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  invitationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.glassBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationMeta: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginBottom: 2,
  },
  invitationDate: {
    fontSize: 12,
    color: AppColors.textTertiary,
  },
  invitationActions: {
    flexDirection: 'column',
    gap: 8,
  },
  acceptInviteButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  acceptInviteButtonText: {
    color: AppColors.primaryText,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  declineInviteButton: {
    backgroundColor: AppColors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: AppColors.destructive,
  },
  declineInviteButtonText: {
    color: AppColors.destructive,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: AppColors.glassBackground,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.glassEdge,
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
    backgroundColor: AppColors.glassBackground,
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
    color: AppColors.primaryText,
  },
  errorText: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  healthTeamInviteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  invitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  invitedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
});
