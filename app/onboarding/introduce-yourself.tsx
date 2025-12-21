import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AvatarOrb from './components/AvatarOrb';
import JourneyBadge from '@/components/JourneyBadge';
import OnboardingProgress from './components/OnboardingProgress';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import { AppColors } from '@/constants/theme';

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

// Screen 10: Introduce Yourself (Avatars greet the user)
export default function IntroduceYourselfScreen() {
  const router = useRouter();
  const { data } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  // Caption data - avatars acknowledge the user by name
  const captions = [
    { text: `${data.mindName}, ${data.bodyName}, and ${data.soulName}.`, pauseAfter: 700 },
    { text: "They're yours now.", pauseAfter: 700 },
    { text: `And ${data.firstName}, they already know your name.`, pauseAfter: 800 },
    { text: "Together, you'll build something extraordinary.", pauseAfter: 0 },
  ];

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
          setShowButton(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.parallel([
            Animated.timing(buttonOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.spring(buttonScale, {
              toValue: 1,
              friction: 4,
              tension: 100,
              useNativeDriver: true,
            }),
          ]).start();
        }, 1200);

        typingRef.current = completeTimer;
      }
    });

    return () => {
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
    };
  }, [currentIndex, startTyping, buttonOpacity, buttonScale]);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/traveler-name');
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress currentStep="introduce-yourself" />

      {/* Journey badge at top */}
      {data.journeyFocus && (
        <View style={styles.badgeContainer}>
          <JourneyBadge focus={data.journeyFocus} size="sm" />
        </View>
      )}

      <View style={styles.content}>
        {/* Three orbs looking at user */}
        <View style={styles.orbsContainer}>
          <AvatarOrb type="Mind" size="small" name={data.mindName} showName={true} />
          <AvatarOrb type="Body" size="small" name={data.bodyName} showName={true} />
          <AvatarOrb type="Soul" size="small" name={data.soulName} showName={true} />
        </View>

        {/* Caption text - typewriter effect */}
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>
            {displayedText}
            {isTyping && <Text style={styles.cursor}>|</Text>}
          </Text>
        </View>
      </View>

      {/* Continue button */}
      <Animated.View
        style={[
          styles.footer,
          {
            opacity: buttonOpacity,
            transform: [{ scale: buttonScale }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
          disabled={!showButton}
        >
          <Text style={styles.buttonText}>Continue</Text>
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 80,
  },
  orbsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 20,
    marginBottom: 32,
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
  buttonText: {
    color: AppColors.primaryText,
    fontSize: 18,
    fontWeight: '600',
  },
});
