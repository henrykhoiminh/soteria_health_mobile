import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import { updateUserProfile } from '@/lib/utils/auth';
import { FitnessLevel } from '@/types';

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
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, refreshProfile } = useAuth();
  const router = useRouter();

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal)
        ? prev.filter((g) => g !== goal)
        : [...prev, goal]
    );
  };

  const handleComplete = async () => {
    if (!fitnessLevel) {
      Alert.alert('Error', 'Please select your fitness level');
      return;
    }

    if (selectedGoals.length === 0) {
      Alert.alert('Error', 'Please select at least one goal');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile(user.id, {
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
        Help us personalize your wellness journey
      </Text>

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

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleComplete}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Saving...' : 'Complete Setup'}
        </Text>
      </TouchableOpacity>
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
    paddingBottom: 40,
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
  option: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 16,
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
  optionTextSelected: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
