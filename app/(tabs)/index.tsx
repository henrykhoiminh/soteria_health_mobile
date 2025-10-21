import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getTodayProgress, getUserStats, getRecommendedRoutines } from '@/lib/utils/dashboard';
import { DailyProgress, UserStats, Routine } from '@/types';

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

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [progressData, statsData, routinesData] = await Promise.all([
        getTodayProgress(user.id),
        getUserStats(user.id),
        getRecommendedRoutines(6),
      ]);

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
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hello, {profile?.full_name || 'there'}!
        </Text>
        <Text style={styles.subtitle}>Your wellness journey today</Text>
      </View>

      {/* Today's Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Progress</Text>
        <View style={styles.progressGrid}>
          <ProgressCard
            title="Mind"
            completed={todayProgress?.mind_complete || false}
            color="#9333EA"
          />
          <ProgressCard
            title="Body"
            completed={todayProgress?.body_complete || false}
            color="#0EA5E9"
          />
          <ProgressCard
            title="Soul"
            completed={todayProgress?.soul_complete || false}
            color="#F59E0B"
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

function ProgressCard({ title, completed, color }: { title: string; completed: boolean; color: string }) {
  return (
    <View style={[styles.progressCard, { borderColor: color }]}>
      <Text style={styles.progressTitle}>{title}</Text>
      <View style={[styles.progressIndicator, completed && { backgroundColor: color }]}>
        {completed && <Text style={styles.checkmark}>✓</Text>}
      </View>
    </View>
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
      return '#9333EA';
    case 'Body':
      return '#0EA5E9';
    case 'Soul':
      return '#F59E0B';
    default:
      return '#007AFF';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
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
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
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
    backgroundColor: '#f5f5f5',
    marginBottom: 12,
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
