import { AppColors } from '@/constants/theme';
import { useAuth } from '@/lib/contexts/AuthContext';
import { initAudio, playCountdownBeep } from '@/lib/utils/audio';
import { completeRoutine, getRoutineById, getTodayProgress, getUserStats } from '@/lib/utils/dashboard';
import { setDashboardCache } from '@/lib/utils/dashboard-cache';
import { checkHarmonyRequirements } from '@/lib/utils/harmony';
import { getPainCheckInHistory, getPainStatistics } from '@/lib/utils/pain-checkin';
import { completeCircleRoutine, getFormattedFriendActivity } from '@/lib/utils/social';
import { calculateActivityStreak, getAllAvatarStates, getAvatarLightState } from '@/lib/utils/stats';
import { formatTime } from '@/lib/utils/time';
import { AvatarLightState, Exercise, Routine, RoutineCategory } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import HapticPressable from '@/components/HapticPressable';

// Completion animation - add your Lottie JSON file to assets/animations/
// Expected file: assets/animations/routine_complete.json
const COMPLETION_ANIMATION = require('@/assets/animations/routine_complete.json');

// Helper function to get category icon
const getCategoryIcon = (category: RoutineCategory) => {
  switch (category) {
    case 'Mind':
      return 'bulb-outline' as const;
    case 'Body':
      return 'body' as const;
    case 'Soul':
      return 'flame' as const;
  }
};

