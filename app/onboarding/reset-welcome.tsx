import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import SoteriaPresence from './components/SoteriaPresence';
import NarrativeText from './components/NarrativeText';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AppColors } from '@/constants/theme';

// Reset Flow Screen 1: Welcome Back
export default function ResetWelcomeScreen() {
  const router = useRouter();
  const { setIsResetFlow, updateData } = useOnboarding();
  const { profile } = useAuth();
  const [textComplete, setTextComplete] = useState(false);

  // Set up reset flow context on mount
  useEffect(() => {
    setIsResetFlow(true);

    // Pre-populate with existing data if available
    if (profile) {
      updateData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        username: profile.username || '',
        // Keep avatar names for reference but user will rename them
        mindName: profile.mind_name || '',
        bodyName: profile.body_name || '',
        soulName: profile.soul_name || '',
      });
    }
  }, [profile]);

  const firstName = profile?.first_name || 'Friend';

  const narrativeLines = [
    `${firstName}.`,
    "You're back.",
    "I see you've chosen to start again.",
    "That takes courage.",
    "Your avatars are still here.",
    "Waiting.",
    "Let's reconnect with them.",
  ];

  const handleContinue = () => {
    router.push('/onboarding/journey-focus');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Soteria's presence */}
        <View style={styles.presenceContainer}>
          <SoteriaPresence size="medium" intensity="medium" />
        </View>

        {/* Narrative text */}
        <View style={styles.textContainer}>
          <NarrativeText
            lines={narrativeLines}
            speed="medium"
            autoAdvance={true}
            onComplete={() => setTextComplete(true)}
          />
        </View>
      </View>

      {/* Continue button */}
      {textComplete && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.tapArea} onPress={handleContinue}>
            <Text style={styles.tapHint}>Tap to continue</Text>
          </TouchableOpacity>
        </View>
      )}
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
  textContainer: {
    width: '100%',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  tapArea: {
    alignItems: 'center',
    padding: 16,
  },
  tapHint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
  },
});
