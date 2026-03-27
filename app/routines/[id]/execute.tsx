import ParticleField from '@/components/Dashboard/ParticleField';
import SanctumBackground from '@/components/Dashboard/SanctumBackground';
import HapticPressable from '@/components/HapticPressable';
import LevelUpCelebrationModal from '@/components/LevelUpCelebrationModal';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/lib/contexts/AuthContext';
import { initAudio, playCountdownBeep } from '@/lib/utils/audio';
import { getAllCompanionSlides, getCompanionImage } from '@/lib/utils/companion-images';
import { completeRoutine, getRoutineById, getTodayProgress, getUserStats } from '@/lib/utils/dashboard';
import { calculateXpForCompletion, getLevelFromXp } from '@/lib/utils/leveling';
import { setDashboardCache } from '@/lib/utils/dashboard-cache';
import { clearRoutineCache, getRoutineCache } from '@/lib/utils/routine-cache';
import { checkHarmonyRequirements } from '@/lib/utils/harmony';
import { getPainCheckInHistory, getPainStatistics } from '@/lib/utils/pain-checkin';
import { completeCircleRoutine, getFormattedFriendActivity } from '@/lib/utils/social';
import { calculateActivityStreak, getAllAvatarStates } from '@/lib/utils/stats';
import { formatTime } from '@/lib/utils/time';
import { AvatarLightState, Exercise, LevelUpInfo, Routine, RoutineCategory } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

// Circular progress ring constants
const RING_SIZE = 268;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const getCategoryColor = (category: RoutineCategory): string => {
  switch (category) {
    case 'Mind': return '#3B82F6';
    case 'Body': return '#EF4444';
    case 'Soul': return '#F59E0B';
  }
};

/**
 * Maps exercise index to avatar light state during routine execution.
 * Progresses from starting state → Awakening, with the last exercise always Awakening.
 */
export function getExerciseAvatarState(
  exerciseIndex: number,
  totalExercises: number,
  startingState: 'Dormant' | 'Sleepy',
): AvatarLightState {
  if (totalExercises === 1) return 'Awakening';
  if (exerciseIndex >= totalExercises - 1) return 'Awakening';

  const progression: AvatarLightState[] = startingState === 'Dormant'
    ? ['Dormant', 'Sleepy', 'Awakening']
    : ['Sleepy', 'Awakening'];

  const statesBeforeFinal = progression.length - 1;
  const exercisesBeforeFinal = totalExercises - 1;

  const stateIndex = Math.min(
    Math.floor((exerciseIndex * statesBeforeFinal) / exercisesBeforeFinal),
    statesBeforeFinal - 1,
  );

  return progression[stateIndex];
}

