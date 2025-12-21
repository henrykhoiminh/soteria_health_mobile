import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import SoteriaPresence from './components/SoteriaPresence';
import JourneyBadge from '@/components/JourneyBadge';
import OnboardingButton from './components/OnboardingButton';
import OnboardingProgress from './components/OnboardingProgress';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import { AppColors } from '@/constants/theme';

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

// Caption data for new users
const newUserCaptions = [
  { text: "Alright, {firstName}. Here's the deal.", pauseAfter: 1200 },
  { text: "I've built this world.", pauseAfter: 1000 },
  { text: 'Curated the routines.', pauseAfter: 1000 },
  { text: 'Gathered the travelers.', pauseAfter: 1200 },
  { text: "But I can't do your work for you.", pauseAfter: 1200 },
  { text: 'A few minutes a day.', pauseAfter: 1000 },
  { text: 'Show up for {mindName}, {bodyName}, and {soulName}.', pauseAfter: 1200 },
  { text: "Explore what I've built. Join a Circle. Share what works.", pauseAfter: 1200 },
  { text: "Do that, and you'll build a pain-free life.", pauseAfter: 1000 },
  { text: 'Not overnight. Not perfectly.', pauseAfter: 1000 },
  { text: 'But steadily.', pauseAfter: 1200 },
  { text: 'Can you commit to that?', pauseAfter: 0 },
];

// Caption data for reset users
const resetUserCaptions = [
  { text: '{firstName}.', pauseAfter: 1000 },
  { text: "Starting over isn't failure.", pauseAfter: 1200 },
  { text: "It's a choice.", pauseAfter: 1000 },
  { text: 'The same deal as before:', pauseAfter: 1000 },
  { text: 'I guide. You show up.', pauseAfter: 1000 },
  { text: 'A few minutes a day.', pauseAfter: 1000 },
  { text: 'Small rituals. Consistent care.', pauseAfter: 1200 },
  { text: "You've done this before.", pauseAfter: 1000 },
  { text: "You know what's possible.", pauseAfter: 1200 },
  { text: 'Ready to do it again?', pauseAfter: 0 },
];

// Screen 13: The Pact
export default function ThePactScreen() {
  const router = useRouter();
  const { data, isResetFlow } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [allComplete, setAllComplete] = useState(false);
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

  const buttonText = isResetFlow ? "Let's go" : "I'm in";

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

  const handleCommit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/the-beginning');
  };

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
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>
            {displayedText}
            {isTyping && <Text style={styles.cursor}>|</Text>}
          </Text>
        </View>
      </View>

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
});
