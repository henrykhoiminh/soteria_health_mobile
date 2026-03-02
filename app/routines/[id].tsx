import { useAuth } from '@/lib/contexts/AuthContext';
import { AppColors } from '@/constants/theme';
import { getRoutineById } from '@/lib/utils/dashboard';
import { deleteCustomRoutine } from '@/lib/utils/routine-builder';
import { isHealthTeamMember } from '@/lib/utils/routine-builder';
import { initAudio } from '@/lib/utils/audio';
import { setRoutineCache } from '@/lib/utils/routine-cache';
import { getAllAvatarStates } from '@/lib/utils/stats';
import { getExerciseAvatarState } from '@/app/routines/[id]/execute';
import { formatDuration } from '@/lib/utils/time';
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
  View,
} from 'react-native';
import HapticPressable from '@/components/HapticPressable';
import RoutineAuthorBadge from '@/components/RoutineAuthorBadge';

export default function RoutineDetailScreen() {
  const { id, circleId } = useLocalSearchParams<{ id: string; circleId?: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [isHealthTeam, setIsHealthTeam] = useState(false);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    loadRoutine();
    checkHealthTeamStatus();
  }, [id, user]);

  const checkHealthTeamStatus = async () => {
    if (!user) return;
    const healthTeamStatus = await isHealthTeamMember(user.id);
    setIsHealthTeam(healthTeamStatus);
  };

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

  const navigateToExecute = () => {
    if (!routine) return;
    if (circleId) {
      router.push(`/routines/${routine.id}/execute?circleId=${circleId}` as any);
    } else {
      router.push(`/routines/${routine.id}/execute`);
    }
  };

  const handleStartRoutine = async () => {
    if (!routine || !user) {
      navigateToExecute();
      return;
    }

    setPreparing(true);
    try {
      // Prefetch avatar states and warm up audio in parallel
      const [avatarStates] = await Promise.all([
        getAllAvatarStates(user.id),
        initAudio(),
      ]);

      // Compute starting light state (same logic as execute.tsx's loadRoutine)
      const categoryState = avatarStates.find(s => s.category === routine.category);
      const currentLightState = categoryState?.lightState ?? 'Dormant';
      const startingLightState: 'Dormant' | 'Sleepy' =
        currentLightState === 'Dormant' ? 'Dormant' : 'Sleepy';
      const initialAvatarState = getExerciseAvatarState(
        0,
        routine.exercises?.length ?? 1,
        startingLightState,
      );

      // Store in cache for execute page to consume
      setRoutineCache({ routine, startingLightState, initialAvatarState });
    } catch (error) {
      console.error('Error prefetching routine data:', error);
      // Navigate anyway — execute page will fall back to its own loading
    } finally {
      setPreparing(false);
      navigateToExecute();
    }
  };

  const handleEditRoutine = () => {
    if (!routine) return;
    router.push(`/(tabs)/builder?editId=${routine.id}`);
  };

  const handleCustomizeRoutine = () => {
    if (!routine) return;
    // Navigate to builder with customizeId to pre-populate with this routine's data
    router.push(`/(tabs)/builder?customizeId=${routine.id}`);
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
  const isOfficialRoutine = routine?.author_type === 'official';
  const canEditOfficial = isHealthTeam && isOfficialRoutine;
  const canEdit = isCustomRoutine || canEditOfficial;
  const isAdvancedRoutine = routine?.is_advanced === true;

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
        <HapticPressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </HapticPressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <HapticPressable style={styles.backIcon} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={AppColors.textPrimary} />
          </HapticPressable>
          <View style={styles.headerRight}>
            {canEdit && (
              <View style={styles.actionButtons}>
                <HapticPressable style={styles.actionButton} onPress={handleEditRoutine}>
                  <Ionicons name="create-outline" size={24} color={canEditOfficial ? '#10B981' : AppColors.primary} />
                </HapticPressable>
                {isCustomRoutine && (
                  <HapticPressable style={styles.actionButton} onPress={handleDeleteRoutine} hapticStyle="medium">
                    <Ionicons name="trash-outline" size={24} color={AppColors.body} />
                  </HapticPressable>
                )}
              </View>
            )}
            {isAdvancedRoutine && (
              <View style={styles.advancedBadge}>
                <Ionicons name="sparkles" size={16} color="#F59E0B" />
                <Text style={styles.advancedBadgeText}>Advanced</Text>
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

          {/* Author Badge */}
          <View style={styles.authorSection}>
            <Text style={styles.authorLabel}>Created by</Text>
            <RoutineAuthorBadge
              authorType={routine.author_type}
              officialAuthor={routine.official_author}
              creatorUsername={routine.creator_username}
              creatorAvatar={routine.creator_avatar}
              creatorName={routine.creator_name}
              size="medium"
              showAvatar={true}
            />
          </View>

          {/* Source Attribution - Remix feature */}
          {routine.source_routine_name && routine.source_routine_id && (
            <View style={styles.sourceSection}>
              <Text style={styles.authorLabel}>Remixed from</Text>
              <HapticPressable
                style={styles.sourceLink}
                onPress={() => router.push(`/routines/${routine.source_routine_id}`)}
              >
                <Text style={styles.sourceLinkText}>
                  {routine.source_routine_name}
                </Text>
                {routine.source_routine_is_official && (
                  <View style={styles.officialBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.officialBadgeText}>Official</Text>
                  </View>
                )}
              </HapticPressable>
            </View>
          )}

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
                  {formatDuration(exercise.duration_seconds)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer with Start and Customize Buttons */}
      <View style={styles.footer}>
        <HapticPressable
          style={[styles.startButton, preparing && styles.startButtonPreparing]}
          onPress={handleStartRoutine}
          disabled={!user || preparing}
        >
          {preparing ? (
            <>
              <ActivityIndicator size="small" color={AppColors.primaryText} />
              <Text style={styles.startButtonText}>Preparing...</Text>
            </>
          ) : (
            <>
              <Ionicons name="play" size={24} color={AppColors.primaryText} />
              <Text style={styles.startButtonText}>Start Routine</Text>
            </>
          )}
        </HapticPressable>

        {/* Customize Button - allows users to create their own version */}
        {user && (
          <HapticPressable
            style={styles.customizeButton}
            onPress={handleCustomizeRoutine}
          >
            <Ionicons name="copy-outline" size={20} color={AppColors.primary} />
            <Text style={styles.customizeButtonText}>Remix This Routine</Text>
          </HapticPressable>
        )}
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
    marginBottom: 16,
  },
  sourceSection: {
    marginBottom: 20,
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.primary,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  officialBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  authorSection: {
    marginBottom: 20,
  },
  authorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
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
    backgroundColor: AppColors.glassBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.glassEdge,
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
    backgroundColor: AppColors.glassBackground,
    borderTopWidth: 1,
    borderTopColor: AppColors.glassEdge,
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
  startButtonPreparing: {
    opacity: 0.7,
  },
  startButtonText: {
    color: AppColors.primaryText,
    fontSize: 18,
    fontWeight: '600',
  },
  customizeButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  customizeButtonText: {
    color: AppColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  advancedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  advancedBadgeText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
  },
});