export default function ExecuteRoutineScreen() {
  const { id, circleId } = useLocalSearchParams<{ id: string; circleId?: string }>();
  const { user, profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [avatarLightState, setAvatarLightState] = useState<AvatarLightState>('Dormant');
  const [startingLightState, setStartingLightState] = useState<'Dormant' | 'Sleepy'>('Dormant');
  const [animationFinished, setAnimationFinished] = useState(false);
  const [dashboardPreloaded, setDashboardPreloaded] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);

  // Evolution animation state for completion screen
  const [evolutionPhase, setEvolutionPhase] = useState<'awakening' | 'evolving' | 'glowed'>('awakening');
  const evolutionFlash = useRef(new Animated.Value(0)).current;
  const evolutionScale = useRef(new Animated.Value(1)).current;
  const evolutionTextOpacity = useRef(new Animated.Value(1)).current;
  const buttonFadeIn = useRef(new Animated.Value(0)).current;

  // XP reveal animation
  const [displayedXp, setDisplayedXp] = useState(0);
  const [showXpReveal, setShowXpReveal] = useState(false);
  const [categoryXpBefore, setCategoryXpBefore] = useState(0);
  const xpRevealOpacity = useRef(new Animated.Value(0)).current;
  const xpRevealScale = useRef(new Animated.Value(0.5)).current;
  const xpBarProgress = useRef(new Animated.Value(0)).current;

  // Streak tracking for animation
  const [showStreakUpdate, setShowStreakUpdate] = useState(false);
  const [previousStreak, setPreviousStreak] = useState<number>(0);
  const [newStreak, setNewStreak] = useState<number>(0);

  // Level-up tracking
  const [levelUpData, setLevelUpData] = useState<LevelUpInfo[]>([]);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [currentLevelUpIndex, setCurrentLevelUpIndex] = useState(0);

  // Loading ellipsis animation
  const [ellipsis, setEllipsis] = useState('');

  // Loading slideshow
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const slideshowSlides = useMemo(() => getAllCompanionSlides(), []);
  const slideshowFade = useRef(new Animated.Value(1)).current;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(RING_CIRCUMFERENCE)).current;

  // Resolve companion image once (random variant stays stable across re-renders)
  const companionImage = useMemo(
    () => routine ? getCompanionImage(routine.category, avatarLightState) : null,
    [routine?.category, avatarLightState]
  );

  useEffect(() => {
    initAudio(); // Initialize audio settings
    loadRoutine();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [id]);

  // Animated ellipsis for loading text
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setEllipsis((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);

  // Loading slideshow - cycle through companion states with crossfade
  useEffect(() => {
    if (!loading || slideshowSlides.length === 0) return;

    const interval = setInterval(() => {
      // Fade out
      Animated.timing(slideshowFade, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Switch slide
        setSlideshowIndex((prev) => (prev + 1) % slideshowSlides.length);
        // Fade in
        Animated.timing(slideshowFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [loading, slideshowSlides.length]);

  useEffect(() => {
    if (routine && routine.exercises && currentExerciseIndex < routine.exercises.length) {
      setTimeRemaining(routine.exercises[currentExerciseIndex].duration_seconds);
      setIsPaused(true); // Start paused, user clicks "Start"
      setShowInstructions(false); // Hide instructions when moving to next exercise

      // Progress avatar state through Dormant → Sleepy → Awakening
      setAvatarLightState(
        getExerciseAvatarState(currentExerciseIndex, routine.exercises.length, startingLightState)
      );
    }
  }, [currentExerciseIndex, routine, startingLightState]);

  // Animate progress ring when exercise index changes
  useEffect(() => {
    if (!routine) return;
    const target = RING_CIRCUMFERENCE * (1 - currentExerciseIndex / routine.exercises.length);
    Animated.timing(progressAnim, {
      toValue: target,
      duration: 600,
      useNativeDriver: false, // strokeDashoffset can't use native driver
    }).start();
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

  // Evolution animation sequence when completion screen appears
  useEffect(() => {
    if (!isComplete) return;

    // Phase 1: Show Awakening for 2 seconds
    const startEvolution = setTimeout(() => {
      setEvolutionPhase('evolving');

      // Fade out the text
      Animated.timing(evolutionTextOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Scale up + flash white
      Animated.parallel([
        Animated.sequence([
          Animated.timing(evolutionScale, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(evolutionScale, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(evolutionFlash, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.delay(200),
          Animated.timing(evolutionFlash, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Evolution complete - show glowing state
        setEvolutionPhase('glowed');

        // Fade text back in with new content
        Animated.timing(evolutionTextOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();

        // Start XP reveal after a brief pause
        setTimeout(() => {
          const earnedXp = routine ? calculateXpForCompletion(routine.duration_minutes) : 20;
          const beforeLevel = getLevelFromXp(categoryXpBefore);
          const afterLevel = getLevelFromXp(categoryXpBefore + earnedXp);

          // Set initial bar position to "before" progress
          xpBarProgress.setValue(beforeLevel.progress);

          setShowXpReveal(true);

          // Animate XP badge in (scale + fade)
          Animated.parallel([
            Animated.spring(xpRevealScale, {
              toValue: 1,
              friction: 6,
              tension: 80,
              useNativeDriver: true,
            }),
            Animated.timing(xpRevealOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Count up XP from 0 to earned amount
            const steps = Math.min(earnedXp, 30);
            const stepDuration = 600 / steps;
            let step = 0;

            const counter = setInterval(() => {
              step++;
              setDisplayedXp(Math.round((step / steps) * earnedXp));
              if (step >= steps) {
                clearInterval(counter);
                setDisplayedXp(earnedXp);
              }
            }, stepDuration);

            // Animate progress bar from before → after
            Animated.timing(xpBarProgress, {
              toValue: afterLevel.progress,
              duration: 800,
              useNativeDriver: false,
            }).start(() => {
              // Mark animation finished and fade in Continue button
              setAnimationFinished(true);
              setTimeout(() => {
                Animated.timing(buttonFadeIn, {
                  toValue: 1,
                  duration: 500,
                  useNativeDriver: true,
                }).start();
              }, 300);
            });
          });
        }, 500);
      });
    }, 2000);

    return () => clearTimeout(startEvolution);
  }, [isComplete]);

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

  // Subtle breathing animation for companion character images
  useEffect(() => {
    if (companionImage) {
      const breathe = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1.03,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      breathe.start();
      return () => breathe.stop();
    } else {
      breatheAnim.setValue(1);
    }
  }, [companionImage]);

  const loadRoutine = async () => {
    if (!id || !user) return;

    // Check prefetch cache first (populated by detail page)
    const cached = getRoutineCache(id);
    if (cached) {
      clearRoutineCache();
      setRoutine(cached.routine);
      if (cached.routine.exercises && cached.routine.exercises.length > 0) {
        setTimeRemaining(cached.routine.exercises[0].duration_seconds);
        setStartingLightState(cached.startingLightState);
        setAvatarLightState(cached.initialAvatarState);
      }
      setLoading(false);
      return;
    }

    // Cache miss (e.g. deep link) — fall back to fetching
    try {
      setLoading(true);
      const data = await getRoutineById(id);
      setRoutine(data);
      if (data && data.exercises && data.exercises.length > 0) {
        setTimeRemaining(data.exercises[0].duration_seconds);

        // Fetch actual avatar states (same source as dashboard) to start at the correct state
        const currentAvatarStates = await getAllAvatarStates(user.id);
        const categoryState = currentAvatarStates.find(s => s.category === data.category);
        const currentLightState = categoryState?.lightState ?? 'Dormant';

        // Use current dashboard state as the starting point for execution progression
        const starting: 'Dormant' | 'Sleepy' =
          currentLightState === 'Dormant' ? 'Dormant' : 'Sleepy';
        setStartingLightState(starting);
        setAvatarLightState(getExerciseAvatarState(0, data.exercises.length, starting));
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
      // Get current streak and stats BEFORE completing the routine
      const [streakBefore, statsBefore] = await Promise.all([
        calculateActivityStreak(user.id),
        getUserStats(user.id),
      ]);
      setPreviousStreak(streakBefore.currentStreak);

      // Capture category XP before completion for progress bar animation
      if (statsBefore) {
        const categoryKey = `${routine.category.toLowerCase()}_xp` as keyof typeof statsBefore;
        setCategoryXpBefore((statsBefore[categoryKey] as number) ?? 0);
      }

      // Complete routine for individual daily progress
      const result = await completeRoutine(user.id, routine.id, routine.category, routine.duration_minutes);

      // Store level-up data if any
      if (result.levelUps.length > 0) {
        setLevelUpData(result.levelUps);
      }

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
      } else if (result.levelUps.length > 0) {
        // No streak change but level-up occurred - show level-up celebration
        setCurrentLevelUpIndex(0);
        setShowLevelUp(true);
      } else {
        // Skip streak and level-up screens, go directly to completion
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
    setShowStreakUpdate(false);
    // Show level-up celebration if there are level-ups, otherwise go to completion
    if (levelUpData.length > 0) {
      setCurrentLevelUpIndex(0);
      setShowLevelUp(true);
    } else {
      setIsComplete(true);
    }
  };

  const handleLevelUpDismiss = () => {
    if (currentLevelUpIndex < levelUpData.length - 1) {
      // Show next level-up
      setCurrentLevelUpIndex(currentLevelUpIndex + 1);
    } else {
      // All level-ups shown, go to completion screen
      setShowLevelUp(false);
      setIsComplete(true);
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
    const currentSlide = slideshowSlides[slideshowIndex];

    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={[styles.slideshowContainer, { opacity: slideshowFade }]}>
          {currentSlide?.image ? (
            <Image
              source={currentSlide.image}
              style={styles.slideshowImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.slideshowPlaceholder, { borderColor: '#F59E0B' }]}>
              <Ionicons name="flame" size={80} color="#F59E0B" />
            </View>
          )}
        </Animated.View>
        <Text style={styles.loadingText}>Loading{ellipsis}</Text>
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

  // Level-Up Celebration - shown after streak screen (or directly if no streak change)
  if (showLevelUp && levelUpData.length > 0) {
    return (
      <LevelUpCelebrationModal
        visible={true}
        levelUp={levelUpData[currentLevelUpIndex]}
        onContinue={handleLevelUpDismiss}
      />
    );
  }

  if (isComplete) {
    const canNavigate = animationFinished && dashboardPreloaded;
    const categoryColor = getCategoryColor(routine.category);
    const companionName = profile?.[`${routine.category.toLowerCase()}_name` as keyof typeof profile] as string | null || routine.category;

    // Show Awakening image during start/evolving, switch to Glowing after evolution
    const completionImage = getCompanionImage(
      routine.category,
      evolutionPhase === 'glowed' ? 'Glowing' : 'Awakening',
    );

    const evolutionMessage = evolutionPhase === 'glowed'
      ? `${companionName} is glowing!`
      : `${companionName} is awakening...`;

    return (
      <SanctumBackground focusCategory={routine.category}>
        <ParticleField color={categoryColor} alwaysVisible />
        <SafeAreaView style={styles.completeContainer}>
          {/* Companion image with evolution animation */}
          {completionImage && (
            <Animated.View style={{
              transform: [
                { scale: Animated.multiply(breatheAnim, evolutionScale) },
              ],
            }}>
              <Image source={completionImage} style={styles.completionCompanionImage} resizeMode="contain" />
              {/* White flash overlay */}
              <Animated.View
                style={[
                  styles.evolutionFlashOverlay,
                  { opacity: evolutionFlash },
                ]}
                pointerEvents="none"
              />
            </Animated.View>
          )}

          <Text style={[styles.completeTitle, { color: categoryColor }]}>Routine Complete!</Text>

          <Animated.Text style={[styles.completeMessage, { opacity: evolutionTextOpacity }]}>
            {evolutionMessage}
          </Animated.Text>

          <Text style={styles.completeSubMessage}>{routine.name}</Text>

          {/* XP Earned Reveal with Progress Bar */}
          {showXpReveal && (() => {
            const earnedXp = calculateXpForCompletion(routine.duration_minutes);
            const afterLevel = getLevelFromXp(categoryXpBefore + earnedXp);
            return (
              <Animated.View style={[
                styles.xpRevealContainer,
                {
                  opacity: xpRevealOpacity,
                  transform: [{ scale: xpRevealScale }],
                },
              ]}>
                <Text style={[styles.xpRevealValue, { color: categoryColor }]}>
                  +{displayedXp} XP
                </Text>
                {/* Progress bar */}
                <View style={styles.xpBarContainer}>
                  <View style={styles.xpBarTrack}>
                    <Animated.View
                      style={[
                        styles.xpBarFill,
                        {
                          backgroundColor: categoryColor,
                          width: xpBarProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.xpBarLabel}>
                    Lv. {afterLevel.level} — {afterLevel.currentXp}/{afterLevel.xpForNextLevel} XP
                  </Text>
                </View>
              </Animated.View>
            );
          })()}

          {/* Continue Button - only appears after evolution completes */}
          {animationFinished && (
            <Animated.View style={{ opacity: buttonFadeIn }}>
              <HapticPressable
                style={[
                  styles.doneButton,
                  { backgroundColor: categoryColor },
                  !canNavigate && styles.doneButtonLoading,
                ]}
                onPress={handleDonePress}
                disabled={!canNavigate}
              >
                {canNavigate ? (
                  <Text style={styles.doneButtonText}>Continue</Text>
                ) : (
                  <View style={styles.doneButtonLoadingContent}>
                    <ActivityIndicator size="small" color={AppColors.textPrimary} />
                    <Text style={styles.doneButtonText}>{loadingSeconds}s</Text>
                  </View>
                )}
              </HapticPressable>
            </Animated.View>
          )}
        </SafeAreaView>
      </SanctumBackground>
    );
  }

  const currentExercise: Exercise = routine.exercises[currentExerciseIndex];

  return (
    <SanctumBackground focusCategory={routine.category}>
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <HapticPressable onPress={handleQuit} hapticStyle="medium">
          <Ionicons name="close" size={28} color={AppColors.textPrimary} />
        </HapticPressable>
        <Text style={styles.routineName}>{routine.name}</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Main Content - flex centered between header and controls */}
      <View style={styles.mainContent}>
        {/* Avatar with circular progress ring */}
        <View style={styles.avatarContainer}>
          {/* Countdown text - above the ring */}
          {(() => {
            const remaining = routine.exercises.length - currentExerciseIndex;
            const companionName = profile?.[`${routine.category.toLowerCase()}_name` as keyof typeof profile] as string | null || routine.category;
            return (
              <Text style={styles.countdownText}>
                {remaining === 1 ? (
                  <>Final exercise! {companionName} is almost awake!</>
                ) : (
                  <>{remaining} exercises until {companionName} awakens!</>
                )}
              </Text>
            );
          })()}
          <View style={styles.progressRingWrapper}>
            {/* SVG progress ring */}
            <Svg width={RING_SIZE} height={RING_SIZE} style={styles.progressRingSvg}>
              {/* Background track */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={AppColors.surfaceSecondary}
                strokeWidth={RING_STROKE}
                fill="none"
              />
              {/* Progress arc - animated */}
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={getCategoryColor(routine.category)}
                strokeWidth={RING_STROKE}
                fill="none"
                strokeDasharray={`${RING_CIRCUMFERENCE}`}
                strokeDashoffset={progressAnim}
                strokeLinecap="round"
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            {/* Avatar centered inside the ring */}
            <View style={styles.avatarInner}>
              {companionImage ? (
                <Animated.View style={{ transform: [{ scale: breatheAnim }] }}>
                  <Image
                    source={companionImage}
                    style={styles.companionImage}
                    resizeMode="contain"
                  />
                </Animated.View>
              ) : (
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
                    size={80}
                    color={getAvatarGlowColor(avatarLightState, routine.category).borderColor}
                  />
                </View>
              )}
            </View>
          </View>
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
    <View style={styles.particleOverlay} pointerEvents="none">
      <ParticleField color={getCategoryColor(routine.category)} alwaysVisible />
    </View>
    </SanctumBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  particleOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.background,
  },
  loadingText: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
  slideshowContainer: {
    alignItems: 'center',
  },
  slideshowImage: {
    width: 200,
    height: 200,
  },
  slideshowPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
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
  },
  completionCompanionImage: {
    width: 200,
    height: 200,
  },
  evolutionFlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
  },
  xpRevealContainer: {
    alignItems: 'center',
    marginTop: 24,
    width: '100%',
    paddingHorizontal: 40,
  },
  xpRevealValue: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  xpBarContainer: {
    width: '100%',
    marginTop: 12,
    alignItems: 'center',
  },
  xpBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  xpBarLabel: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginTop: 6,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginTop: 24,
    marginBottom: 8,
  },
  completeMessage: {
    fontSize: 18,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  completeSubMessage: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
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
  progressRingWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingSvg: {
    position: 'absolute',
  },
  avatarInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 15,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    color: AppColors.textPrimary,
    marginBottom: 24,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  exerciseContainer: {
    paddingHorizontal: 24,
    marginTop: 32,
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
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
  },
  companionImage: {
    width: 230,
    height: 230,
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
