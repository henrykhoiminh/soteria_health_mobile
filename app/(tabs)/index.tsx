import CompletedRoutinesModal from '@/components/CompletedRoutinesModal';
import FriendActivitySection from '@/components/Dashboard/FriendActivitySection';
import GlassCard from '@/components/Dashboard/GlassCard';
import LevelsSection from '@/components/Dashboard/LevelsSection';
import PainProgressSection from '@/components/Dashboard/PainProgressSection';
import SanctumBackground from '@/components/Dashboard/SanctumBackground';
import SanctumScene from '@/components/Dashboard/SanctumScene';
import UserStatsSection from '@/components/Dashboard/UserStatsSection';
import HapticPressable from '@/components/HapticPressable';
import HarmonyModal from '@/components/HarmonyModal';
import JourneyFocusModal from '@/components/JourneyFocusModal';
import RecommendedRoutineModal from '@/components/RecommendedRoutineModal';
import UsernameSetupModal from '@/components/UsernameSetupModal';
import WellnessCheckInModal from '@/components/WellnessCheckInModal';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getCategoryRecommendation, getTodayProgress, getUniqueCompletedRoutines, getUserStats } from '@/lib/utils/dashboard';
import { clearDashboardCache, getDashboardCache } from '@/lib/utils/dashboard-cache';
import { checkHarmonyRequirements } from '@/lib/utils/harmony';
import { hasPendingInvitation, sendHealthTeamInvitation } from '@/lib/utils/health-team';
import { getPainCheckInHistory, getPainStatistics } from '@/lib/utils/pain-checkin';
import { getFormattedFriendActivity, searchUsers } from '@/lib/utils/social';
import { getAllAvatarStates } from '@/lib/utils/stats';
import { getDisplayName } from '@/lib/utils/username';
import { ActivityFeedItem, AvatarState, CategoryLevelInfo, DailyProgress, HarmonyStatus, PainCheckIn, PainStatistics, Routine, RoutineCategory, UserSearchResult, UserStats } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
  const [cacheUsed] = useState(!!initialCache);
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

  useEffect(() => {
    if (cacheUsed) {
      clearDashboardCache();
      return;
    }
    loadDashboardData();

    if (profile && !profile.username) {
      const timer = setTimeout(() => {
        setShowUsernameSetup(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, profile]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadDashboardData(false);
      }
    }, [user, profile])
  );

  const loadDashboardData = async (showLoading = true) => {
    if (!user) return;

    try {
      if (showLoading) {
        setLoading(true);
      }

      const [progressData, statsData, activityData, avatarsData, painStatsData, painHistoryData, harmonyData] = await Promise.all([
        getTodayProgress(user.id),
        getUserStats(user.id),
        getFormattedFriendActivity(user.id, 5),
        getAllAvatarStates(user.id),
        getPainStatistics(user.id, 100),
        getPainCheckInHistory(user.id, 100),
        checkHarmonyRequirements(user.id),
      ]);

      console.log('Today Progress:', progressData);
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
      const avatarState = avatarStates.find(state => state.category === category);

      if (avatarState && (avatarState.lightState === 'Glowing' || avatarState.lightState === 'Radiant')) {
        router.push(`/(tabs)/routines?category=${category}`);
        return;
      }

      const recommendation = await getCategoryRecommendation(
        category,
        user!.id,
        profile?.journey_focus,
        profile?.recovery_areas
      );

      if (recommendation.routines && recommendation.routines.length > 0) {
        setSelectedRoutine(recommendation.routines[0]);
        setSelectedCategory(category);
        setRecommendationMessage(recommendation.message);
        setRecommendationSubtitle(recommendation.subtitle);
        setShowRecommendedModal(true);
      } else {
        router.push(`/(tabs)/routines?category=${category}`);
      }
    } catch (error) {
      console.error('Error fetching routine:', error);
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
      />

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

      {user && (
        <WellnessCheckInModal
          visible={showWellnessCheckIn}
          userId={user.id}
          mindName={profile?.mind_name || 'Mind'}
          bodyName={profile?.body_name || 'Body'}
          soulName={profile?.soul_name || 'Soul'}
          onComplete={async () => {
            setShowWellnessCheckIn(false);
            setPainStatsUpdating(true);
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
            <View style={styles.inviteModalHeader}>
              <Text style={styles.inviteModalTitle}>Invite to Health Team</Text>
              <HapticPressable onPress={() => setShowHealthTeamInviteModal(false)}>
                <Ionicons name="close" size={28} color={AppColors.textPrimary} />
              </HapticPressable>
            </View>

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

      <SanctumBackground>
        <ScrollView style={styles.container}>
          {/* Overscroll cover - prevents background reveal on bounce */}
          <View style={styles.overscrollCover} />
          {/* Sanctum Scene: Companions only */}
          <SanctumScene
            profile={profile}
            avatarStates={avatarStates}
            onAvatarClick={handleAvatarClick}
          />

          {/* Glass Card Data Sections */}
          <View style={styles.glassCardsContainer}>
            {/* Companion Stats - Mind/Body/Soul XP */}
            {stats && (
              <GlassCard>
                <LevelsSection
                  stats={stats}
                  onLevelBadgeTap={handleLevelBadgeTap}
                />
              </GlassCard>
            )}

            {/* User Journey - Profile, Streak, Harmony, Level */}
            <GlassCard>
              <UserStatsSection
                profile={profile}
                stats={stats}
                harmonyStatus={harmonyStatus}
                activeTooltip={activeTooltip}
                onSetActiveTooltip={setActiveTooltip}
                onJourneyFocusPress={() => setShowJourneyFocusModal(true)}
              />
            </GlassCard>

            {painStats && (
              <GlassCard>
                <PainProgressSection
                  painStats={painStats}
                  painHistory={painHistory}
                  painStatsUpdating={painStatsUpdating}
                  painUpdatePulse={painUpdatePulse}
                  onCheckInPress={() => setShowUpdateCheckInConfirm(true)}
                />
              </GlassCard>
            )}

            <GlassCard>
              <FriendActivitySection
                friendActivity={friendActivity}
                onSeeAll={() => router.push('/(tabs)/social?tab=activity')}
                onActivityPress={(routineId) => {
                  if (routineId) {
                    router.push(`/routines/${routineId}`);
                  }
                }}
              />
            </GlassCard>
          </View>

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
      </SanctumBackground>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overscrollCover: {
    position: 'absolute',
    top: -600,
    left: 0,
    right: 0,
    height: 600,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 2,
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
  glassCardsContainer: {
    paddingTop: 8,
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
