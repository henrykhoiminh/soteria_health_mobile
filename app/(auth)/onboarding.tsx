import { useAuth } from '@/lib/contexts/AuthContext';
import { AppColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';
import { updateUserProfile } from '@/lib/utils/auth';
import { submitPainCheckIn, getPainLevelInfo } from '@/lib/utils/pain-checkin';
import {
  FitnessLevel,
  JourneyFocus,
  UPPER_BODY_AREAS,
  LOWER_BODY_AREAS,
  RECOVERY_GOALS,
  BodyRegion,
} from '@/types';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

const JOURNEY_GOALS: JourneyFocus[] = ['Injury Prevention', 'Recovery'];

const FITNESS_LEVELS: FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [journeyFocus, setJourneyFocus] = useState<JourneyFocus | null>(null);
  const [recoveryAreas, setRecoveryAreas] = useState<string[]>([]);
  const [bodyRegionFilter, setBodyRegionFilter] = useState<BodyRegion>('All');
  const [recoveryGoals, setRecoveryGoals] = useState<string[]>([]);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | null>(null);
  const [painLevel, setPainLevel] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const { refreshProfile } = useAuth();
  const router = useRouter();

  // Check if user's email is confirmed on mount
  useEffect(() => {
    checkEmailVerification();
  }, []);

  const checkEmailVerification = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        Alert.alert('Error', 'Please sign in to continue');
        router.replace('/(auth)/login');
        return;
      }

      // Check if email is confirmed
      if (!user.email_confirmed_at) {
        Alert.alert(
          'Email Not Verified',
          'Please verify your email before completing your profile. Check your inbox for the confirmation link.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error checking email verification:', error);
    }
  };


  const toggleRecoveryArea = (area: string) => {
    setRecoveryAreas((prev) =>
      prev.includes(area)
        ? prev.filter((a) => a !== area)
        : [...prev, area]
    );
  };

  const toggleRecoveryGoal = (goal: string) => {
    setRecoveryGoals((prev) =>
      prev.includes(goal)
        ? prev.filter((g) => g !== goal)
        : [...prev, goal]
    );
  };

  // Get filtered recovery areas based on body region
  const getFilteredRecoveryAreas = () => {
    if (bodyRegionFilter === 'Upper Body') {
      return UPPER_BODY_AREAS;
    } else if (bodyRegionFilter === 'Lower Body') {
      return LOWER_BODY_AREAS;
    }
    return [...UPPER_BODY_AREAS, ...LOWER_BODY_AREAS];
  };

  const handleNextStep = () => {
    if (step === 1 && !journeyFocus) {
      Alert.alert('Error', 'Please select your journey focus');
      return;
    }
    // If Recovery was selected, show pain check-in first
    if (step === 1 && journeyFocus === 'Recovery') {
      setStep(2); // Go to pain check-in
      return;
    }
    // If Injury Prevention, skip to fitness level
    if (step === 1 && journeyFocus === 'Injury Prevention') {
      setStep(5); // Skip to fitness level
      return;
    }
    // Step 2: Pain check-in (Recovery only)
    if (step === 2) {
      setStep(3); // Go to recovery areas
      return;
    }
    // Step 3: Recovery areas (optional)
    if (step === 3) {
      setStep(4); // Go to recovery goals
      return;
    }
    // Step 4: Recovery goals (optional)
    if (step === 4) {
      setStep(5); // Go to fitness level
      return;
    }
    // Step 5: Fitness level (required)
    if (step === 5 && !fitnessLevel) {
      Alert.alert('Error', 'Please select your fitness level');
      return;
    }
    // Otherwise proceed (shouldn't reach here normally)
    setStep(step + 1);
  };

  const handlePreviousStep = () => {
    // Handle back navigation considering the conditional recovery steps
    if (step === 5 && journeyFocus === 'Injury Prevention') {
      setStep(1); // Go back to journey selection
    } else if (step === 5 && journeyFocus === 'Recovery') {
      setStep(4); // Go back to recovery goals
    } else if (step === 4) {
      setStep(3); // Go back to recovery areas
    } else if (step === 3) {
      setStep(2); // Go back to pain check-in
    } else if (step === 2) {
      setStep(1); // Go back to journey selection
    } else {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (!journeyFocus) {
      Alert.alert('Error', 'Please select your journey focus');
      return;
    }

    if (!fitnessLevel) {
      Alert.alert('Error', 'Please select your fitness level');
      return;
    }

    setLoading(true);
    try {
      // Get the current user directly from Supabase in case AuthContext hasn't updated yet
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        Alert.alert('Error', 'Please sign in to continue');
        router.replace('/(auth)/login');
        return;
      }

      // Get full name from user metadata
      const fullName = currentUser.user_metadata?.full_name || '';

      const profileUpdates: any = {
        full_name: fullName,
        journey_focus: journeyFocus,
        fitness_level: fitnessLevel,
        journey_started_at: new Date().toISOString(), // Set journey start date
      };

      // Add recovery-specific fields if journey is Recovery
      if (journeyFocus === 'Recovery') {
        profileUpdates.recovery_areas = recoveryAreas;
        profileUpdates.recovery_goals = recoveryGoals;
      }

      await updateUserProfile(currentUser.id, profileUpdates);

      // Submit initial pain check-in for Recovery users
      // Pain locations are not collected during onboarding (Step 3 Recovery Areas serves this purpose)
      if (journeyFocus === 'Recovery') {
        await submitPainCheckIn(currentUser.id, painLevel, [], null);
      }

      await refreshProfile();
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total steps dynamically
  const getTotalSteps = () => {
    return journeyFocus === 'Recovery' ? 5 : 2;
  };

  // Get current step display
  const getCurrentStepDisplay = () => {
    if (step === 1) return 1; // Journey focus
    if (step === 2) return 2; // Pain check-in (Recovery only)
    if (step === 3) return 3; // Recovery areas (Recovery only)
    if (step === 4) return 4; // Recovery goals (Recovery only)
    if (step === 5) return journeyFocus === 'Recovery' ? 5 : 2; // Fitness
    return step;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>
          Step {getCurrentStepDisplay()} of {getTotalSteps()}
        </Text>

      {step === 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's your focus?</Text>
          <Text style={styles.sectionSubtitle}>
            Choose your primary wellness goal
          </Text>
          <View style={styles.largeOptionsContainer}>
            {/* Injury Prevention Card */}
            <TouchableOpacity
              style={[
                styles.largeOption,
                styles.detailedCard,
                journeyFocus === 'Injury Prevention' && styles.optionSelectedBlue,
              ]}
              onPress={() => setJourneyFocus('Injury Prevention')}
              disabled={loading}
            >
              <View style={styles.cardHeader}>
                <Ionicons
                  name="shield-checkmark"
                  size={32}
                  color={journeyFocus === 'Injury Prevention' ? AppColors.textPrimary : AppColors.mind}
                />
                <Text
                  style={[
                    styles.largeOptionText,
                    journeyFocus === 'Injury Prevention' && styles.optionTextSelected,
                  ]}
                >
                  Injury Prevention
                </Text>
              </View>
              <Text
                style={[
                  styles.cardSubtitle,
                  journeyFocus === 'Injury Prevention' && styles.optionDescriptionSelected,
                ]}
              >
                I'm healthy and want to prevent injuries
              </Text>
              <View style={styles.bulletPoints}>
                <BulletPoint
                  text="Injury prevention routines"
                  selected={journeyFocus === 'Injury Prevention'}
                />
                <BulletPoint
                  text="Mobility and strength building"
                  selected={journeyFocus === 'Injury Prevention'}
                />
                <BulletPoint
                  text="Long-term wellness habits"
                  selected={journeyFocus === 'Injury Prevention'}
                />
              </View>
            </TouchableOpacity>

            {/* Recovery Card */}
            <TouchableOpacity
              style={[
                styles.largeOption,
                styles.detailedCard,
                journeyFocus === 'Recovery' && styles.optionSelectedRed,
              ]}
              onPress={() => setJourneyFocus('Recovery')}
              disabled={loading}
            >
              <View style={styles.cardHeader}>
                <Ionicons
                  name="heart"
                  size={32}
                  color={journeyFocus === 'Recovery' ? AppColors.textPrimary : AppColors.body}
                />
                <Text
                  style={[
                    styles.largeOptionText,
                    journeyFocus === 'Recovery' && styles.optionTextSelected,
                  ]}
                >
                  Recovery
                </Text>
              </View>
              <Text
                style={[
                  styles.cardSubtitle,
                  journeyFocus === 'Recovery' && styles.optionDescriptionSelected,
                ]}
              >
                I'm recovering from an injury or managing pain
              </Text>
              <View style={styles.bulletPoints}>
                <BulletPoint
                  text="Targeted recovery routines"
                  selected={journeyFocus === 'Recovery'}
                />
                <BulletPoint
                  text="Pain management exercises"
                  selected={journeyFocus === 'Recovery'}
                />
                <BulletPoint
                  text="Progress tracking for healing"
                  selected={journeyFocus === 'Recovery'}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 2: Initial Pain Check-In (Recovery Only) */}
      {step === 2 && journeyFocus === 'Recovery' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How are you feeling today?</Text>
          <Text style={styles.sectionSubtitle}>
            Rate your current pain level to establish a baseline
          </Text>

          {/* Pain Level Display */}
          <View style={styles.painLevelDisplay}>
            <Text
              style={[
                styles.painLevelNumber,
                { color: getPainLevelInfo(painLevel).color },
              ]}
            >
              {painLevel}
            </Text>
            <Text
              style={[
                styles.painLevelLabel,
                { color: getPainLevelInfo(painLevel).color },
              ]}
            >
              {getPainLevelInfo(painLevel).label}
            </Text>
          </View>

          {/* Slider */}
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={10}
              step={1}
              value={painLevel}
              onValueChange={setPainLevel}
              minimumTrackTintColor={getPainLevelInfo(painLevel).color}
              maximumTrackTintColor={AppColors.border}
              thumbTintColor={getPainLevelInfo(painLevel).color}
            />
            <View style={styles.sliderLabels}>
              <View style={styles.sliderLabel}>
                <Text style={styles.sliderLabelNumber}>0</Text>
                <Text style={styles.sliderLabelText}>Pain Free</Text>
              </View>
              <View style={styles.sliderLabel}>
                <Text style={styles.sliderLabelNumber}>10</Text>
                <Text style={styles.sliderLabelText}>Severe</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Step 3: Recovery Areas (Recovery Only) */}
      {step === 3 && journeyFocus === 'Recovery' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recovery Areas</Text>
          <Text style={styles.sectionSubtitle}>
            Select the body parts you're recovering from (optional)
          </Text>

          {/* Body Region Filters */}
          <View style={styles.filterContainer}>
            {(['All', 'Upper Body', 'Lower Body'] as BodyRegion[]).map((region) => (
              <TouchableOpacity
                key={region}
                style={[
                  styles.filterButton,
                  bodyRegionFilter === region && styles.filterButtonActive,
                ]}
                onPress={() => setBodyRegionFilter(region)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    bodyRegionFilter === region && styles.filterButtonTextActive,
                  ]}
                >
                  {region}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recovery Area Selection */}
          <View style={styles.optionsGrid}>
            {getFilteredRecoveryAreas().map((area) => (
              <TouchableOpacity
                key={area}
                style={[
                  styles.option,
                  recoveryAreas.includes(area) && styles.optionSelected,
                ]}
                onPress={() => toggleRecoveryArea(area)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.optionText,
                    recoveryAreas.includes(area) && styles.optionTextSelected,
                  ]}
                >
                  {area}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {recoveryAreas.length > 0 && (
            <Text style={styles.selectionCount}>
              {recoveryAreas.length} area{recoveryAreas.length !== 1 ? 's' : ''} selected
            </Text>
          )}
        </View>
      )}

      {/* Step 4: Recovery Goals (Recovery Only) */}
      {step === 4 && journeyFocus === 'Recovery' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recovery Goals</Text>
          <Text style={styles.sectionSubtitle}>
            What are you hoping to achieve? (optional)
          </Text>

          <View style={styles.optionsGrid}>
            {RECOVERY_GOALS.map((goal) => (
              <TouchableOpacity
                key={goal}
                style={[
                  styles.option,
                  styles.goalOption,
                  recoveryGoals.includes(goal) && styles.optionSelected,
                ]}
                onPress={() => toggleRecoveryGoal(goal)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.optionText,
                    recoveryGoals.includes(goal) && styles.optionTextSelected,
                  ]}
                >
                  {goal}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {recoveryGoals.length > 0 && (
            <Text style={styles.selectionCount}>
              {recoveryGoals.length} goal{recoveryGoals.length !== 1 ? 's' : ''} selected
            </Text>
          )}
        </View>
      )}

      {/* Step 5: Fitness Level (Both journeys) */}
      {step === 5 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's your fitness level?</Text>
          <View style={styles.optionsGrid}>
            {FITNESS_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.option,
                  fitnessLevel === level && styles.optionSelected,
                ]}
                onPress={() => setFitnessLevel(level)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.optionText,
                    fitnessLevel === level && styles.optionTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      </ScrollView>

      {/* Fixed Button Container at Bottom */}
      <View style={styles.buttonContainer}>
        {step > 1 && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handlePreviousStep}
            disabled={loading}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Back
            </Text>
          </TouchableOpacity>
        )}

        {/* Show Next button for steps before final step */}
        {step < 5 ? (
          <TouchableOpacity
            style={[styles.button, step > 1 && styles.buttonFlex]}
            onPress={handleNextStep}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          /* Show Complete button on final step (step 5) */
          <TouchableOpacity
            style={[styles.button, styles.buttonFlex, loading && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Saving...' : 'Complete Setup'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Helper component for bullet points
function BulletPoint({ text, selected }: { text: string; selected: boolean }) {
  return (
    <View style={styles.bulletPoint}>
      <Text style={[styles.bulletDot, selected && styles.bulletDotSelected]}>•</Text>
      <Text style={[styles.bulletText, selected && styles.bulletTextSelected]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 80,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: AppColors.textPrimary,
    marginTop: 40,
  },
  subtitle: {
    fontSize: 16,
    color: AppColors.textSecondary,
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: AppColors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  largeOptionsContainer: {
    gap: 16,
  },
  option: {
    borderWidth: 2,
    borderColor: AppColors.border,
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: AppColors.surface,
  },
  largeOption: {
    borderWidth: 2,
    borderColor: AppColors.border,
    borderRadius: 12,
    padding: 24,
    backgroundColor: AppColors.surface,
  },
  optionSelected: {
    borderColor: AppColors.primary,
    backgroundColor: AppColors.primary,
  },
  optionSelectedBlue: {
    borderColor: AppColors.mind,
    backgroundColor: AppColors.mind,
  },
  optionSelectedRed: {
    borderColor: AppColors.body,
    backgroundColor: AppColors.body,
  },
  detailedCard: {
    paddingVertical: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  bulletPoints: {
    gap: 8,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    fontSize: 16,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  bulletDotSelected: {
    color: AppColors.textPrimary,
  },
  bulletText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  bulletTextSelected: {
    color: AppColors.textPrimary,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: AppColors.border,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
  },
  filterButtonActive: {
    borderColor: AppColors.primary,
    backgroundColor: AppColors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  filterButtonTextActive: {
    color: AppColors.textPrimary,
  },
  goalOption: {
    minWidth: '100%', // Make recovery goals full width for better readability
  },
  selectionCount: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  optionText: {
    fontSize: 14,
    color: AppColors.textPrimary,
    fontWeight: '500',
  },
  largeOptionText: {
    fontSize: 20,
    color: AppColors.textPrimary,
    fontWeight: '600',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  optionDescriptionSelected: {
    color: AppColors.textPrimary,
  },
  optionTextSelected: {
    color: AppColors.textPrimary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: AppColors.background,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  button: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 56,
  },
  buttonFlex: {
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: AppColors.surface,
    borderWidth: 2,
    borderColor: AppColors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: AppColors.primary,
  },
  // Pain Check-In Styles
  painLevelDisplay: {
    alignItems: 'center',
    marginVertical: 24,
  },
  painLevelNumber: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  painLevelLabel: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
  },
  sliderContainer: {
    marginBottom: 24,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    alignItems: 'center',
  },
  sliderLabelNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  sliderLabelText: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  painLocationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  painLocationChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  painLocationChipSelected: {
    backgroundColor: AppColors.lightGold,
    borderColor: AppColors.primary,
  },
  painLocationText: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
  painLocationTextSelected: {
    color: AppColors.primary,
    fontWeight: '600',
  },
});
