import { useAuth } from '@/lib/contexts/AuthContext';
import { AppColors } from '@/constants/theme';
import { completeRoutine, getRoutineById } from '@/lib/utils/dashboard';
import { completeCircleRoutine } from '@/lib/utils/social';
import { Exercise, Routine } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ExecuteRoutineScreen() {
  const { id, circleId } = useLocalSearchParams<{ id: string; circleId?: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadRoutine();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [id]);

  useEffect(() => {
    if (routine && routine.exercises && currentExerciseIndex < routine.exercises.length) {
      setTimeRemaining(routine.exercises[currentExerciseIndex].duration_seconds);
      setIsPaused(true); // Start paused, user clicks "Start"
    }
  }, [currentExerciseIndex, routine]);

  useEffect(() => {
    if (!isPaused && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleExerciseComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused, timeRemaining]);

  const loadRoutine = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getRoutineById(id);
      setRoutine(data);
      if (data && data.exercises && data.exercises.length > 0) {
        setTimeRemaining(data.exercises[0].duration_seconds);
      }
    } catch (error) {
      console.error('Error loading routine:', error);
      Alert.alert('Error', 'Failed to load routine');
    } finally {
      setLoading(false);
    }
  };

  const handleExerciseComplete = () => {
    if (!routine || !routine.exercises) return;

    if (currentExerciseIndex < routine.exercises.length - 1) {
      // Move to next exercise
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setIsPaused(true); // Pause between exercises
    } else {
      // All exercises complete
      handleRoutineComplete();
    }
  };

  const handleRoutineComplete = async () => {
    if (!user || !routine) return;

    setIsComplete(true);

    try {
      // Complete routine for individual daily progress
      await completeRoutine(user.id, routine.id, routine.category);

      // If executed from a circle, also track circle completion
      if (circleId) {
        try {
          await completeCircleRoutine(circleId, routine.id, user.id);
        } catch (circleError) {
          console.error('Error tracking circle completion:', circleError);
          // Don't fail the whole completion if circle tracking fails
        }
      }

      Alert.alert(
        'Congratulations!',
        `You've completed ${routine.name}! Great work!`,
        [
          {
            text: 'Done',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error) {
      console.error('Error completing routine:', error);
      Alert.alert('Routine complete!', 'Great work!', [
        {
          text: 'Done',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    }
  };

  const handleQuit = () => {
    Alert.alert(
      'Quit Routine?',
      'Your progress will not be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  if (!routine || !routine.exercises || routine.exercises.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={AppColors.textTertiary} />
        <Text style={styles.errorText}>No exercises found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isComplete) {
    return (
      <View style={styles.completeContainer}>
        <Ionicons name="checkmark-circle" size={100} color={AppColors.success} />
        <Text style={styles.completeTitle}>Routine Complete!</Text>
        <Text style={styles.completeMessage}>Great work on completing {routine.name}</Text>
      </View>
    );
  }

  const currentExercise: Exercise = routine.exercises[currentExerciseIndex];
  const progress = ((currentExerciseIndex + 1) / routine.exercises.length) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleQuit}>
          <Ionicons name="close" size={28} color={AppColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.routineName}>{routine.name}</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Exercise {currentExerciseIndex + 1} of {routine.exercises.length}
        </Text>
      </View>

      {/* Exercise Info */}
      <View style={styles.exerciseContainer}>
        <Text style={styles.exerciseName}>{currentExercise.name}</Text>
        <Text style={styles.exerciseInstructions}>{currentExercise.instructions}</Text>
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <View style={styles.timerCircle}>
          <Text style={styles.timerText}>{timeRemaining}</Text>
          <Text style={styles.timerLabel}>seconds</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.pauseButton} onPress={togglePause}>
          <Ionicons
            name={isPaused ? 'play' : 'pause'}
            size={48}
            color={AppColors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Spacer */}
      <View style={{ height: 40 }} />
    </View>
  );
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
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: AppColors.background,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  completeMessage: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  routineName: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  progressBar: {
    height: 8,
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: AppColors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  exerciseContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  exerciseName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  exerciseInstructions: {
    fontSize: 16,
    color: AppColors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: AppColors.primary,
  },
  timerText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: AppColors.primary,
  },
  timerLabel: {
    fontSize: 16,
    color: AppColors.textSecondary,
    marginTop: 4,
  },
  controls: {
    alignItems: 'center',
    marginVertical: 32,
  },
  pauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
