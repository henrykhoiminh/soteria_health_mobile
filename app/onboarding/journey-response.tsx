import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import SoteriaPresence from './components/SoteriaPresence';
import JourneyBadge from '@/components/JourneyBadge';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import { AppColors } from '@/constants/theme';
import { JourneyFocus } from '@/types';

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

// Caption data with text and pause duration after typing completes
const preventionCaptions = [
  { text: 'Prevention.', pauseAfter: 800 },
  { text: "You're not waiting to break.", pauseAfter: 1200 },
  { text: "You're building strength before you need it.", pauseAfter: 1500 },
  { text: 'Smart.', pauseAfter: 1000 },
  { text: 'I built this place for people like you.', pauseAfter: 1200 },
  { text: 'Welcome.', pauseAfter: 0 },
];

const recoveryCaptions = [
  { text: 'Recovery.', pauseAfter: 800 },
  { text: 'Something happened.', pauseAfter: 1200 },
  { text: "And instead of giving up,", pauseAfter: 1000 },
  { text: "you're here looking for a way forward.", pauseAfter: 1500 },
  { text: 'That takes strength.', pauseAfter: 1200 },
  { text: 'I built this place for people like you.', pauseAfter: 1200 },
  { text: 'Welcome.', pauseAfter: 0 },
];


// Screen 3a/3b: Journey Response (Prevention or Recovery)
export default function JourneyResponseScreen() {
  const router = useRouter();
  const { focus } = useLocalSearchParams<{ focus: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [allComplete, setAllComplete] = useState(false);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  // Select the appropriate captions based on focus
  const captions = focus === 'Recovery' ? recoveryCaptions : preventionCaptions;

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
        // All captions complete - show continue button
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
  }, [currentIndex, captions, startTyping]);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/world-intro');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Journey badge at top */}
      <View style={styles.badgeContainer}>
        <JourneyBadge focus={focus as JourneyFocus} size="sm" />
      </View>

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

      {/* Continue button - always rendered to preserve layout */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.tapArea, { opacity: allComplete ? 1 : 0 }]}
          onPress={handleContinue}
          disabled={!allComplete}
        >
          <Text style={styles.tapHint}>Tap to continue</Text>
        </TouchableOpacity>
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
    marginBottom: 64,
  },
  captionContainer: {
    width: '100%',
    minHeight: 60,
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
