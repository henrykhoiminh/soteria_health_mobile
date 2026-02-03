import JourneyBadge from '@/components/JourneyBadge';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import { supabase } from '@/lib/supabase/client';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import OnboardingButton from './components/OnboardingButton';
import OnboardingProgress from './components/OnboardingProgress';
import SoteriaDialogueBox from './components/SoteriaDialogueBox';
import SoteriaPresence from './components/SoteriaPresence';

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

// Caption data for new users
const newUserCaptions = [
  { text: "{firstName}, you have already taken the first step.", pauseAfter: 800 },
  { text: "That's more than most will ever do.", pauseAfter: 600 },
  { text: "Let's build your pain-free life.", pauseAfter: 0 },
];

// Caption data for reset users
const resetUserCaptions = [
  { text: '{firstName}.', pauseAfter: 600 },
  { text: 'Ready to try again?', pauseAfter: 0 },
];

// Screen 9: The Pact (Final Screen)
export default function ThePactScreen() {
  const router = useRouter();
  const { data, isResetFlow, resetOnboarding } = useOnboarding();
  const { user, refreshProfile } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [allComplete, setAllComplete] = useState(false);
  const [showSkip, setShowSkip] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  // Replace placeholders in caption text
  const replacePlaceholders = (text: string) => {
    return text
      .replace('{firstName}', data.firstName)
      .replace('{mindName}', data.mindName)
      .replace('{bodyName}', data.bodyName)
      .replace('{soulName}', data.soulName);
  };

  const baseCaptions = isResetFlow ? resetUserCaptions : newUserCaptions;
  const captions = baseCaptions.map(c => ({
    ...c,
    text: replacePlaceholders(c.text),
  }));

  const buttonText = isResetFlow ? "Let's go" : "I'm ready";

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
        // All captions complete - show button
        const completeTimer = setTimeout(() => {
          setAllComplete(true);
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

        // Recovery areas (only for Recovery journey)
        recovery_areas: data.journeyFocus === 'Recovery' ? data.recoveryAreas : [],

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

        // Save profile picture if provided
        if (data.profilePictureUri) {
          profileUpdate.profile_picture_url = data.profilePictureUri;
        }
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

  const handleCommit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Store name before saving (context gets reset during save)
    setWelcomeName(data.firstName);
    saveOnboardingData();
  };

  const handleSkip = () => {
    if (typingRef.current) clearTimeout(typingRef.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowSkip(false);
    setAllComplete(true);
    setDisplayedText(captions[captions.length - 1].text);
  };

  // Show welcome screen while saving in background
  if (saving || saved) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.savingContent}>
          <View style={styles.presenceContainer}>
            <SoteriaPresence size="large" intensity="high" />
          </View>

          <Text style={styles.welcomeText}>Welcome, {welcomeName}.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress currentStep="the-pact" />

      {/* Journey badge at top */}
      {data.journeyFocus && (
        <View style={styles.badgeContainer}>
          <JourneyBadge focus={data.journeyFocus} size="sm" />
        </View>
      )}

      <View style={styles.content}>
        {/* Soteria's presence */}
        <View style={styles.presenceContainer}>
          <SoteriaPresence size="medium" intensity="medium" />
        </View>

        {/* Caption text - typewriter effect */}
        <View style={styles.dialogueBoxContainer}>
          <SoteriaDialogueBox
            text={displayedText}
            glowPosition="top"
            isTyping={isTyping}
          />
        </View>
      </View>

      {/* Skip button */}
      <OnboardingButton
        label="Skip"
        onPress={handleSkip}
        visible={showSkip && !allComplete}
        variant="secondary"
      />

      {/* Commitment button */}
      <OnboardingButton
        label={buttonText}
        onPress={handleCommit}
        visible={allComplete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  badgeContainer: {
    paddingTop: 16,
    paddingHorizontal: 24,
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 80,
  },
  savingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  presenceContainer: {
    marginBottom: 64,
  },
  dialogueBoxContainer: {
    width: '100%',
  },
  welcomeText: {
    fontSize: 24,
    color: AppColors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
