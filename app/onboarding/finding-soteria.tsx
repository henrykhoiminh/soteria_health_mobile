import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import SoteriaPresence from './components/SoteriaPresence';
import JourneyBadge from '@/components/JourneyBadge';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import { AppColors } from '@/constants/theme';
import { JourneyFocus } from '@/types';

// Caption data with text and duration to wait after typing completes before next caption
const introCaptions = [
  { text: 'Oh... You found me!', pauseAfter: 1000 },
  { text: "That's not easy to do, you know.", pauseAfter: 1500 },
  { text: 'I am Soteria...\ngoddess of safety and protection.', pauseAfter: 2000 },
  { text: 'So... what is it you seek?', pauseAfter: 0 }, // Last one stays
];

// Welcome captions after journey selection
const preventionWelcomeCaptions = [
  { text: 'Prevention.', pauseAfter: 800 },
  { text: "You're not waiting to break.", pauseAfter: 1200 },
  { text: "You're building strength before you need it.", pauseAfter: 1500 },
  { text: 'Smart.', pauseAfter: 1000 },
  { text: 'I built this place for people like you.', pauseAfter: 1200 },
  { text: 'Welcome.', pauseAfter: 0 },
];

const recoveryWelcomeCaptions = [
  { text: 'Recovery.', pauseAfter: 800 },
  { text: 'Something happened.', pauseAfter: 1200 },
  { text: "And instead of giving up,", pauseAfter: 1000 },
  { text: "you're here looking for a way forward.", pauseAfter: 1500 },
  { text: 'That takes strength.', pauseAfter: 1200 },
  { text: 'I built this place for people like you.', pauseAfter: 1200 },
  { text: 'Welcome.', pauseAfter: 0 },
];

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters (1 = every char, 2 = every other, etc.)
const HAPTIC_FREQUENCY = 2;

