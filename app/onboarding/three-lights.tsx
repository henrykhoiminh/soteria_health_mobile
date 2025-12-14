import JourneyBadge from '@/components/JourneyBadge';
import { AppColors } from '@/constants/theme';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AvatarOrb from './components/AvatarOrb';

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

// Caption data with text, pause duration, and optional highlight for orbs
// highlight: 'Mind' | 'Body' | 'Soul' | 'all' | null
const captions: Array<{ 
  text: string; 
  pauseAfter: number; 
  highlight?: 'Mind' | 'Body' | 'Soul' | 'all' | null 
}> = [
  { text: 'Now.', pauseAfter: 800 },
  { text: 'Let me show you what you carry.', pauseAfter: 1200 },
  { text: 'Within you are three lights.', pauseAfter: 1500, highlight: 'all' },

  { text: 'Your Mind — focus, clarity, thought.', pauseAfter: 1500, highlight: 'Mind' },
  { text: 'Your Body — strength, movement, energy.', pauseAfter: 1500, highlight: 'Body' },
  { text: 'Your Soul — peace, joy, connection.', pauseAfter: 1500, highlight: 'Soul' },

  { text: 'Together, they form your Light.', pauseAfter: 1200, highlight: 'all' },
  { text: 'Every human here carries it.', pauseAfter: 1000 },
  { text: 'Few learn how to tend it.', pauseAfter: 1400 },

  { text: 'When nurtured, it glows.', pauseAfter: 1200, highlight: 'all' },
  { text: 'When neglected, it fades.', pauseAfter: 1200 },
  { text: 'That part is simple.', pauseAfter: 0 },
];


// Screen 5: The Three Lights
export default function ThreeLightsScreen() {
  const router = useRouter();
  const { data } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [allComplete, setAllComplete] = useState(false);
  const [highlightedOrb, setHighlightedOrb] = useState<'Mind' | 'Body' | 'Soul' | 'all' | null>(null);
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

    // Set highlight for this caption
    setHighlightedOrb(currentCaption.highlight || null);

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
    router.push('/onboarding/the-offer');
  };

  // Helper to check if an orb should be highlighted
  const isOrbHighlighted = (orbType: 'Mind' | 'Body' | 'Soul') => {
    return highlightedOrb === orbType || highlightedOrb === 'all';
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
        {/* Three orbs in a row */}
        <View style={styles.orbsContainer}>
          <View style={[styles.orbWrapper, isOrbHighlighted('Mind') && styles.orbHighlighted]}>
            <AvatarOrb type="Mind" size="medium" animate={true} />
          </View>
          <View style={[styles.orbWrapper, isOrbHighlighted('Body') && styles.orbHighlighted]}>
            <AvatarOrb type="Body" size="medium" animate={true} />
          </View>
          <View style={[styles.orbWrapper, isOrbHighlighted('Soul') && styles.orbHighlighted]}>
            <AvatarOrb type="Soul" size="medium" animate={true} />
          </View>
        </View>

        {/* Caption text - typewriter effect */}
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>
            {displayedText}
            {isTyping && <Text style={styles.cursor}>|</Text>}
          </Text>
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
  orbsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 48,
  },
  orbWrapper: {
    opacity: 0.5,
    transform: [{ scale: 0.9 }],
  },
  orbHighlighted: {
    opacity: 1,
    transform: [{ scale: 1 }],
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
