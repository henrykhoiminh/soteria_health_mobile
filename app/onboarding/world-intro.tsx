import JourneyBadge from '@/components/JourneyBadge';
import { AppColors } from '@/constants/theme';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import OnboardingButton from './components/OnboardingButton';
import OnboardingProgress from './components/OnboardingProgress';
import SoteriaPresence from './components/SoteriaPresence';

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

// Caption data with text and pause duration after typing completes
const captions = [
  { text: 'Let me show you this place.', pauseAfter: 600 },
  { text: 'A space where humans learn to care for themselves —', pauseAfter: 700 },
  { text: 'mind, body, and soul.', pauseAfter: 800 },
  { text: 'You are not alone here.', pauseAfter: 700 },

  // Accumulating community beats
  { text: 'Others walk with you.', pauseAfter: 500, accumulate: true },
  { text: 'They share practices.', pauseAfter: 500, accumulate: true },
  { text: 'They form Circles.', pauseAfter: 500, accumulate: true },
  { text: 'They support one another.', pauseAfter: 800, accumulate: true },

  // Bridge to next screen
  { text: 'Ready to see what you carry?', pauseAfter: 0 },
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
  const [showSkip, setShowSkip] = useState(true);
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

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/three-lights');
  };

  const handleSkip = () => {
    if (typingRef.current) clearTimeout(typingRef.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowSkip(false);
    setAllComplete(true);
    setAccumulatedText('');
    setDisplayedText(captions[captions.length - 1].text);
  };

  // Determine what to show - accumulated text + current typing, or just current
  const currentCaption = captions[currentIndex];
  const showAccumulated = currentCaption?.accumulate ||
    (accumulatedText && currentIndex > 0 && captions[currentIndex - 1]?.accumulate);

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress currentStep="world-intro" />

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

      {/* Skip button */}
      <OnboardingButton
        label="Skip"
        onPress={handleSkip}
        visible={showSkip && !allComplete}
        variant="secondary"
      />

      {/* Continue button */}
      <OnboardingButton
        label="Continue"
        onPress={handleContinue}
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 80,
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
});