// Helper function to get avatar glow colors based on light state
const getAvatarGlowColor = (lightState: AvatarLightState, category: RoutineCategory): { borderColor: string; shadowColor: string; glowIntensity: number } => {
  const categoryColors: Record<string, string> = {
    'Mind': '#3B82F6',   // Blue
    'Body': '#EF4444',   // Red
    'Soul': '#F59E0B',   // Orange/Gold
  };

  const baseColor = categoryColors[category] || '#F59E0B';

  switch (lightState) {
    case 'Dormant':
      return { borderColor: '#374151', shadowColor: '#000000', glowIntensity: 0 };
    case 'Sleepy':
      return { borderColor: '#6B7280', shadowColor: baseColor, glowIntensity: 2 };
    case 'Awakening':
      return { borderColor: baseColor, shadowColor: baseColor, glowIntensity: 8 };
    case 'Glowing':
      return { borderColor: baseColor, shadowColor: baseColor, glowIntensity: 16 };
    case 'Radiant':
      return { borderColor: '#FFD700', shadowColor: '#FFD700', glowIntensity: 24 };
    default:
      return { borderColor: '#374151', shadowColor: '#000000', glowIntensity: 0 };
  }
};

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
  const [showInstructions, setShowInstructions] = useState(false);
  const [avatarLightState, setAvatarLightState] = useState<AvatarLightState>('Awakening');
  const [animationFinished, setAnimationFinished] = useState(false);
  const [dashboardPreloaded, setDashboardPreloaded] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);

  // Streak tracking for animation
  const [showStreakUpdate, setShowStreakUpdate] = useState(false);
  const [previousStreak, setPreviousStreak] = useState<number>(0);
  const [newStreak, setNewStreak] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    initAudio(); // Initialize audio settings
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
      setShowInstructions(false); // Hide instructions when moving to next exercise
    }
  }, [currentExerciseIndex, routine]);

  useEffect(() => {
    if (!isPaused && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          // Play countdown beeps at 3, 2, 1 seconds
          if (prev === 4 || prev === 3 || prev === 2) {
            playCountdownBeep();
          }

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

  // Fallback: if animation callback doesn't fire, mark as finished after 3 seconds
  useEffect(() => {
    if (isComplete && !animationFinished) {
      const fallbackTimer = setTimeout(() => {
        setAnimationFinished(true);
      }, 3000); // 3 second fallback for animation callback

      return () => clearTimeout(fallbackTimer);
    }
  }, [isComplete, animationFinished]);

  // Loading timer - counts seconds while waiting for data to load
  useEffect(() => {
    if (isComplete && !dashboardPreloaded) {
      // Start counting
      setLoadingSeconds(0);
      loadingTimerRef.current = setInterval(() => {
        setLoadingSeconds((prev) => prev + 1);
      }, 1000);

      return () => {
        if (loadingTimerRef.current) {
          clearInterval(loadingTimerRef.current);
        }
      };
    } else if (dashboardPreloaded && loadingTimerRef.current) {
      // Stop counting when loaded
      clearInterval(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  }, [isComplete, dashboardPreloaded]);

  const loadRoutine = async () => {
    if (!id || !user) return;

    try {
      setLoading(true);
      const data = await getRoutineById(id);
      setRoutine(data);
      if (data && data.exercises && data.exercises.length > 0) {
        setTimeRemaining(data.exercises[0].duration_seconds);

        // Calculate avatar light state
        const todayProgress = await getTodayProgress(user.id);
        const categoryCompleted = data.category === 'Mind' ? todayProgress?.mind_complete :
                                  data.category === 'Body' ? todayProgress?.body_complete :
                                  todayProgress?.soul_complete;
        const allCategoriesCompleted = todayProgress?.mind_complete && todayProgress?.body_complete && todayProgress?.soul_complete;

        const lightState = getAvatarLightState(categoryCompleted || false, allCategoriesCompleted || false, true);
        setAvatarLightState(lightState);
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

    // Trigger strong vibration pattern for completion (like an alarm)
    // Pattern: vibrate 400ms, pause 200ms, vibrate 400ms, pause 200ms, vibrate 400ms
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 400, 200, 400, 200, 400]);
    } else {
      // iOS doesn't support patterns, so we do multiple vibrations
      Vibration.vibrate(400);
      setTimeout(() => Vibration.vibrate(400), 600);
      setTimeout(() => Vibration.vibrate(400), 1200);
    }

    try {
      // Get current streak BEFORE completing the routine
      const streakBefore = await calculateActivityStreak(user.id);
      setPreviousStreak(streakBefore.currentStreak);

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

      // Get new streak AFTER completing the routine
      const streakAfter = await calculateActivityStreak(user.id);
      setNewStreak(streakAfter.currentStreak);

      // Show streak update screen if streak changed
      if (streakAfter.currentStreak !== streakBefore.currentStreak) {
        setShowStreakUpdate(true);
      } else {
        // Skip streak screen, go directly to completion
        setIsComplete(true);
      }

      // Preload dashboard data in the background while screens show
      preloadDashboardData();
    } catch (error) {
      console.error('Error completing routine:', error);
      // On error, still show completion screen
      setIsComplete(true);
      // Still try to preload dashboard data
      preloadDashboardData();
    }
  };

  const preloadDashboardData = async () => {
    if (!user) {
      setDashboardPreloaded(true);
      return;
    }

    try {
      // Fetch all dashboard data in parallel
      const [progressData, statsData, activityData, avatarsData, painStatsData, painHistoryData, harmonyData] = await Promise.all([
        getTodayProgress(user.id),
        getUserStats(user.id),
        getFormattedFriendActivity(user.id, 5),
        getAllAvatarStates(user.id),
        getPainStatistics(user.id, 100),
        getPainCheckInHistory(user.id, 100),
        checkHarmonyRequirements(user.id),
      ]);

      // Store in cache for dashboard to use
      setDashboardCache({
        todayProgress: progressData,
        stats: statsData,
        friendActivity: activityData,
        avatarStates: avatarsData,
        painStats: painStatsData,
        painHistory: painHistoryData,
        harmonyStatus: harmonyData,
      });
    } catch (error) {
      console.error('Error preloading dashboard data:', error);
    } finally {
      setDashboardPreloaded(true);
    }
  };

  const handleDonePress = () => {
    // Navigate to dashboard - data should already be cached/preloaded
    router.replace('/(tabs)');
  };

  const handleStreakContinue = () => {
    // Move from streak update screen to completion screen
    setShowStreakUpdate(false);
    setIsComplete(true);
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
        <HapticPressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </HapticPressable>
      </View>
    );
  }

  // Streak Update Screen - shown when streak changes
  // This is a proxy screen for future animation
  if (showStreakUpdate) {
    return (
      <View style={styles.streakContainer}>
        {/* Placeholder for future streak animation */}
        <View style={styles.streakAnimationPlaceholder}>
          <Ionicons name="flame" size={80} color="#F59E0B" />
        </View>

        <Text style={styles.streakTitle}>
          {previousStreak === 0 ? 'Streak Started!' : 'Streak Updated!'}
        </Text>

        <View style={styles.streakChangeContainer}>
          <Text style={styles.streakOldValue}>{previousStreak}</Text>
          <Ionicons name="arrow-forward" size={32} color={AppColors.textTertiary} />
          <Text style={styles.streakNewValue}>{newStreak}</Text>
        </View>

        <Text style={styles.streakMessage}>
          {previousStreak === 0
            ? "You've started a new streak! Keep it going!"
            : `${newStreak} day${newStreak === 1 ? '' : 's'} in a row!`}
        </Text>

        <HapticPressable
          style={styles.streakContinueButton}
          onPress={handleStreakContinue}
        >
          <Text style={styles.streakContinueButtonText}>Continue</Text>
        </HapticPressable>
      </View>
    );
  }

  if (isComplete) {
    // Done button is enabled when both animation is done AND dashboard data is preloaded
    const canNavigate = animationFinished && dashboardPreloaded;

    return (
      <View style={styles.completeContainer}>
        {/* Lottie Animation - plays automatically */}
        <LottieView
          ref={animationRef}
          source={COMPLETION_ANIMATION}
          autoPlay
          loop={false}
          style={styles.completionAnimation}
          onAnimationFinish={() => setAnimationFinished(true)}
        />
        <Text style={styles.completeTitle}>Routine Complete!</Text>
        <Text style={styles.completeMessage}>Great work on completing {routine.name}</Text>

        {/* Done Button - enabled after animation finishes AND dashboard is preloaded */}
        <HapticPressable
          style={[
            styles.doneButton,
            !canNavigate && styles.doneButtonLoading,
          ]}
          onPress={handleDonePress}
          disabled={!canNavigate}
        >
          {canNavigate ? (
            <Text style={styles.doneButtonText}>Done</Text>
          ) : (
            <View style={styles.doneButtonLoadingContent}>
              <ActivityIndicator size="small" color={AppColors.textPrimary} />
              <Text style={styles.doneButtonText}>{loadingSeconds}s</Text>
            </View>
          )}
        </HapticPressable>
      </View>
    );
  }

  const currentExercise: Exercise = routine.exercises[currentExerciseIndex];
  const progress = ((currentExerciseIndex + 1) / routine.exercises.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <HapticPressable onPress={handleQuit} hapticStyle="medium">
          <Ionicons name="close" size={28} color={AppColors.textPrimary} />
        </HapticPressable>
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

      {/* Main Content - flex centered between header and controls */}
      <View style={styles.mainContent}>
        {/* Avatar Circle - Awakening/Glowing Avatar */}
        <View style={styles.avatarContainer}>
          <View style={[
            styles.avatarCircle,
            {
              borderColor: getAvatarGlowColor(avatarLightState, routine.category).borderColor,
              shadowColor: getAvatarGlowColor(avatarLightState, routine.category).shadowColor,
              shadowOpacity: getAvatarGlowColor(avatarLightState, routine.category).glowIntensity > 0 ? 0.8 : 0,
              shadowRadius: getAvatarGlowColor(avatarLightState, routine.category).glowIntensity,
              elevation: getAvatarGlowColor(avatarLightState, routine.category).glowIntensity,
            }
          ]}>
            <Ionicons
              name={getCategoryIcon(routine.category)}
              size={100}
              color={getAvatarGlowColor(avatarLightState, routine.category).borderColor}
            />
          </View>
          <Text style={styles.avatarStateText}>{avatarLightState}</Text>
        </View>

        {/* Exercise Info */}
        <View style={styles.exerciseContainer}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseName}>{currentExercise.name}</Text>
            <HapticPressable
              style={styles.infoButton}
              onPress={() => setShowInstructions(true)}
            >
              <Ionicons
                name="information-circle-outline"
                size={28}
                color={AppColors.primary}
              />
            </HapticPressable>
          </View>

          {/* Time Display */}
          <View style={styles.timeDisplay}>
            <Text style={styles.timeText}>{formatTime(timeRemaining)}</Text>
            <Text style={styles.timeLabel}>remaining</Text>
          </View>
        </View>
      </View>

      {/* Controls - pinned toward bottom */}
      <View style={styles.controls}>
        <HapticPressable style={styles.playPauseButton} onPress={togglePause}>
          <Ionicons
            name={isPaused ? 'play' : 'pause'}
            size={36}
            color={AppColors.primaryText}
          />
        </HapticPressable>
      </View>

      {/* Exercise Info Modal */}
      <Modal
        visible={showInstructions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInstructions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{currentExercise.name}</Text>
              <HapticPressable
                style={styles.modalCloseButton}
                onPress={() => setShowInstructions(false)}
              >
                <Ionicons name="close" size={28} color={AppColors.textPrimary} />
              </HapticPressable>
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Demo Video or Image */}
              {currentExercise.demo_video_url ? (
                <View style={styles.mediaContainer}>
                  <Video
                    source={{ uri: currentExercise.demo_video_url }}
                    style={styles.demoVideo}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                    isLooping
                    shouldPlay={false}
                  />
                </View>
              ) : currentExercise.demo_image_url ? (
                <View style={styles.mediaContainer}>
                  <Image
                    source={{ uri: currentExercise.demo_image_url }}
                    style={styles.demoImage}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={styles.mediaPlaceholder}>
                  <Ionicons name="play-circle-outline" size={64} color={AppColors.textTertiary} />
                  <Text style={styles.mediaPlaceholderText}>No demo available</Text>
                </View>
              )}

              {/* Instructions Section */}
              <View style={styles.instructionsSection}>
                <Text style={styles.instructionsTitle}>Instructions</Text>
                <Text style={styles.instructionsText}>
                  {currentExercise.instructions || 'No instructions available'}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  completionAnimation: {
    width: 250,
    height: 250,
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
  doneButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
    minWidth: 160,
    alignItems: 'center',
  },
  doneButtonLoading: {
    backgroundColor: AppColors.border,
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  doneButtonLoadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 12,
  },
  routineName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
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
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  exerciseContainer: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  infoButton: {
    padding: 2,
  },
  exerciseInstructions: {
    fontSize: 16,
    color: AppColors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  // Avatar Circle styles
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
  },
  avatarStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginTop: 16,
    textTransform: 'capitalize',
  },
  // Time Display styles
  timeDisplay: {
    alignItems: 'center',
    marginTop: 16,
  },
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: AppColors.primary,
  },
  timeLabel: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 4,
  },
  controls: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 32,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    paddingTop: 8,
  },
  modalContentContainer: {
    paddingBottom: 24,
  },
  mediaContainer: {
    margin: 24,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: AppColors.background,
  },
  demoVideo: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: AppColors.background,
  },
  demoImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: AppColors.background,
  },
  mediaPlaceholder: {
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 12,
    padding: 48,
    margin: 24,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  mediaPlaceholderText: {
    fontSize: 14,
    color: AppColors.textTertiary,
    marginTop: 12,
    textAlign: 'center',
  },
  instructionsSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 16,
    color: AppColors.textSecondary,
    lineHeight: 24,
  },
  // Streak Update Screen Styles
  streakContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: AppColors.background,
  },
  streakAnimationPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  streakTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  streakChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
  },
  streakOldValue: {
    fontSize: 48,
    fontWeight: '300',
    color: AppColors.textTertiary,
  },
  streakNewValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  streakMessage: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  streakContinueButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  streakContinueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
