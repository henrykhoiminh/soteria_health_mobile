import { useAuth } from '@/lib/contexts/AuthContext';
import { getBalancedRoutines, getTodayProgress, getUserStats } from '@/lib/utils/dashboard';
import { DailyProgress, Routine, UserStats } from '@/types';
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

export default function DashboardScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [todayProgress, setTodayProgress] = useState<DailyProgress | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recommendedRoutines, setRecommendedRoutines] = useState<Routine[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

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
      const [progressData, statsData, routinesData] = await Promise.all([
        getTodayProgress(user.id),
        getUserStats(user.id),
        getBalancedRoutines(profile?.journey_focus || null, profile?.fitness_level || null),
      ]);

      console.log('Today Progress:', progressData); // Debug log
      setTodayProgress(progressData);
      setStats(statsData);
      setRecommendedRoutines(routinesData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3533cd" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
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
        <Text style={styles.greeting}>
          Hello, {profile?.full_name || 'there'}!
        </Text>
        <Text style={styles.subtitle}>Check out your personalized routines below.</Text>
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
      return '#3B82F6';
    case 'Body':
      return '#EF4444';
    case 'Soul':
      return '#F59E0B';
    default:
      return '#3533cd';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    paddingTop: 100,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3533cd',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginTop: 16,
    padding: 24,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
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
    color: '#1a1a1a',
    marginBottom: 8,
  },
  progressIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
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
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statSuffix: {
    fontSize: 14,
    color: '#666',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  routineCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
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
    color: '#1a1a1a',
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  routineDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  routineDetails: {
    fontSize: 12,
    color: '#999',
  },
});
