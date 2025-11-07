import { useAuth } from '@/lib/contexts/AuthContext';
import { AppColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';
import { updateUserProfile } from '@/lib/utils/auth';
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

const JOURNEY_GOALS: JourneyFocus[] = ['Injury Prevention', 'Recovery'];

const FITNESS_LEVELS: FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

const GOALS = [
  'Improve flexibility',
  'Build strength',
  'Reduce stress',
  'Better sleep',
  'Increase energy',
  'Mental clarity',
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [journeyFocus, setJourneyFocus] = useState<JourneyFocus | null>(null);
  const [recoveryAreas, setRecoveryAreas] = useState<string[]>([]);
  const [bodyRegionFilter, setBodyRegionFilter] = useState<BodyRegion>('All');
  const [recoveryGoals, setRecoveryGoals] = useState<string[]>([]);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
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

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal)
        ? prev.filter((g) => g !== goal)
        : [...prev, goal]
    );
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
    // If Recovery was selected, show recovery area selection
    if (step === 1 && journeyFocus === 'Recovery') {
      setStep(2); // Go to recovery areas
      return;
    }
    // If Injury Prevention, skip recovery steps
    if (step === 1 && journeyFocus === 'Injury Prevention') {
      setStep(4); // Skip to fitness level
      return;
    }
    // Step 2: Recovery areas (optional)
    if (step === 2) {
      setStep(3); // Go to recovery goals
      return;
    }
    // Step 3: Recovery goals (optional)
    if (step === 3) {
      setStep(4); // Go to fitness level
      return;
    }
    // Step 4: Fitness level (required)
    if (step === 4 && !fitnessLevel) {
      Alert.alert('Error', 'Please select your fitness level');
      return;
    }
    setStep(step + 1);
  };

  const handlePreviousStep = () => {
    // Handle back navigation considering the conditional recovery steps
    if (step === 4 && journeyFocus === 'Injury Prevention') {
      setStep(1); // Go back to journey selection
    } else if (step === 4 && journeyFocus === 'Recovery') {
      setStep(3); // Go back to recovery goals
    } else if (step === 3) {
      setStep(2); // Go back to recovery areas
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

    if (selectedGoals.length === 0) {
      Alert.alert('Error', 'Please select at least one goal');
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
        goals: selectedGoals,
        journey_started_at: new Date().toISOString(), // Set journey start date
      };

      // Add recovery-specific fields if journey is Recovery
      if (journeyFocus === 'Recovery') {
        profileUpdates.recovery_areas = recoveryAreas;
        profileUpdates.recovery_goals = recoveryGoals;
      }

      await updateUserProfile(currentUser.id, profileUpdates);
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
    return journeyFocus === 'Recovery' ? 5 : 3;
  };

  // Get current step display
  const getCurrentStepDisplay = () => {
    if (step === 1) return 1;
    if (step === 2) return 2; // Recovery areas
    if (step === 3) return 3; // Recovery goals
    if (step === 4) return journeyFocus === 'Recovery' ? 4 : 2; // Fitness
    if (step === 5) return journeyFocus === 'Recovery' ? 5 : 3; // Goals
    return step;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      {step === 2 && journeyFocus === 'Recovery' && (
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

      {step === 3 && journeyFocus === 'Recovery' && (
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

      {step === 4 && (
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

      {step === 5 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What are your goals?</Text>
          <Text style={styles.sectionSubtitle}>Select all that apply</Text>
          <View style={styles.optionsGrid}>
            {GOALS.map((goal) => (
              <TouchableOpacity
                key={goal}
                style={[
                  styles.option,
                  selectedGoals.includes(goal) && styles.optionSelected,
                ]}
                onPress={() => toggleGoal(goal)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedGoals.includes(goal) && styles.optionTextSelected,
                  ]}
                >
                  {goal}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

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

        {step < getTotalSteps() ? (
          <TouchableOpacity
            style={[styles.button, step > 1 && styles.buttonFlex]}
            onPress={handleNextStep}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        ) : (
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
    </ScrollView>
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
  content: {
    padding: 24,
    paddingTop: 80,
    paddingBottom: 80,
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
    marginTop: 24,
  },
  button: {
    backgroundColor: AppColors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flex: 1,
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
});
