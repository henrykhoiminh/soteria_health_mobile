import JourneyBadge from '@/components/JourneyBadge';
import OnboardingProgress from './components/OnboardingProgress';
import { AppColors } from '@/constants/theme';
import { BODY_NAME_OPTIONS, useOnboarding } from '@/lib/contexts/OnboardingContext';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AvatarOrb from './components/AvatarOrb';
import NameSelector from './components/NameSelector';

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

// Caption data for new users (streamlined for pacing)
const bodyCaptions = [
  { text: 'Your Body. Strength and movement.', pauseAfter: 1000 },
  { text: 'What shall you call it?', pauseAfter: 0 },
];

// Caption data for reset users
const resetUserCaptions = [
  { text: 'Your Body. Ready to begin again.', pauseAfter: 1000 },
  { text: "What shall you call it this time?", pauseAfter: 0 },
];

// Screen 8: Body Extraction
export default function BodyExtractionScreen() {
  const router = useRouter();
  const { data, setBodyName, isResetFlow } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const selectorOpacity = useRef(new Animated.Value(0)).current;
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  const captions = isResetFlow
    ? resetUserCaptions
    : bodyCaptions;
  const isValid = data.bodyName.trim().length > 0;

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
        // All captions complete - show selector
        const completeTimer = setTimeout(() => {
          setShowSelector(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.timing(selectorOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
        }, 800);

        typingRef.current = completeTimer;
      }
    });

    return () => {
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
    };
  }, [currentIndex, startTyping, selectorOpacity, captions]);

  const handleNameSelect = (name: string) => {
    setBodyName(name);
  };

  const handleContinue = () => {
    if (isValid) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/onboarding/soul-extraction');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress currentStep="body-extraction" />

      {/* Journey badge at top */}
      {data.journeyFocus && (
        <View style={styles.badgeContainer}>
          <JourneyBadge focus={data.journeyFocus} size="sm" />
        </View>
      )}

      <View style={styles.content}>
        {/* Body orb - prominently displayed */}
        <View style={styles.orbContainer}>
          <AvatarOrb
            type="Body"
            size="large"
            animate={true}
            name={data.bodyName || undefined}
            showName={data.bodyName.length > 0}
          />
        </View>

        {/* Caption text - typewriter effect */}
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>
            {displayedText}
            {isTyping && <Text style={styles.cursor}>|</Text>}
          </Text>
        </View>

        {/* Name selector - fades in after typing */}
        <Animated.View style={[styles.selectorContainer, { opacity: selectorOpacity }]}>
          {showSelector && (
            <NameSelector
              options={[...BODY_NAME_OPTIONS]}
              selected={data.bodyName || null}
              onSelect={handleNameSelect}
              category="Body"
            />
          )}
        </Animated.View>
      </View>

      {/* Continue button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!isValid}
        >
          <Text style={styles.buttonText}>Continue</Text>
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
  orbContainer: {
    marginBottom: 32,
  },
  captionContainer: {
    width: '100%',
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
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
  selectorContainer: {
    width: '100%',
    paddingHorizontal: 16,
    minHeight: 80,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    color: AppColors.primaryText,
    fontSize: 18,
    fontWeight: '600',
  },
});
