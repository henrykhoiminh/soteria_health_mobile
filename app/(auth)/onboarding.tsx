import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { updateUserProfile } from '@/lib/utils/auth';
import { FitnessLevel, JourneyFocus } from '@/types';
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

  const handleNextStep = () => {
    if (step === 1 && !journeyFocus) {
      Alert.alert('Error', 'Please select your journey focus');
      return;
    }
    if (step === 2 && !fitnessLevel) {
      Alert.alert('Error', 'Please select your fitness level');
      return;
    }
    setStep(step + 1);
  };

  const handlePreviousStep = () => {
    setStep(step - 1);
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

      await updateUserProfile(currentUser.id, {
        full_name: fullName,
        journey_focus: journeyFocus,
        fitness_level: fitnessLevel,
        goals: selectedGoals,
      });
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>
        Step {step} of 3
      </Text>

      {step === 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's your focus?</Text>
          <Text style={styles.sectionSubtitle}>
            Choose your primary wellness goal
          </Text>
          <View style={styles.largeOptionsContainer}>
            {JOURNEY_GOALS.map((focus) => (
              <TouchableOpacity
                key={focus}
                style={[
                  styles.largeOption,
                  journeyFocus === focus && styles.optionSelected,
                ]}
                onPress={() => setJourneyFocus(focus)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.largeOptionText,
                    journeyFocus === focus && styles.optionTextSelected,
                  ]}
                >
                  {focus}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    journeyFocus === focus && styles.optionDescriptionSelected,
                  ]}
                >
                  {focus === 'Injury Prevention'
                    ? 'Build strength and mobility to prevent injuries'
                    : 'Recover and rehabilitate from existing injuries'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {step === 2 && (
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

      {step === 3 && (
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

        {step < 3 ? (
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#1a1a1a',
    marginTop: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
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
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  largeOption: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 24,
    backgroundColor: '#fff',
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  largeOptionText: {
    fontSize: 20,
    color: '#1a1a1a',
    fontWeight: '600',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  optionDescriptionSelected: {
    color: '#fff',
  },
  optionTextSelected: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flex: 1,
  },
  buttonFlex: {
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
});
