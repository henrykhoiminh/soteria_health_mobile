import Avatar from '@/components/Avatar';
import CompletedRoutinesModal from '@/components/CompletedRoutinesModal';
import HapticPressable from '@/components/HapticPressable';
import HarmonyModal from '@/components/HarmonyModal';
import JourneyFocusModal from '@/components/JourneyFocusModal';
import PainProgressChart from '@/components/PainProgressChart';
import RecommendedRoutineModal from '@/components/RecommendedRoutineModal';
import UsernameSetupModal from '@/components/UsernameSetupModal';
import WellnessCheckInModal from '@/components/WellnessCheckInModal';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getCategoryRecommendation, getTodayProgress, getUniqueCompletedRoutines, getUserStats } from '@/lib/utils/dashboard';
import { clearDashboardCache, getDashboardCache } from '@/lib/utils/dashboard-cache';
import { checkHarmonyRequirements } from '@/lib/utils/harmony';
import { hasPendingInvitation, sendHealthTeamInvitation } from '@/lib/utils/health-team';
import { getUserLevelSummary } from '@/lib/utils/leveling';
import { getPainCheckInHistory, getPainLevelInfo, getPainStatistics, getPainTrendInfo } from '@/lib/utils/pain-checkin';
import { getFormattedFriendActivity, searchUsers } from '@/lib/utils/social';
import { getAllAvatarStates } from '@/lib/utils/stats';
import { getDisplayName } from '@/lib/utils/username';
import { ActivityFeedItem, AvatarState, CategoryLevelInfo, DailyProgress, HarmonyStatus, PainCheckIn, PainStatistics, Routine, RoutineCategory, UserSearchResult, UserStats } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function DashboardScreen() {
  const { user, profile, refreshProfile } = useAuth();
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
  const [recommendationMessage, setRecommendationMessage] = useState<string>('');
  const [recommendationSubtitle, setRecommendationSubtitle] = useState<string>('');
  const [showCompletedRoutinesModal, setShowCompletedRoutinesModal] = useState(false);
  const [completedRoutines, setCompletedRoutines] = useState<Routine[]>([]);
  const [levelModalCategory, setLevelModalCategory] = useState<RoutineCategory | undefined>(undefined);
  const [levelModalInfo, setLevelModalInfo] = useState<CategoryLevelInfo | undefined>(undefined);
  const [showHealthTeamInviteModal, setShowHealthTeamInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [harmonyStatus, setHarmonyStatus] = useState<HarmonyStatus | null>(initialCache?.harmonyStatus || null);
  const [showHarmonyModal, setShowHarmonyModal] = useState(false);
  const [showWellnessCheckIn, setShowWellnessCheckIn] = useState(false);
  const [showUpdateCheckInConfirm, setShowUpdateCheckInConfirm] = useState(false);
  const [cacheUsed] = useState(!!initialCache); // Track if we initialized from cache
  const [activeTooltip, setActiveTooltip] = useState<'streak' | 'harmony' | 'routines' | 'level' | null>(null);
  const [painStatsUpdating, setPainStatsUpdating] = useState(false);
  const painUpdatePulse = useRef(new Animated.Value(1)).current;

  const isHealthTeam = profile?.role === 'health_team' || profile?.role === 'admin';

  // Pulse animation for pain stats updating
  useEffect(() => {
    if (painStatsUpdating) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(painUpdatePulse, {
            toValue: 0.6,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(painUpdatePulse, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      painUpdatePulse.setValue(1);
    }
  }, [painStatsUpdating]);

  /**
   * Determines the header background based on completed avatar states.
   * Returns an object with either a solid color or gradient configuration.
   */
  const getHeaderBackground = ():
    | { type: 'solid'; color: string }
    | { type: 'gradient'; colors: [string, string, ...string[]]; start: { x: number; y: number }; end: { x: number; y: number } } => {
    // Check which avatars are completed (Glowing or Radiant)
    const completedCategories = avatarStates.filter(
      state => state.lightState === 'Glowing' || state.lightState === 'Radiant'
    );

    const categoryColorMap: Record<string, string> = {
      Mind: AppColors.headerMind,
      Body: AppColors.headerBody,
      Soul: AppColors.headerSoul,
    };

    // If no routines completed today, use neutral surface color
    if (completedCategories.length === 0) {
      return { type: 'solid' as const, color: AppColors.surface };
    }

    // If only one category complete, use solid color
    if (completedCategories.length === 1) {
      return {
        type: 'solid' as const,
        color: categoryColorMap[completedCategories[0].category],
      };
    }

    // If 2 or more categories are complete, use gradient of those colors
    // Build gradient colors array in Mind → Body → Soul order for consistency
    const gradientColors: string[] = [];
    const categoryOrder = ['Mind', 'Body', 'Soul'];

    for (const category of categoryOrder) {
      const isCompleted = completedCategories.some(state => state.category === category);
      if (isCompleted) {
        gradientColors.push(categoryColorMap[category]);
      }
    }

    return {
      type: 'gradient' as const,
      colors: gradientColors as [string, string, ...string[]],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 }, // Horizontal gradient
    };
  };

  const headerBackground = getHeaderBackground();

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

  // Targeted refresh for pain data only (after wellness check-in)
  // Avoids full dashboard reload and eliminates any risk of the loading spinner
  const refreshPainData = async () => {
    if (!user) return;
    try {
      const [painStatsData, painHistoryData] = await Promise.all([
        getPainStatistics(user.id, 100),
        getPainCheckInHistory(user.id, 100),
      ]);
      setPainStats(painStatsData);
      setPainHistory(painHistoryData);
    } catch (error) {
      console.error('Error refreshing pain data:', error);
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

      // Get wellness-aware recommendation with personalized messaging
      const recommendation = await getCategoryRecommendation(
        category,
        user!.id,
        profile?.journey_focus,
        profile?.recovery_areas
      );

      if (recommendation.routines && recommendation.routines.length > 0) {
        // Show modal with the first (most appropriate) routine and messaging
        setSelectedRoutine(recommendation.routines[0]);
        setSelectedCategory(category);
        setRecommendationMessage(recommendation.message);
        setRecommendationSubtitle(recommendation.subtitle);
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
    setRecommendationMessage('');
    setRecommendationSubtitle('');
  };

  const handleShowCompletedRoutines = async () => {
    if (!user) return;

    try {
      const routines = await getUniqueCompletedRoutines(user.id);
      setCompletedRoutines(routines);
      setLevelModalCategory(undefined);
      setLevelModalInfo(undefined);
      setShowCompletedRoutinesModal(true);
    } catch (error) {
      console.error('Error fetching completed routines:', error);
    }
  };

  const handleLevelBadgeTap = async (category: RoutineCategory, info: CategoryLevelInfo) => {
    if (!user) return;

    try {
      const routines = await getUniqueCompletedRoutines(user.id);
      setCompletedRoutines(routines);
      setLevelModalCategory(category);
      setLevelModalInfo(info);
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
        <Text style={styles.loadingText}>Setting up your dashboard...</Text>
      </View>
    );
  }

  return (
    <>
      <UsernameSetupModal
        visible={showUsernameSetup}
        onComplete={() => setShowUsernameSetup(false)}
      />
      <JourneyFocusModal
        visible={showJourneyFocusModal}
        currentFocus={profile?.journey_focus || 'Injury Prevention'}
        currentRecoveryAreas={profile?.recovery_areas}
        journeyStartedAt={profile?.journey_started_at || undefined}
        userId={user?.id || ''}
        onClose={() => setShowJourneyFocusModal(false)}
        onUpdate={async () => {
          // Refresh profile to get updated recovery_areas, then reload dashboard
          await refreshProfile();
          loadDashboardData();
        }}
      />
      <RecommendedRoutineModal
        visible={showRecommendedModal}
        routine={selectedRoutine}
        category={selectedCategory}
        message={recommendationMessage}
        subtitle={recommendationSubtitle}
        onClose={handleCloseModal}
        onBrowseMore={handleBrowseMore}
        onSelectRoutine={handleStartRoutine}
      />
      <CompletedRoutinesModal
        visible={showCompletedRoutinesModal}
        routines={completedRoutines}
        onClose={() => {
          setShowCompletedRoutinesModal(false);
          setLevelModalCategory(undefined);
          setLevelModalInfo(undefined);
        }}
        onSelectRoutine={handleSelectCompletedRoutine}
        categoryFilter={levelModalCategory}
        levelInfo={levelModalInfo}
        companionName={
          levelModalCategory === 'Mind' ? (profile?.mind_name || undefined)
          : levelModalCategory === 'Body' ? (profile?.body_name || undefined)
          : levelModalCategory === 'Soul' ? (profile?.soul_name || undefined)
          : undefined
        }
        userName={profile?.first_name || undefined}
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

      {/* Wellness Check-In Modal */}
      {user && (
        <WellnessCheckInModal
          visible={showWellnessCheckIn}
          userId={user.id}
          mindName={profile?.mind_name || 'Mind'}
          bodyName={profile?.body_name || 'Body'}
          soulName={profile?.soul_name || 'Soul'}
          onComplete={async () => {
            setShowWellnessCheckIn(false);
            // Show updating animation only on pain progress chart
            setPainStatsUpdating(true);
            // Only refresh pain data - no full dashboard reload needed
            await refreshPainData();
            setPainStatsUpdating(false);
          }}
        />
      )}

      {/* Update Wellness Check-In Confirmation Modal */}
      <Modal
        visible={showUpdateCheckInConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowUpdateCheckInConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="heart-circle-outline" size={48} color={AppColors.primary} />
            </View>
            <Text style={styles.confirmTitle}>Update Wellness Check-In</Text>
            <Text style={styles.confirmMessage}>
              Do you want to update your daily wellness check-in? This will overwrite your current values for today.
            </Text>
            <View style={styles.confirmButtons}>
              <HapticPressable
                style={styles.confirmButtonCancel}
                onPress={() => setShowUpdateCheckInConfirm(false)}
              >
                <Text style={styles.confirmButtonCancelText}>Cancel</Text>
              </HapticPressable>
              <HapticPressable
                style={styles.confirmButtonConfirm}
                onPress={() => {
                  setShowUpdateCheckInConfirm(false);
                  setShowWellnessCheckIn(true);
                }}
              >
                <Text style={styles.confirmButtonConfirmText}>Update</Text>
              </HapticPressable>
            </View>
          </View>
        </View>
      </Modal>

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
              <HapticPressable onPress={() => setShowHealthTeamInviteModal(false)}>
                <Ionicons name="close" size={28} color={AppColors.textPrimary} />
              </HapticPressable>
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
                <HapticPressable onPress={() => handleSearchUsers('')}>
                  <Ionicons name="close-circle" size={20} color={AppColors.textSecondary} />
                </HapticPressable>
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
                    <HapticPressable
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
                    </HapticPressable>
                  ) : invitedUsers.has(user.id) ? (
                    <View style={styles.invitedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.invitedText}>Invited</Text>
                    </View>
                  ) : (
                    <HapticPressable
                      style={styles.inviteUserButton}
                      onPress={() => handleInviteToHealthTeam(user.id, getDisplayName(user))}
                    >
                      <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                      <Text style={styles.inviteUserButtonText}>Invite</Text>
                    </HapticPressable>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.container}>
      {/* Dynamic Header Background - Solid or Gradient based on completion */}
      {headerBackground.type === 'gradient' ? (
        <LinearGradient
          colors={headerBackground.colors}
          start={headerBackground.start}
          end={headerBackground.end}
          style={styles.header}
        >
          {/* Compact Header Row: Avatar + Text */}
          <View style={styles.headerRow}>
          {/* Avatar with Journey Focus Badge */}
          <HapticPressable
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
          </HapticPressable>

          {/* Greeting Text */}
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>
              {profile?.role === 'health_team' || profile?.role === 'admin' ? 'Welcome back, ' : 'Hello, '}
              {profile?.first_name || 'there'}
            </Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              {/* Current Streak */}
              <HapticPressable
                hapticStyle="selection"
                style={styles.statItem}
                onPress={() => setActiveTooltip(activeTooltip === 'streak' ? null : 'streak')}
                activeOpacity={0.7}
              >
                <Ionicons name="flame" size={16} color={AppColors.primary} />
                <Text style={styles.statValue}>{stats?.current_streak || 0}</Text>
              </HapticPressable>

              <View style={styles.statDivider} />

              {/* Harmony Streak */}
              <HapticPressable
                hapticStyle="selection"
                style={styles.statItem}
                onPress={() => setActiveTooltip(activeTooltip === 'harmony' ? null : 'harmony')}
                activeOpacity={0.7}
              >
                <Ionicons name="sparkles" size={16} color={AppColors.primary} />
                <Text style={styles.statValue}>
                  {harmonyStatus?.consecutiveBalancedDays || 0}
                </Text>
              </HapticPressable>

              <View style={styles.statDivider} />

              {/* Soteria Level */}
              <HapticPressable
                hapticStyle="selection"
                style={styles.statItem}
                onPress={() => setActiveTooltip(activeTooltip === 'level' ? null : 'level')}
                activeOpacity={0.7}
              >
                <Ionicons name="trophy" size={16} color={AppColors.primary} />
                <Text style={styles.statValue}>Lv.{getUserLevelSummary(stats).soteria.level}</Text>
              </HapticPressable>
            </View>
          </View>
        </View>
        </LinearGradient>
      ) : (
        <View style={[styles.header, { backgroundColor: headerBackground.color }]}>
          {/* Compact Header Row: Avatar + Text */}
          <View style={styles.headerRow}>
          {/* Avatar with Journey Focus Badge */}
          <HapticPressable
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
          </HapticPressable>

          {/* Greeting Text */}
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>
              {profile?.role === 'health_team' || profile?.role === 'admin' ? 'Welcome back, ' : 'Hello, '}
              {profile?.first_name || 'there'}
            </Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              {/* Current Streak */}
              <HapticPressable
                hapticStyle="selection"
                style={styles.statItem}
                onPress={() => setActiveTooltip(activeTooltip === 'streak' ? null : 'streak')}
                activeOpacity={0.7}
              >
                <Ionicons name="flame" size={16} color={AppColors.primary} />
                <Text style={styles.statValue}>{stats?.current_streak || 0}</Text>
              </HapticPressable>

              <View style={styles.statDivider} />

              {/* Harmony Streak */}
              <HapticPressable
                hapticStyle="selection"
                style={styles.statItem}
                onPress={() => setActiveTooltip(activeTooltip === 'harmony' ? null : 'harmony')}
                activeOpacity={0.7}
              >
                <Ionicons name="sparkles" size={16} color={AppColors.primary} />
                <Text style={styles.statValue}>
                  {harmonyStatus?.consecutiveBalancedDays || 0}
                </Text>
              </HapticPressable>

              <View style={styles.statDivider} />

              {/* Soteria Level */}
              <HapticPressable
                hapticStyle="selection"
                style={styles.statItem}
                onPress={() => setActiveTooltip(activeTooltip === 'level' ? null : 'level')}
                activeOpacity={0.7}
              >
                <Ionicons name="trophy" size={16} color={AppColors.primary} />
                <Text style={styles.statValue}>Lv.{getUserLevelSummary(stats).soteria.level}</Text>
              </HapticPressable>
            </View>
          </View>
        </View>
        </View>
      )}

      {/* Stat Tooltip Modal */}
      <Modal
        visible={activeTooltip !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setActiveTooltip(null)}
      >
        <HapticPressable
          hapticStyle="none"
          style={styles.tooltipOverlay}
          activeOpacity={1}
          onPress={() => setActiveTooltip(null)}
        >
          <View style={styles.tooltip}>
            {activeTooltip === 'streak' && (
              <>
                <Text style={styles.tooltipTitle}>Current Streak</Text>
                <Text style={styles.tooltipClass}>{stats?.current_streak || 0} Days</Text>
                <Text style={styles.tooltipDetail}>Consecutive days with completed routines</Text>
              </>
            )}
            {activeTooltip === 'harmony' && (
              <>
                <Text style={styles.tooltipTitle}>Harmony Progress</Text>
                <Text style={styles.tooltipClass}>{harmonyStatus?.consecutiveBalancedDays || 0} / 7</Text>
                <View style={styles.tooltipXpBar}>
                  <View style={[styles.tooltipXpFill, { width: `${Math.round(((harmonyStatus?.consecutiveBalancedDays || 0) / 7) * 100)}%` }]} />
                </View>
                <Text style={styles.tooltipDetail}>Consecutive balanced days with Mind, Body, and Soul routines</Text>
              </>
            )}
            {activeTooltip === 'level' && (() => {
              const levelSummary = getUserLevelSummary(stats);
              const s = levelSummary.soteria;
              return (
                <>
                  <Text style={styles.tooltipTitle}>Soteria Level {s.level}</Text>
                  <Text style={styles.tooltipClass}>{s.title}</Text>
                  <View style={styles.tooltipXpBar}>
                    <View style={[styles.tooltipXpFill, { width: `${Math.round(s.progress * 100)}%` }]} />
                  </View>
                  <Text style={styles.tooltipXpText}>{s.currentXp} / {s.xpForNextLevel} XP to next level</Text>
                </>
              );
            })()}
            {activeTooltip === 'routines' && (
              <Text style={styles.tooltipText}>
                Total routines completed: {stats?.total_routines || 0}. Tap to view history.
              </Text>
            )}
            <Text style={styles.tooltipDismiss}>Tap anywhere to dismiss</Text>
          </View>
        </HapticPressable>
      </Modal>

      {/* Avatars Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Awaken Your Light</Text>
          {harmonyStatus && (
            <HapticPressable
              hapticStyle="selection"
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
            </HapticPressable>
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

      {/* Category Levels Section */}
      {stats && (() => {
        const levelSummary = getUserLevelSummary(stats);
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Levels</Text>
            <View style={styles.levelRows}>
              {([
                { cat: 'Mind' as const, info: levelSummary.mind, color: AppColors.mind, icon: 'bulb-outline' as const },
                { cat: 'Body' as const, info: levelSummary.body, color: AppColors.body, icon: 'body' as const },
                { cat: 'Soul' as const, info: levelSummary.soul, color: AppColors.soul, icon: 'flame-outline' as const },
              ]).map(({ cat, info, color, icon }) => (
                <View key={cat} style={styles.levelRow}>
                  {/* Left: Tappable icon badge */}
                  <HapticPressable
                    hapticStyle="selection"
                    style={[styles.levelBadge, { borderColor: color + '40' }]}
                    onPress={() => handleLevelBadgeTap(cat, info)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={icon} size={18} color={color} />
                  </HapticPressable>

                  {/* Right: Lv + Title + Progress bar */}
                  <View style={styles.levelBarSection}>
                    <View style={styles.levelBarHeader}>
                      <Text style={[styles.levelRowTitle, { color }]}>
                        Lv.{info.level}
                      </Text>
                      <Text style={styles.levelXpText}>
                        {info.currentXp}/{info.xpForNextLevel}
                      </Text>
                    </View>
                    <View style={styles.levelBarBg}>
                      <View style={[styles.levelBarFill, { width: `${Math.round(info.progress * 100)}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        );
      })()}

      {/* Pain Progress Section */}
      {painStats && (
        <View style={styles.section}>
          <View style={styles.painProgressHeader}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Pain Progress</Text>
            {painStatsUpdating && (
              <View style={styles.updatingBadge}>
                <ActivityIndicator size="small" color={AppColors.primary} />
                <Text style={styles.updatingText}>Updating...</Text>
              </View>
            )}
          </View>
          <Animated.View style={[styles.painProgressCard, { opacity: painStatsUpdating ? painUpdatePulse : 1 }]}>
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

              {/* Trend Indicator - Tap to check in */}
              <HapticPressable
                style={styles.trendIndicator}
                onPress={() => setShowUpdateCheckInConfirm(true)}
                activeOpacity={0.7}
              >
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
                <Ionicons
                  name="add-circle-outline"
                  size={16}
                  color={AppColors.textTertiary}
                  style={styles.checkInIcon}
                />
              </HapticPressable>
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
          </Animated.View>
        </View>
      )}

      {/* Friend Activity */}
      {friendActivity.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Friend Activity</Text>
            <HapticPressable onPress={() => router.push('/(tabs)/social?tab=activity')}>
              <Text style={styles.seeAllText}>See All</Text>
            </HapticPressable>
          </View>
          {friendActivity.slice(0, 3).map((activity) => (
            <HapticPressable
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
            </HapticPressable>
          ))}
        </View>
      )}

      {/* Health Team Invite Button (Bottom) */}
      {isHealthTeam && (
        <HapticPressable
          style={styles.healthTeamInviteButton}
          onPress={() => setShowHealthTeamInviteModal(true)}
        >
          <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
          <Text style={styles.healthTeamInviteButtonText}>Invite to Health Team</Text>
        </HapticPressable>
      )}

    </ScrollView>
    </>
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
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  header: {
    padding: 24,
    paddingTop: 100,
    // backgroundColor applied dynamically based on completed categories
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: AppColors.border,
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltip: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 32,
    marginHorizontal: 24,
    width: '85%',
    borderWidth: 1,
    borderColor: AppColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  tooltipClass: {
    fontSize: 24,
    fontWeight: '800',
    color: AppColors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  tooltipXpBar: {
    width: '100%',
    height: 8,
    backgroundColor: AppColors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  tooltipXpFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: AppColors.primary,
  },
  tooltipXpText: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.textTertiary,
    textAlign: 'center',
  },
  tooltipDetail: {
    fontSize: 13,
    color: AppColors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  tooltipText: {
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  tooltipDismiss: {
    fontSize: 12,
    color: AppColors.textTertiary,
    textAlign: 'center',
    marginTop: 12,
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
  levelRows: {
    gap: 10,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: AppColors.surfaceSecondary,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelBarSection: {
    flex: 1,
    gap: 4,
  },
  levelBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  levelRowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  levelRowTitleName: {
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
  levelXpText: {
    fontSize: 11,
    color: AppColors.textTertiary,
    fontWeight: '500',
  },
  levelBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: AppColors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    borderRadius: 3,
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
  painProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  updatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppColors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  updatingText: {
    fontSize: 12,
    fontWeight: '500',
    color: AppColors.primary,
  },
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
  checkInIcon: {
    marginTop: 6,
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
  // Update Wellness Check-In Confirmation Modal
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    backgroundColor: AppColors.surface,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmIconContainer: {
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 15,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceSecondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  confirmButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  confirmButtonConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
  },
  confirmButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primaryText,
  },
});
