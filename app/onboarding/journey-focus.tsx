import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import SoteriaPresence from './components/SoteriaPresence';
import { AppColors } from '@/constants/theme';
import { JourneyFocus } from '@/types';

// Screen 3: Journey Focus Selection
export default function JourneyFocusScreen() {
  const router = useRouter();
  const { setJourneyFocus } = useOnboarding();

  const handleSelect = (focus: JourneyFocus) => {
    setJourneyFocus(focus);
    router.push({
      pathname: '/onboarding/journey-response',
      params: { focus },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Soteria's presence (smaller) */}
        <View style={styles.presenceContainer}>
          <SoteriaPresence size="small" intensity="low" />
        </View>

        {/* Question */}
        <Text style={styles.question}>What are you seeking?</Text>

        {/* Choice buttons */}
        <View style={styles.choicesContainer}>
          <TouchableOpacity
            style={styles.choiceButton}
            onPress={() => handleSelect('Injury Prevention')}
          >
            <View style={styles.choiceIconContainer}>
              <Ionicons name="shield-checkmark" size={32} color="#3B82F6" />
            </View>
            <View style={styles.choiceTextContainer}>
              <Text style={styles.choiceTitle}>Injury Prevention</Text>
              <Text style={styles.choiceDescription}>
                Build strength before you need it
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.choiceButton}
            onPress={() => handleSelect('Recovery')}
          >
            <View style={styles.choiceIconContainer}>
              <Ionicons name="heart" size={32} color="#EF4444" />
            </View>
            <View style={styles.choiceTextContainer}>
              <Text style={styles.choiceTitle}>Recovery</Text>
              <Text style={styles.choiceDescription}>
                Rebuild and heal the right way
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  presenceContainer: {
    marginBottom: 64,
  },
  question: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40,
  },
  choicesContainer: {
    width: '100%',
    gap: 16,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  choiceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  choiceTextContainer: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  choiceDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
