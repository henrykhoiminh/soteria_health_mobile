import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, Text, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import SoteriaPresence from './components/SoteriaPresence';
import JourneyBadge from '@/components/JourneyBadge';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { AppColors } from '@/constants/theme';

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

// Caption data for new users
const newUserCaptions = [
  { text: 'Then it begins.', pauseAfter: 1200 },
  { text: 'Your world awaits.', pauseAfter: 1200 },
  { text: '{mindName}, {bodyName}, and {soulName} are ready.', pauseAfter: 1200 },
  { text: 'So am I.', pauseAfter: 1200 },
  { text: "Let's build something beautiful together.", pauseAfter: 0 },
];

// Caption data for reset users
const resetUserCaptions = [
  { text: 'Then we begin again.', pauseAfter: 1200 },
  { text: 'Same world. Fresh start.', pauseAfter: 1200 },
  { text: '{mindName}, {bodyName}, and {soulName} remember you.', pauseAfter: 1200 },
  { text: "And I'm still here.", pauseAfter: 1200 },
  { text: "Let's go.", pauseAfter: 0 },
];

// Screen 14: The Beginning (Final Screen)
export default function TheBeginningScreen() {
  const router = useRouter();
  const { data, isResetFlow, resetOnboarding } = useOnboarding();
  const { user, refreshProfile } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [textComplete, setTextComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  // Replace placeholders in caption text
  const replacePlaceholders = (text: string) => {
    return text
      .replace('{mindName}', data.mindName)
      .replace('{bodyName}', data.bodyName)
      .replace('{soulName}', data.soulName);
  };

  const baseCaptions = isResetFlow ? resetUserCaptions : newUserCaptions;
  const captions = baseCaptions.map(c => ({
    ...c,
    text: replacePlaceholders(c.text),
  }));

  // Typewriter effect
  const startTyping = useCallback((text: string, onComplete: () => void) => {
    setDisplayedText('');
    setIsTyping(true);
    charIndexRef.current = 0;

    const typeNextChar = () => {
      if (charIndexRef.current < text.length) {
        const nextChar = text[charIndexRef.current];
        setDisplayedText(text.substring(0, charIndexRef.current + 1));

        // Haptic feedback for visible characters at specified frequency
        if (nextChar !== ' ' && nextChar !== '\n' && charIndexRef.current % HAPTIC_FREQUENCY === 0) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        charIndexRef.current++;
        typingRef.current = setTimeout(typeNextChar, TYPING_SPEED);
      } else {
        setIsTyping(false);
        onComplete();
      }
    };

    typeNextChar();
  }, []);

  // Clear typing on unmount
  useEffect(() => {
    return () => {
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const currentCaption = captions[currentIndex];

    startTyping(currentCaption.text, () => {
      // After typing completes
      if (currentIndex < captions.length - 1) {
        // Wait then move to next caption
        const nextTimer = setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, currentCaption.pauseAfter);

        typingRef.current = nextTimer;
      } else {
        // All captions complete
        const completeTimer = setTimeout(() => {
          setTextComplete(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 1000);

        typingRef.current = completeTimer;
      }
    });

    return () => {
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
    };
  }, [currentIndex, startTyping]);

  // Save all onboarding data when text completes
  useEffect(() => {
    if (textComplete && !saving && !saved && user) {
      saveOnboardingData();
    }
  }, [textComplete, user]);

  const saveOnboardingData = async () => {
    if (!user) {
      Alert.alert('Error', 'User not found. Please try again.');
      return;
    }

    setSaving(true);

    try {
      // Build the profile update
      const profileUpdate: Record<string, unknown> = {
        // Journey focus
        journey_focus: data.journeyFocus,
        journey_started_at: new Date().toISOString(),

        // Avatar names
        mind_name: data.mindName.trim(),
        body_name: data.bodyName.trim(),
        soul_name: data.soulName.trim(),

        // Onboarding complete
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      };

      // Only set first/last name and username for new users (not reset flow)
      if (!isResetFlow) {
        profileUpdate.first_name = data.firstName.trim();
        profileUpdate.last_name = data.lastName.trim();
        profileUpdate.username = data.username.trim().toLowerCase();
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      // Refresh the auth context with new profile data
      await refreshProfile();

      // Reset the onboarding context
      resetOnboarding();

      setSaved(true);

      // Navigate to main app after a brief moment
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1500);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      Alert.alert(
        'Error',
        'Failed to save your data. Please try again.',
        [
          {
            text: 'Retry',
            onPress: () => {
              setSaving(false);
              saveOnboardingData();
            },
          },
        ]
      );
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Journey badge at top */}
      {data.journeyFocus && (
        <View style={styles.badgeContainer}>
          <JourneyBadge focus={data.journeyFocus} size="sm" />
        </View>
      )}

      <View style={styles.content}>
        {/* Soteria's presence - larger and more intense for the finale */}
        <View style={styles.presenceContainer}>
          <SoteriaPresence size="large" intensity="high" />
        </View>

        {/* Caption text - typewriter effect */}
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>
            {displayedText}
            {isTyping && <Text style={styles.cursor}>|</Text>}
          </Text>
        </View>

        {/* Saving indicator */}
        {textComplete && (
          <View style={styles.statusContainer}>
            {saving && (
              <View style={styles.savingRow}>
                <ActivityIndicator size="small" color={AppColors.primary} />
                <Text style={styles.savingText}>Preparing your world...</Text>
              </View>
            )}
            {saved && (
              <Text style={styles.savedText}>Welcome, {data.firstName}.</Text>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  badgeContainer: {
    paddingTop: 16,
    paddingHorizontal: 24,
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  presenceContainer: {
    marginBottom: 48,
  },
  captionContainer: {
    width: '100%',
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionText: {
    fontSize: 20,
    lineHeight: 30,
    color: AppColors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  cursor: {
    color: AppColors.primary,
    fontWeight: '300',
  },
  statusContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  savedText: {
    fontSize: 18,
    color: AppColors.primary,
    fontWeight: '600',
  },
});
