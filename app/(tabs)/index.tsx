import { useAuth } from '@/lib/contexts/AuthContext';
import { AppColors } from '@/constants/theme';
import { getBalancedRoutines, getTodayProgress, getUserStats } from '@/lib/utils/dashboard';
import { calculateJourneyDays } from '@/lib/utils/auth';
import { getFormattedFriendActivity } from '@/lib/utils/social';
import { getDisplayName } from '@/lib/utils/username';
import { DailyProgress, Routine, UserStats, ActivityFeedItem } from '@/types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import JourneyBadge from '@/components/JourneyBadge';
import UsernameSetupModal from '@/components/UsernameSetupModal';

export default function DashboardScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [todayProgress, setTodayProgress] = useState<DailyProgress | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recommendedRoutines, setRecommendedRoutines] = useState<Routine[]>([]);
  const [friendActivity, setFriendActivity] = useState<ActivityFeedItem[]>([]);
  const [showJourneyDetails, setShowJourneyDetails] = useState(false);
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);

  useEffect(() => {
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
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadDashboardData();
      }
    }, [user, profile])
  );

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [progressData, statsData, routinesData, activityData] = await Promise.all([
        getTodayProgress(user.id),
        getUserStats(user.id),
        getBalancedRoutines(profile?.journey_focus || null, profile?.fitness_level || null),
        getFormattedFriendActivity(user.id, 5), // Get latest 5 activities
      ]);

      console.log('Today Progress:', progressData); // Debug log
      setTodayProgress(progressData);
      setStats(statsData);
      setRecommendedRoutines(routinesData);
      setFriendActivity(activityData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  // Calculate journey days
  const journeyDays = profile?.journey_started_at
    ? calculateJourneyDays(profile.journey_started_at)
    : 0;

  return (
    <>
      <UsernameSetupModal
        visible={showUsernameSetup}
        onComplete={() => setShowUsernameSetup(false)}
      />
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        {/* Avatar and Journey Badge Row */}
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            {profile?.profile_picture_url ? (
              <Image
                source={{ uri: profile.profile_picture_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
          </View>

          {/* Journey Badge next to avatar */}
          {profile?.journey_focus && (
            <TouchableOpacity
              onPress={() => setShowJourneyDetails(!showJourneyDetails)}
              activeOpacity={0.7}
            >
              <JourneyBadge
                focus={profile.journey_focus}
                size="sm"
                showLabel={false}
                recoveryAreas={profile.recovery_areas || []}
              />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.greeting}>
          Hello, {profile?.full_name || 'there'}!
        </Text>
        <Text style={styles.subtitle}>Check out your personalized routines below.</Text>

        {/* Journey Day Counter - Shows only when badge is clicked */}
        {profile?.journey_focus && showJourneyDetails && profile.journey_started_at && (
          <View style={styles.journeyDetailsCard}>
            <Text style={styles.journeyDetailsText}>
              Day {journeyDays} of {profile.journey_focus}
            </Text>
            {profile.recovery_areas && profile.recovery_areas.length > 0 && profile.journey_focus === 'Recovery' && (
              <Text style={styles.journeyDetailsSubtext}>
                Recovering: {profile.recovery_areas.join(', ')}
              </Text>
            )}
            {profile.recovery_goals && profile.recovery_goals.length > 0 && profile.journey_focus === 'Recovery' && (
              <Text style={styles.journeyDetailsSubtext}>
                Goals: {profile.recovery_goals.join(', ')}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Today's Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Progress</Text>
        <View style={styles.progressGrid}>
          <ProgressCard
            title="Mind"
            completed={todayProgress?.mind_complete || false}
            color="#3B82F6"
            onPress={() => router.push('/routines?category=Mind')}
          />
          <ProgressCard
            title="Body"
            completed={todayProgress?.body_complete || false}
            color="#EF4444"
            onPress={() => router.push('/routines?category=Body')}
          />
          <ProgressCard
            title="Soul"
            completed={todayProgress?.soul_complete || false}
            color="#F59E0B"
            onPress={() => router.push('/routines?category=Soul')}
          />
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
            label="Health Score"
            value={stats?.health_score || 0}
            suffix=""
          />
          <StatCard
            label="Total Routines"
            value={stats?.total_routines || 0}
            suffix=""
          />
        </View>
      </View>

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
              <View style={styles.activityIcon}>
                <Ionicons
                  name={getActivityIcon(activity.activityType)}
                  size={20}
                  color={AppColors.primary}
                />
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

      {/* Recommended Routines */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended for You</Text>
        {recommendedRoutines.map((routine) => (
          <TouchableOpacity
            key={routine.id}
            style={styles.routineCard}
            onPress={() => router.push(`/routines/${routine.id}`)}
          >
            <View style={styles.routineHeader}>
              <Text style={styles.routineName}>{routine.name}</Text>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: getCategoryColor(routine.category) },
                ]}
              >
                <Text style={styles.categoryText}>{routine.category}</Text>
              </View>
            </View>
            <Text style={styles.routineDescription} numberOfLines={2}>
              {routine.description}
            </Text>
            <Text style={styles.routineDetails}>
              {routine.duration_minutes} min • {routine.difficulty}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
    </>
  );
}

function ProgressCard({ title, completed, color, onPress }: { title: string; completed: boolean; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.progressCard, { borderColor: color }]} onPress={onPress}>
      <Text style={styles.progressTitle}>{title}</Text>
      <View style={[styles.progressIndicator, completed && { backgroundColor: color }]}>
        {completed && <Text style={styles.checkmark}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>
        {value}{suffix && <Text style={styles.statSuffix}> {suffix}</Text>}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'Mind':
      return AppColors.mind;
    case 'Body':
      return AppColors.body;
    case 'Soul':
      return AppColors.soul;
    default:
      return AppColors.primary;
  }
}

function getActivityIcon(type: string): any {
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
    case 'completed_circle_routine':
      return 'checkmark-done-circle';
    case 'added_routine_to_circle':
      return 'add-circle-outline';
    case 'routine_became_popular':
      return 'flame';
    default:
      return 'radio-button-on';
  }
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
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: AppColors.textSecondary,
    marginTop: 4,
  },
  journeyDetailsCard: {
    marginTop: 16,
    padding: 12,
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  journeyDetailsText: {
    fontSize: 14,
    color: AppColors.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  journeyDetailsSubtext: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
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
  activityCard: {
    flexDirection: 'row',
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.surface,
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
});