// Screen 2: Finding Soteria
export default function FindingSoteriaScreen() {
  const router = useRouter();
  const { setJourneyFocus } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<JourneyFocus | null>(null);
  const [showContinue, setShowContinue] = useState(false);
  const [welcomePhase, setWelcomePhase] = useState(false); // true when showing welcome dialogue
  const [welcomeIndex, setWelcomeIndex] = useState(0);
  const [welcomeText, setWelcomeText] = useState('');
  const [isWelcomeTyping, setIsWelcomeTyping] = useState(false);
  const choicesOpacity = useRef(new Animated.Value(0)).current;
  const choicesScale = useRef(new Animated.Value(0.9)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.8)).current;
  const continueOpacity = useRef(new Animated.Value(0)).current;
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const welcomeTypingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);
  const welcomeCharIndexRef = useRef(0);

  // Typewriter effect
  const startTyping = useCallback((text: string, onComplete: () => void) => {
    setDisplayedText('');
    setIsTyping(true);
    charIndexRef.current = 0;

    const typeNextChar = () => {
      if (charIndexRef.current < text.length) {
        const nextChar = text[charIndexRef.current];
        setDisplayedText(text.substring(0, charIndexRef.current + 1));

        // Haptic feedback for visible characters (not spaces/newlines) at specified frequency
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

  // Welcome typewriter effect
  const startWelcomeTyping = useCallback((text: string, onComplete: () => void) => {
    setWelcomeText('');
    setIsWelcomeTyping(true);
    welcomeCharIndexRef.current = 0;

    const typeNextChar = () => {
      if (welcomeCharIndexRef.current < text.length) {
        const nextChar = text[welcomeCharIndexRef.current];
        setWelcomeText(text.substring(0, welcomeCharIndexRef.current + 1));

        // Haptic feedback for visible characters
        if (nextChar !== ' ' && nextChar !== '\n' && welcomeCharIndexRef.current % HAPTIC_FREQUENCY === 0) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        welcomeCharIndexRef.current++;
        welcomeTypingRef.current = setTimeout(typeNextChar, TYPING_SPEED);
      } else {
        setIsWelcomeTyping(false);
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
      if (welcomeTypingRef.current) {
        clearTimeout(welcomeTypingRef.current);
      }
    };
  }, []);

  // Intro captions effect
  useEffect(() => {
    // Skip if we're in welcome phase
    if (welcomePhase) return;

    // Delay before first caption to build anticipation (Soteria "waking up")
    const initialDelay = currentIndex === 0 ? 2000 : 0;

    const startTimer = setTimeout(() => {
      const currentCaption = introCaptions[currentIndex];

      startTyping(currentCaption.text, () => {
        // After typing completes
        if (currentIndex < introCaptions.length - 1) {
          // Wait then move to next caption
          const nextTimer = setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
          }, currentCaption.pauseAfter);

          typingRef.current = nextTimer;
        } else {
          // Last caption - show choice cards after a moment
          const choicesTimer = setTimeout(() => {
            setShowChoices(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Animate choices in
            Animated.parallel([
              Animated.timing(choicesOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.spring(choicesScale, {
                toValue: 1,
                friction: 6,
                tension: 80,
                useNativeDriver: true,
              }),
            ]).start();
          }, 1500);

          typingRef.current = choicesTimer;
        }
      });
    }, initialDelay);

    return () => {
      clearTimeout(startTimer);
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
    };
  }, [currentIndex, startTyping, welcomePhase]);

  // Welcome captions effect
  useEffect(() => {
    if (!welcomePhase || !selectedFocus) return;

    const welcomeCaptions = selectedFocus === 'Injury Prevention'
      ? preventionWelcomeCaptions
      : recoveryWelcomeCaptions;

    const currentCaption = welcomeCaptions[welcomeIndex];

    startWelcomeTyping(currentCaption.text, () => {
      // After typing completes
      if (welcomeIndex < welcomeCaptions.length - 1) {
        // Wait then move to next caption
        const nextTimer = setTimeout(() => {
          setWelcomeIndex(prev => prev + 1);
        }, currentCaption.pauseAfter);

        welcomeTypingRef.current = nextTimer;
      } else {
        // All welcome captions complete - show continue button
        const completeTimer = setTimeout(() => {
          setShowContinue(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.timing(continueOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
        }, 1000);

        welcomeTypingRef.current = completeTimer;
      }
    });

    return () => {
      if (welcomeTypingRef.current) {
        clearTimeout(welcomeTypingRef.current);
      }
    };
  }, [welcomePhase, welcomeIndex, selectedFocus, startWelcomeTyping, continueOpacity]);

  const handleSelect = (focus: JourneyFocus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setJourneyFocus(focus);
    setSelectedFocus(focus);

    // Hide choice cards
    Animated.timing(choicesOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowChoices(false);

      // Show badge with animation (appears below Soteria)
      Animated.parallel([
        Animated.timing(badgeOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(badgeScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // After badge appears, start welcome dialogue
        setTimeout(() => {
          setWelcomePhase(true);
        }, 500);
      });
    });
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/world-intro');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Soteria's presence */}
        <View style={styles.presenceContainer}>
          <SoteriaPresence size={showChoices || selectedFocus ? 'medium' : 'large'} intensity="medium" />
        </View>

        {/* Journey Badge - appears after selection, below Soteria */}
        {selectedFocus && (
          <Animated.View
            style={[
              styles.badgeContainer,
              {
                opacity: badgeOpacity,
                transform: [{ scale: badgeScale }],
              },
            ]}
          >
            <JourneyBadge focus={selectedFocus} size="md" />
          </Animated.View>
        )}

        {/* Caption text - always rendered to prevent layout shift */}
        <View style={styles.captionContainer}>
          {!selectedFocus ? (
            // Intro phase text
            <Text style={styles.captionText}>
              {displayedText}
              {isTyping && <Text style={styles.cursor}>|</Text>}
            </Text>
          ) : (
            // Welcome phase text (or empty while waiting for welcome to start)
            <Text style={styles.captionText}>
              {welcomeText}
              {isWelcomeTyping && <Text style={styles.cursor}>|</Text>}
            </Text>
          )}
        </View>

        {/* Journey choice cards - appear after final caption */}
        {showChoices && (
          <Animated.View
            style={[
              styles.choicesContainer,
              {
                opacity: choicesOpacity,
                transform: [{ scale: choicesScale }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() => handleSelect('Injury Prevention')}
            >
              <View style={[styles.choiceIconContainer, styles.preventionIcon]}>
                <Ionicons name="shield-checkmark" size={32} color="#3B82F6" />
              </View>
              <View style={styles.choiceTextContainer}>
                <Text style={styles.choiceTitle}>Injury Prevention</Text>
                <Text style={styles.choiceDescription}>
                  Build strength before you need it
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() => handleSelect('Recovery')}
            >
              <View style={[styles.choiceIconContainer, styles.recoveryIcon]}>
                <Ionicons name="heart" size={32} color="#EF4444" />
              </View>
              <View style={styles.choiceTextContainer}>
                <Text style={styles.choiceTitle}>Recovery</Text>
                <Text style={styles.choiceDescription}>
                  Rebuild and heal the right way
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* Tap to continue - appears after badge is shown */}
      <Animated.View style={[styles.footer, { opacity: continueOpacity }]}>
        <TouchableOpacity
          style={styles.tapArea}
          onPress={handleContinue}
          disabled={!showContinue}
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  presenceContainer: {
    marginBottom: 48,
  },
  badgeContainer: {
    marginBottom: 32,
    alignItems: 'center',
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
  choicesContainer: {
    width: '100%',
    gap: 16,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  choiceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  preventionIcon: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  recoveryIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  choiceTextContainer: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  choiceDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
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
