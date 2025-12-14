import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import SoteriaPresence from './components/SoteriaPresence';
import JourneyBadge from '@/components/JourneyBadge';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import { AppColors } from '@/constants/theme';

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

// Caption data with text and pause duration after typing completes
// The community lines (index 5-7) will stay on screen together
const captions = [
  { text: 'Let me tell you about this place.', pauseAfter: 1000 },
  { text: 'I built it as a sanctuary.', pauseAfter: 1200 },
  { text: 'A world where travelers come to care for themselves —', pauseAfter: 1000 },
  { text: 'their minds, their bodies, their souls.', pauseAfter: 1500 },
  { text: "You're not alone here.", pauseAfter: 1200 },
  // These three will accumulate and stay together
  { text: 'Other travelers walk these paths.', pauseAfter: 1000, accumulate: true },
  { text: 'They share routines. Form Circles.', pauseAfter: 1000, accumulate: true },
  { text: 'Support each other.', pauseAfter: 1500, accumulate: true },
  // Back to replacing
  { text: 'I curate the practices.', pauseAfter: 1000 },
  { text: 'Guide the journeys.', pauseAfter: 1200 },
  { text: "But the community? That's everyone.", pauseAfter: 1500 },
  { text: 'Including, now, you.', pauseAfter: 0 },
];

// Screen 4: The World Introduction
export default function WorldIntroScreen() {
  const router = useRouter();
  const { data } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [accumulatedText, setAccumulatedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [allComplete, setAllComplete] = useState(false);
  const continueOpacity = useRef(new Animated.Value(0)).current;
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

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
          // If this caption should accumulate, add it before moving to next
          if (currentCaption.accumulate) {
            setAccumulatedText(prev => {
              if (prev) {
                return prev + '\n' + currentCaption.text;
              }
              return currentCaption.text;
            });
          } else if (!captions[currentIndex + 1]?.accumulate) {
            // Clear accumulated text when next caption doesn't accumulate
            setAccumulatedText('');
          }

          setCurrentIndex(prev => prev + 1);
        }, currentCaption.pauseAfter);

        typingRef.current = nextTimer;
      } else {
        // All captions complete - show continue button
        const completeTimer = setTimeout(() => {
          setAllComplete(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.timing(continueOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
        }, 1000);

        typingRef.current = completeTimer;
      }
    });

    return () => {
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
    };
  }, [currentIndex, startTyping, continueOpacity]);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/three-lights');
  };

  // Determine what to show - accumulated text + current typing, or just current
  const currentCaption = captions[currentIndex];
  const showAccumulated = currentCaption?.accumulate ||
    (accumulatedText && currentIndex > 0 && captions[currentIndex - 1]?.accumulate);

  return (
    <SafeAreaView style={styles.container}>
      {/* Journey badge at top */}
      {data.journeyFocus && (
        <View style={styles.badgeContainer}>
          <JourneyBadge focus={data.journeyFocus} size="sm" />
        </View>
      )}

      <View style={styles.content}>
        {/* Soteria's presence with expanding feeling */}
        <View style={styles.presenceContainer}>
          <SoteriaPresence size="medium" intensity="high" />
        </View>

        {/* Caption text - typewriter effect */}
        <View style={styles.captionContainer}>
          {showAccumulated && accumulatedText ? (
            <Text style={styles.captionText}>
              {accumulatedText}
              {currentCaption?.accumulate && '\n'}
              {currentCaption?.accumulate && displayedText}
              {isTyping && <Text style={styles.cursor}>|</Text>}
            </Text>
          ) : (
            <Text style={styles.captionText}>
              {displayedText}
              {isTyping && <Text style={styles.cursor}>|</Text>}
            </Text>
          )}
        </View>
      </View>

      {/* Continue button - always rendered to prevent layout shift */}
      <Animated.View style={[styles.footer, { opacity: continueOpacity }]}>
        <TouchableOpacity
          style={styles.tapArea}
          onPress={handleContinue}
          disabled={!allComplete}
        >
          <Text style={styles.tapHint}>Tap to continue</Text>
        </TouchableOpacity>
      </Animated.View>
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
    marginBottom: 96,
  },
  captionContainer: {
    width: '100%',
    minHeight: 120,
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
