import Avatar from '@/components/Avatar';
import CompletedRoutinesModal from '@/components/CompletedRoutinesModal';
import HarmonyModal from '@/components/HarmonyModal';
import JourneyFocusModal from '@/components/JourneyFocusModal';
import PainProgressChart from '@/components/PainProgressChart';
import RecommendedRoutineModal from '@/components/RecommendedRoutineModal';
import UsernameSetupModal from '@/components/UsernameSetupModal';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getRoutinesByCategory, getTodayProgress, getUniqueCompletedRoutines, getUserStats } from '@/lib/utils/dashboard';
import { checkHarmonyRequirements } from '@/lib/utils/harmony';
import { getPainCheckInHistory, getPainLevelInfo, getPainStatistics, getPainTrendInfo } from '@/lib/utils/pain-checkin';
import { getFormattedFriendActivity } from '@/lib/utils/social';
import { getAllAvatarStates } from '@/lib/utils/stats';
import { getDisplayName } from '@/lib/utils/username';
import { searchUsers } from '@/lib/utils/social';
import { sendHealthTeamInvitation, hasPendingInvitation } from '@/lib/utils/health-team';
import { getDashboardCache, clearDashboardCache } from '@/lib/utils/dashboard-cache';
import { ActivityFeedItem, AvatarState, DailyProgress, HarmonyStatus, PainCheckIn, PainStatistics, Routine, RoutineCategory, UserStats, UserSearchResult } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function DashboardScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();

  // Check for cached data immediately on mount to avoid loading flash
  const initialCache = getDashboardCache();
  const [loading, setLoading] = useState(!initialCache);
  const [todayProgress, setTodayProgress] = useState<DailyProgress | null>(initialCache?.todayProgress || null);
  const [stats, setStats] = useState<UserStats | null>(initialCache?.stats || null);
  const [friendActivity, setFriendActivity] = useState<ActivityFeedItem[]>(initialCache?.friendActivity || []);
  const [showJourneyFocusModal, setShowJourneyFocusModal] = useState(false);
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);
  const [avatarStates, setAvatarStates] = useState<AvatarState[]>(initialCache?.avatarStates || []);
  const [painStats, setPainStats] = useState<PainStatistics | null>(initialCache?.painStats || null);
  const [painHistory, setPainHistory] = useState<PainCheckIn[]>(initialCache?.painHistory || []);
  const [showRecommendedModal, setShowRecommendedModal] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RoutineCategory>('Mind');
  const [showCompletedRoutinesModal, setShowCompletedRoutinesModal] = useState(false);
  const [completedRoutines, setCompletedRoutines] = useState<Routine[]>([]);
  const [showHealthTeamInviteModal, setShowHealthTeamInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [harmonyStatus, setHarmonyStatus] = useState<HarmonyStatus | null>(initialCache?.harmonyStatus || null);
  const [showHarmonyModal, setShowHarmonyModal] = useState(false);
  const [cacheUsed] = useState(!!initialCache); // Track if we initialized from cache

  const isHealthTeam = profile?.role === 'health_team' || profile?.role === 'admin';

  useEffect(() => {
    // If we initialized from cache, clear it and skip the initial load
    if (cacheUsed) {
      clearDashboardCache();
      return;
    }
    loadDashboardData();

    // Show username setup modal if user doesn't have a username
    if (profile && !profile.username) {
      // Delay showing the modal to avoid showing it immediately on app start
      const timer = setTimeout(() => {
        setShowUsernameSetup(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, profile]);

  // Refresh data when screen comes into focus (e.g., after completing a routine)
  // Use silent refresh (no loading indicator) for better UX
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadDashboardData(false); // Silent refresh on focus
      }
    }, [user, profile])
  );

  const loadDashboardData = async (showLoading = true) => {
    if (!user) return;

    try {
      // Only show loading indicator on initial load, not on focus refresh
      if (showLoading) {
        setLoading(true);
      }

      const [progressData, statsData, activityData, avatarsData, painStatsData, painHistoryData, harmonyData] = await Promise.all([
        getTodayProgress(user.id),
        getUserStats(user.id),
        getFormattedFriendActivity(user.id, 5), // Get latest 5 activities
        getAllAvatarStates(user.id), // Load avatar states
        getPainStatistics(user.id, 100), // Get pain statistics for up to 100 days
        getPainCheckInHistory(user.id, 100), // Get last 100 days for chart
        checkHarmonyRequirements(user.id), // Load harmony status
      ]);

      console.log('Today Progress:', progressData); // Debug log
      setTodayProgress(progressData);
      setStats(statsData);
      setFriendActivity(activityData);
      setAvatarStates(avatarsData);
      setPainStats(painStatsData);
      setPainHistory(painHistoryData);
      setHarmonyStatus(harmonyData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = async (category: RoutineCategory) => {
    try {
      // Find the avatar state for this category
      const avatarState = avatarStates.find(state => state.category === category);

      // If user has already completed this category today (Glowing or Radiant),
      // skip the recommendation modal and go straight to browse
      if (avatarState && (avatarState.lightState === 'Glowing' || avatarState.lightState === 'Radiant')) {
        router.push(`/(tabs)/routines?category=${category}`);
        return;
      }

      // Otherwise, show recommendation modal for incomplete categories
      const routines = await getRoutinesByCategory(category);

      if (routines && routines.length > 0) {
        // Show modal with the first (most popular) routine
        setSelectedRoutine(routines[0]);
        setSelectedCategory(category);
        setShowRecommendedModal(true);
      } else {
        // If no routines available, navigate to routines tab filtered by category
        router.push(`/(tabs)/routines?category=${category}`);
      }
    } catch (error) {
      console.error('Error fetching routine:', error);
      // Fallback to routines tab
      router.push(`/(tabs)/routines?category=${category}`);
    }
  };

  const handleStartRoutine = () => {
    if (selectedRoutine) {
      setShowRecommendedModal(false);
      router.push(`/routines/${selectedRoutine.id}`);
    }
  };

  const handleBrowseMore = () => {
    setShowRecommendedModal(false);
    router.push(`/(tabs)/routines?category=${selectedCategory}`);
  };

  const handleCloseModal = () => {
    setShowRecommendedModal(false);
    setSelectedRoutine(null);
  };

  const handleShowCompletedRoutines = async () => {
    if (!user) return;

    try {
      const routines = await getUniqueCompletedRoutines(user.id);
      setCompletedRoutines(routines);
      setShowCompletedRoutinesModal(true);
    } catch (error) {
      console.error('Error fetching completed routines:', error);
    }
  };

  const handleSelectCompletedRoutine = (routineId: string) => {
    router.push(`/routines/${routineId}`);
  };

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await searchUsers(query, user!.id);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleInviteToHealthTeam = async (inviteeId: string, userName: string) => {
    try {
      const hasPending = await hasPendingInvitation(inviteeId);
      if (hasPending) {
        Alert.alert('Already Invited', `${userName} already has a pending Health Team invitation.`);
        return;
      }

      Alert.alert(
        'Invite to Health Team',
        `Invite ${userName} to join the Soteria Health Team?`,
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

  // Only show full loading screen on initial load when there's no data yet
  // This allows returning from routine completion to show existing data while refreshing
  if (loading && !todayProgress && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  // Generate dynamic subtitle based on companion states
  const getDynamicSubtitle = (): string => {
    if (avatarStates.length === 0) {
      return "Let's get your first routine done!";
    }

    // Check which companions are incomplete (not Glowing or Radiant)
    const incompleteCompanions = avatarStates.filter(
      avatar => avatar.lightState !== 'Glowing' && avatar.lightState !== 'Radiant'
    );

    // Get companion name helper
    const getCompanionName = (category: string): string => {
      switch (category) {
        case 'Mind': return profile?.mind_name || 'Mind';
        case 'Body': return profile?.body_name || 'Body';
        case 'Soul': return profile?.soul_name || 'Soul';
        default: return category;
      }
    };

    const incompleteCount = incompleteCompanions.length;

    if (incompleteCount === 0) {
      // All complete
      return "Great job! All your companions have awakened. Keep it up!";
    } else if (incompleteCount === 3) {
      // None complete
      return "Let's get your first routine done!";
    } else if (incompleteCount === 1) {
      // One remaining
      const name = getCompanionName(incompleteCompanions[0].category);
      return `Almost there! ${name} is waiting to awaken with the others!`;
    } else {
      // Two remaining
      const names = incompleteCompanions.map(c => getCompanionName(c.category));
      return `Looks like ${names[0]} and ${names[1]} still need some love!`;
    }
  };

  return (
    <>
      <UsernameSetupModal
        visible={showUsernameSetup}
        onComplete={() => setShowUsernameSetup(false)}
      />
      <JourneyFocusModal
        visible={showJourneyFocusModal}
        currentFocus={profile?.journey_focus || 'Injury Prevention'}
        journeyStartedAt={profile?.journey_started_at || undefined}
        userId={user?.id || ''}
        onClose={() => setShowJourneyFocusModal(false)}
        onUpdate={() => {
          // Reload dashboard data after journey focus update
          loadDashboardData();
        }}
      />
      <RecommendedRoutineModal
        visible={showRecommendedModal}
        routine={selectedRoutine}
        category={selectedCategory}
        onClose={handleCloseModal}
        onBrowseMore={handleBrowseMore}
        onSelectRoutine={handleStartRoutine}
      />
      <CompletedRoutinesModal
        visible={showCompletedRoutinesModal}
        routines={completedRoutines}
        onClose={() => setShowCompletedRoutinesModal(false)}
        onSelectRoutine={handleSelectCompletedRoutine}
      />

      {/* Harmony Modal */}
      {harmonyStatus && (
        <HarmonyModal
          visible={showHarmonyModal}
          harmonyStatus={harmonyStatus}
          onClose={() => setShowHarmonyModal(false)}
          isHealthTeam={isHealthTeam}
          userId={user?.id}
          onHarmonyStatusChanged={loadDashboardData}
        />
      )}

      {/* Health Team Invite Modal */}
      <Modal
        visible={showHealthTeamInviteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowHealthTeamInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.inviteModalContent}>
            {/* Modal Header */}
            <View style={styles.inviteModalHeader}>
              <Text style={styles.inviteModalTitle}>Invite to Health Team</Text>
              <TouchableOpacity onPress={() => setShowHealthTeamInviteModal(false)}>
                <Ionicons name="close" size={28} color={AppColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.inviteSearchContainer}>
              <Ionicons name="search" size={20} color={AppColors.textSecondary} />
              <TextInput
                style={styles.inviteSearchInput}
                placeholder="Search users by name..."
                placeholderTextColor={AppColors.textPlaceholder}
                value={searchQuery}
                onChangeText={handleSearchUsers}
                autoCapitalize="words"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearchUsers('')}>
                  <Ionicons name="close-circle" size={20} color={AppColors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Results */}
            <ScrollView style={styles.inviteResultsContainer}>
              {searching && (
                <View style={styles.inviteLoadingContainer}>
                  <ActivityIndicator size="small" color={AppColors.primary} />
                  <Text style={styles.inviteLoadingText}>Searching...</Text>
                </View>
              )}

              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <View style={styles.inviteEmptyState}>
                  <Ionicons name="search-outline" size={48} color={AppColors.textTertiary} />
                  <Text style={styles.inviteEmptyText}>No users found</Text>
                </View>
              )}

              {!searching && searchQuery.length < 2 && (
                <View style={styles.inviteEmptyState}>
                  <Ionicons name="people-outline" size={48} color={AppColors.textTertiary} />
                  <Text style={styles.inviteEmptyText}>Search for users to invite</Text>
                  <Text style={styles.inviteEmptySubtext}>
                    Type at least 2 characters to start searching
                  </Text>
                </View>
              )}

              {searchResults.map((user) => (
                <View key={user.id} style={styles.inviteUserCard}>
                  <View style={styles.inviteUserAvatar}>
                    <Ionicons name="person" size={24} color={AppColors.textSecondary} />
                  </View>
                  <View style={styles.inviteUserInfo}>
                    <Text style={styles.inviteUserName}>{getDisplayName(user)}</Text>
                    {user.first_name && user.username && (
                      <Text style={styles.inviteUserRealName}>
                        {user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name}
                      </Text>
                    )}
                    <Text style={styles.inviteUserMeta}>
                      {user.journey_focus || 'New User'}
                    </Text>
                  </View>
                  {user.role === 'health_team' || user.role === 'admin' ? (
                    <TouchableOpacity
                      style={styles.alreadyMemberBadge}
                      onPress={() => {
                        Alert.alert(
                          'Already a Member',
                          `${getDisplayName(user)} is already a member of the Soteria Health Team.`,
                          [{ text: 'OK' }]
                        );
                      }}
                    >
                      <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                      <Text style={styles.alreadyMemberText}>Member</Text>
                    </TouchableOpacity>
                  ) : invitedUsers.has(user.id) ? (
                    <View style={styles.invitedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.invitedText}>Invited</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.inviteUserButton}
                      onPress={() => handleInviteToHealthTeam(user.id, getDisplayName(user))}
                    >
                      <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                      <Text style={styles.inviteUserButtonText}>Invite</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.container}>
      <View style={styles.header}>
        {/* Compact Header Row: Avatar + Text */}
        <View style={styles.headerRow}>
          {/* Avatar with Journey Focus Badge */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => profile?.journey_focus && setShowJourneyFocusModal(true)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.avatar,
              (profile?.role === 'health_team' || profile?.role === 'admin') && styles.avatarHealthTeam
            ]}>
              {profile?.profile_picture_url ? (
                <Image
                  source={{ uri: profile.profile_picture_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {profile?.first_name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              )}
            </View>
            {/* Journey Focus Badge (top-right) */}
            {profile?.journey_focus && (
              <View style={[
                styles.journeyBadge,
                { backgroundColor: profile.journey_focus === 'Recovery' ? AppColors.body : AppColors.mind }
              ]}>
                <Ionicons
                  name={profile.journey_focus === 'Recovery' ? 'heart' : 'shield-checkmark'}
                  size={14}
                  color="#FFFFFF"
                />
              </View>
            )}
            {/* Health Team Shield Badge (bottom-right) */}
            {(profile?.role === 'health_team' || profile?.role === 'admin') && (
              <View style={styles.shieldBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Greeting Text */}
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>
              {profile?.role === 'health_team' || profile?.role === 'admin' ? 'Welcome back, ' : 'Hello, '}
              {profile?.first_name || 'there'}
            </Text>
            <Text style={styles.subtitle}>{getDynamicSubtitle()}</Text>
          </View>
        </View>
      </View>

      {/* Avatars Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Awaken Your Light</Text>
          {harmonyStatus && (
            <TouchableOpacity
              style={[
                styles.harmonyButton,
                harmonyStatus.isInHarmony && styles.harmonyButtonActive
              ]}
              onPress={() => setShowHarmonyModal(true)}
            >
              <Text style={[
                styles.harmonyButtonText,
                harmonyStatus.isInHarmony && styles.harmonyButtonTextActive
              ]}>
                Harmony
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.avatarsGrid}>
          {avatarStates.map((avatarState) => {
            // Get the companion name based on category
            const getCompanionName = () => {
              switch (avatarState.category) {
                case 'Mind': return profile?.mind_name;
                case 'Body': return profile?.body_name;
                case 'Soul': return profile?.soul_name;
                default: return null;
              }
            };

            return (
              <Avatar
                key={avatarState.category}
                category={avatarState.category}
                lightState={avatarState.lightState}
                name={getCompanionName()}
                onPress={() => handleAvatarClick(avatarState.category)}
              />
            );
          })}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <StatCard
            label="Current Streak"
            value={stats?.current_streak || 0}
            suffix="days"
          />
          <StatCard
            label="Harmony Streak"
            value={
              harmonyStatus?.isInHarmony && harmonyStatus?.harmonyAchievedAt
                ? Math.floor((Date.now() - new Date(harmonyStatus.harmonyAchievedAt).getTime()) / (1000 * 60 * 60 * 24))
                : 0
            }
            suffix="days"
            icon="sparkles"
            iconColor="#F59E0B"
          />
          <StatCard
            label="Total Routines"
            value={stats?.total_routines || 0}
            suffix=""
            onPress={handleShowCompletedRoutines}
          />
        </View>
      </View>

      {/* Pain Progress Section */}
      {painStats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pain Progress</Text>
          <View style={styles.painProgressCard}>
            {/* Current Pain Level */}
            <View style={styles.painLevelSection}>
              <View style={styles.painLevelLeft}>
                <Text style={styles.painLevelLabel}>Current Pain</Text>
                <View style={styles.painLevelDisplay}>
                  <Text
                    style={[
                      styles.painLevelNumber,
                      { color: getPainLevelInfo(painStats.current_pain).color },
                    ]}
                  >
                    {painStats.current_pain}
                  </Text>
                  <Text
                    style={[
                      styles.painLevelText,
                      { color: getPainLevelInfo(painStats.current_pain).color },
                    ]}
                  >
                    {getPainLevelInfo(painStats.current_pain).label}
                  </Text>
                </View>
              </View>

              {/* Trend Indicator */}
              <View style={styles.trendIndicator}>
                <Text
                  style={[
                    styles.trendIcon,
                    { color: getPainTrendInfo(painStats.trend).color },
                  ]}
                >
                  {getPainTrendInfo(painStats.trend).icon}
                </Text>
                <Text style={styles.trendText}>
                  {getPainTrendInfo(painStats.trend).description}
                </Text>
              </View>
            </View>

            {/* Pain Progress Chart */}
            <PainProgressChart painHistory={painHistory} maxDays={100} />

            {/* Stats Row */}
            <View style={styles.painStatsRow}>
              <View style={styles.painStatItem}>
                <Text style={styles.painStatValue}>
                  {painStats.avg_7_days.toFixed(1)}
                </Text>
                <Text style={styles.painStatLabel}>7-Day Avg</Text>
              </View>
              <View style={styles.painStatDivider} />
              <View style={styles.painStatItem}>
                <Text style={styles.painStatValue}>
                  {painStats.avg_30_days.toFixed(1)}
                </Text>
                <Text style={styles.painStatLabel}>30-Day Avg</Text>
              </View>
              <View style={styles.painStatDivider} />
              <View style={styles.painStatItem}>
                <Text style={styles.painStatValue}>{painStats.pain_free_days}</Text>
                <Text style={styles.painStatLabel}>Pain-Free Days</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Friend Activity */}
      {friendActivity.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Friend Activity</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/social?tab=activity')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {friendActivity.slice(0, 3).map((activity) => (
            <TouchableOpacity
              key={activity.id}
              style={styles.activityCard}
              onPress={() => {
                if (activity.routineId) {
                  router.push(`/routines/${activity.routineId}`);
                }
              }}
            >
              <View style={styles.activityAvatar}>
                {activity.user.profile_picture_url ? (
                  <Image
                    source={{ uri: activity.user.profile_picture_url }}
                    style={styles.activityAvatarImage}
                  />
                ) : (
                  <Text style={styles.activityAvatarText}>
                    {activity.user.first_name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                )}
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText} numberOfLines={2}>
                  <Text style={styles.activityUserName}>{getDisplayName(activity.user)}</Text>{' '}
                  {activity.message}
                </Text>
                <Text style={styles.activityTime}>{getTimeAgo(activity.timestamp)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Health Team Invite Button (Bottom) */}
      {isHealthTeam && (
        <TouchableOpacity
          style={styles.healthTeamInviteButton}
          onPress={() => setShowHealthTeamInviteModal(true)}
        >
          <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
          <Text style={styles.healthTeamInviteButtonText}>Invite to Health Team</Text>
        </TouchableOpacity>
      )}

    </ScrollView>
    </>
  );
}

function StatCard({
  label,
  value,
  suffix,
  onPress,
  icon,
  iconColor
}: {
  label: string;
  value: number;
  suffix: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}) {
  const content = (
    <>
      <View style={styles.statValueRow}>
        {icon && (
          <Ionicons name={icon} size={20} color={iconColor || AppColors.primary} style={styles.statIcon} />
        )}
        <Text style={styles.statValue}>
          {value}{suffix && <Text style={styles.statSuffix}> {suffix}</Text>}
        </Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      {onPress && (
        <View style={styles.tapIndicator}>
          <Ionicons name="chevron-forward" size={16} color={AppColors.textTertiary} />
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.statCard}>
      {content}
    </View>
  );
}

function getTimeAgo(timestamp: string): string {
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.background,
  },
  header: {
    padding: 24,
    paddingTop: 100,
    backgroundColor: AppColors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarHealthTeam: {
    borderWidth: 3,
    borderColor: '#10B981',
  },
  journeyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AppColors.surface,
  },
  shieldBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AppColors.surface,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginTop: 16,
    padding: 24,
    backgroundColor: AppColors.surface,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 16,
  },
  progressGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  progressIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: AppColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: AppColors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  // Avatar Section Styles
  avatarsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceSecondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    marginRight: 4,
  },
  statSuffix: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  statLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  tapIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  routineCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceSecondary,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routineName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: AppColors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  routineDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  routineDetails: {
    fontSize: 12,
    color: AppColors.textTertiary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: '600',
  },
  harmonyButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: AppColors.border,
  },
  harmonyButtonActive: {
    backgroundColor: AppColors.primary,
  },
  harmonyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  harmonyButtonTextActive: {
    color: '#FFFFFF',
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  activityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  activityAvatarImage: {
    width: '100%',
    height: '100%',
  },
  activityAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
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
  // Pain Progress Section Styles
  painProgressCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  painLevelSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  painLevelLeft: {
    flex: 1,
  },
  painLevelLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  painLevelDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  painLevelNumber: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  painLevelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendIndicator: {
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  trendIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  trendText: {
    fontSize: 11,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  painStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  painStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  painStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  painStatLabel: {
    fontSize: 11,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  painStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: AppColors.border,
  },
  // Health Team Invite Button (Bottom)
  healthTeamInviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  healthTeamInviteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Health Team Invite Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  inviteModalContent: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    paddingTop: 20,
  },
  inviteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  inviteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  inviteSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: AppColors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  inviteSearchInput: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  inviteResultsContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  inviteLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  inviteLoadingText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  inviteEmptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  inviteEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginTop: 16,
  },
  inviteEmptySubtext: {
    fontSize: 14,
    color: AppColors.textTertiary,
    marginTop: 8,
    textAlign: 'center',
  },
  inviteUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  inviteUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inviteUserInfo: {
    flex: 1,
  },
  inviteUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  inviteUserRealName: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  inviteUserMeta: {
    fontSize: 12,
    color: AppColors.textTertiary,
  },
  inviteUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  inviteUserButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  alreadyMemberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  alreadyMemberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  invitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  invitedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
});
