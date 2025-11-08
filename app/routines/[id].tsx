import { useAuth } from '@/lib/contexts/AuthContext';
import { AppColors } from '@/constants/theme';
import { getRoutineById } from '@/lib/utils/dashboard';
import { deleteCustomRoutine } from '@/lib/utils/routine-builder';
import { Routine } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [routine, setRoutine] = useState<Routine | null>(null);

  useEffect(() => {
    loadRoutine();
  }, [id]);

  const loadRoutine = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getRoutineById(id);
      setRoutine(data);
    } catch (error) {
      console.error('Error loading routine:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRoutine = () => {
    if (!routine) return;
    router.push(`/routines/${routine.id}/execute`);
  };

  const handleEditRoutine = () => {
    if (!routine) return;
    router.push(`/(tabs)/builder?editId=${routine.id}`);
  };

  const handleDeleteRoutine = () => {
    if (!routine || !user) return;

    Alert.alert(
      'Delete Routine?',
      'This action cannot be undone. Are you sure you want to delete this custom routine?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomRoutine(user.id, routine.id);
              Alert.alert('Success', 'Routine deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(tabs)/routines'),
                },
              ]);
            } catch (error) {
              console.error('Error deleting routine:', error);
              Alert.alert('Error', 'Failed to delete routine. Please try again.');
            }
          },
        },
      ]
    );
  };

  const isCustomRoutine = routine?.is_custom && routine?.created_by === user?.id;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  if (!routine) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={AppColors.textTertiary} />
        <Text style={styles.errorText}>Routine not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={AppColors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            {isCustomRoutine && (
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton} onPress={handleEditRoutine}>
                  <Ionicons name="create-outline" size={24} color={AppColors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleDeleteRoutine}>
                  <Ionicons name="trash-outline" size={24} color={AppColors.body} />
                </TouchableOpacity>
              </View>
            )}
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(routine.category) }]}>
              <Text style={styles.categoryText}>{routine.category}</Text>
            </View>
          </View>
        </View>

        {/* Title & Info */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{routine.name}</Text>
          <Text style={styles.description}>{routine.description}</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color={AppColors.textSecondary} />
              <Text style={styles.infoText}>{routine.duration_minutes} min</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="bar-chart-outline" size={20} color={AppColors.textSecondary} />
              <Text style={styles.infoText}>{routine.difficulty}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color={AppColors.textSecondary} />
              <Text style={styles.infoText}>{routine.completion_count} completions</Text>
            </View>
          </View>
        </View>

        {/* Benefits */}
        {routine.benefits && routine.benefits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Benefits</Text>
            {routine.benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={AppColors.primary} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Exercises */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Exercises ({routine.exercises?.length || 0})
          </Text>
          {routine.exercises && routine.exercises.map((exercise, index) => (
            <View key={index} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNumber}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
              </View>
              <Text style={styles.exerciseInstructions}>{exercise.instructions}</Text>
              <View style={styles.exerciseDuration}>
                <Ionicons name="timer-outline" size={16} color={AppColors.primary} />
                <Text style={styles.exerciseDurationText}>
                  {exercise.duration_seconds}s
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Start Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartRoutine}
          disabled={!user}
        >
          <Ionicons name="play" size={24} color={AppColors.textPrimary} />
          <Text style={styles.startButtonText}>Start Routine</Text>
        </TouchableOpacity>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: AppColors.background,
  },
  errorText: {
    fontSize: 18,
    color: AppColors.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: AppColors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
  },
  backIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  categoryText: {
    color: AppColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  titleSection: {
    padding: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: AppColors.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  section: {
    padding: 24,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: AppColors.textPrimary,
    lineHeight: 22,
  },
  exerciseCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumberText: {
    color: AppColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  exerciseInstructions: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  exerciseDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseDurationText: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: '500',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    backgroundColor: AppColors.surface,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
  },
  startButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  startButtonText: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
});
