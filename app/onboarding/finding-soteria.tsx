import JourneyBadge from '@/components/JourneyBadge';
import { AppColors } from '@/constants/theme';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import { JourneyFocus } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import OnboardingButton from './components/OnboardingButton';
import OnboardingProgress from './components/OnboardingProgress';
import SoteriaPresence from './components/SoteriaPresence';

// Phase 1: Initial mystery - Soteria notices the user (two-part dialogue)
const mysteryCaptions = [
  { text: 'Well, well...', pauseAfter: 1500 },
  { text: 'Who do we have here?', pauseAfter: 0 },
];

// Phase 3: After user enters name - Soteria introduces herself
const introCaptions = [
  { text: 'I am Soteria.', pauseAfter: 1200 },
  { text: 'I have guided many before you.', pauseAfter: 1500 },
  { text: 'So... tell me, human.', pauseAfter: 1200 },
  { text: 'What is it you seek?', pauseAfter: 0 },
];

// Welcome captions after journey selection
const preventionWelcomeCaptions = [
  { text: 'You chose preparation over repair.', pauseAfter: 1200 },
  { text: 'Wise.', pauseAfter: 800 },
  { text: 'Welcome.', pauseAfter: 0 },
];

const recoveryWelcomeCaptions = [
  { text: 'You chose to come back stronger.', pauseAfter: 1200 },
  { text: 'That takes courage.', pauseAfter: 1000 },
  { text: 'Welcome.', pauseAfter: 0 },
];

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

type Phase = 'mystery' | 'name-entry' | 'reinforcement' | 'intro' | 'choices' | 'welcome' | 'complete';

// Screen 2: Finding Soteria
export default function FindingSoteriaScreen() {
  const router = useRouter();
  const { data, setFirstName, setLastName, setJourneyFocus } = useOnboarding();

  // Phase management
  const [phase, setPhase] = useState<Phase>('mystery');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mysteryIndex, setMysteryIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<JourneyFocus | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [showNameInputs, setShowNameInputs] = useState(false);

  // Animation refs
  const choicesOpacity = useRef(new Animated.Value(0)).current;
  const choicesScale = useRef(new Animated.Value(0.9)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.8)).current;
  const inputsOpacity = useRef(new Animated.Value(0)).current;

  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  const isNameValid = data.firstName.trim().length > 0 && data.lastName.trim().length > 0;

  // Get current captions based on phase
  const getCurrentCaptions = useCallback(() => {
    if (phase === 'mystery') return mysteryCaptions;
    if (phase === 'intro') return introCaptions;
    if (phase === 'welcome' && selectedFocus) {
      return selectedFocus === 'Injury Prevention'
        ? preventionWelcomeCaptions
        : recoveryWelcomeCaptions;
    }
    return [];
  }, [phase, selectedFocus]);

  // Typewriter effect
  const startTyping = useCallback((text: string, onComplete: () => void) => {
    setDisplayedText('');
    setIsTyping(true);
    charIndexRef.current = 0;

    const typeNextChar = () => {
      if (charIndexRef.current < text.length) {
        const nextChar = text[charIndexRef.current];
        setDisplayedText(text.substring(0, charIndexRef.current + 1));

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

  // Skip current typing to end
  const skipToEnd = useCallback(() => {
    if (typingRef.current) {
      clearTimeout(typingRef.current);
    }
    const captions = getCurrentCaptions();
    const index = phase === 'mystery' ? mysteryIndex : currentIndex;
    if (captions[index]) {
      setDisplayedText(captions[index].text);
      setIsTyping(false);
    }
  }, [getCurrentCaptions, currentIndex, mysteryIndex, phase]);

  // Clear typing on unmount
  useEffect(() => {
    return () => {
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
    };
  }, []);

  // Mystery phase - cycle through mystery captions then show name inputs
  useEffect(() => {
    if (phase !== 'mystery') return;

    const currentCaption = mysteryCaptions[mysteryIndex];

    const startTimer = setTimeout(() => {
      startTyping(currentCaption.text, () => {
        if (mysteryIndex < mysteryCaptions.length - 1) {
          // Move to next mystery caption after pause
          const nextTimer = setTimeout(() => {
            setMysteryIndex(prev => prev + 1);
          }, currentCaption.pauseAfter);
          typingRef.current = nextTimer;
        } else {
          // All mystery captions complete - show name inputs
          setTimeout(() => {
            setShowNameInputs(true);
            setPhase('name-entry');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Animated.timing(inputsOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }).start();
          }, 800);
        }
      });
    }, mysteryIndex === 0 ? 1500 : 0); // Only delay on first caption

    return () => {
      clearTimeout(startTimer);
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [phase, mysteryIndex, startTyping, inputsOpacity]);

  // Show submit button when name is valid
  useEffect(() => {
    if (phase === 'name-entry' && isNameValid && !showButton) {
      setShowButton(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [phase, isNameValid, showButton]);

  // Reinforcement phase - show personalized message
  useEffect(() => {
    if (phase !== 'reinforcement') return;

    const reinforcementMessage = `${data.firstName}... I sense something very special about you.`;

    startTyping(reinforcementMessage, () => {
      // After typing, show "Who are you?" button
      setTimeout(() => {
        setShowButton(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 1200);
    });
  }, [phase, data.firstName, startTyping]);

  // Intro phase - cycle through intro captions
  useEffect(() => {
    if (phase !== 'intro') return;

    const captions = introCaptions;
    const currentCaption = captions[currentIndex];

    // Show skip button after first caption starts
    if (currentIndex === 0) {
      setTimeout(() => setShowSkip(true), 1500);
    }

    startTyping(currentCaption.text, () => {
      if (currentIndex < captions.length - 1) {
        const nextTimer = setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, currentCaption.pauseAfter);
        typingRef.current = nextTimer;
      } else {
        // Show journey choices
        setTimeout(() => {
          setShowSkip(false);
          setPhase('choices');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.parallel([
            Animated.timing(choicesOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(choicesScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
          ]).start();
        }, 1200);
      }
    });

    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [phase, currentIndex, startTyping]);

  // Welcome phase - show welcome message after selection
  useEffect(() => {
    if (phase !== 'welcome' || !selectedFocus) return;

    const captions = selectedFocus === 'Injury Prevention'
      ? preventionWelcomeCaptions
      : recoveryWelcomeCaptions;
    const currentCaption = captions[currentIndex];

    startTyping(currentCaption.text, () => {
      if (currentIndex < captions.length - 1) {
        const nextTimer = setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, currentCaption.pauseAfter);
        typingRef.current = nextTimer;
      } else {
        // Show continue button
        setTimeout(() => {
          setPhase('complete');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowButton(true);
        }, 800);
      }
    });

    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [phase, currentIndex, selectedFocus, startTyping]);

  // Handle name submission
  const handleNameSubmit = () => {
    if (!isNameValid) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowButton(false);
    setShowNameInputs(false);

    // Fade out inputs
    Animated.timing(inputsOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setPhase('reinforcement');
    });
  };

  // Handle "Who are you?" button - proceed to intro
  const handleAskWhoAreYou = () => {
    setShowButton(false);
    setTimeout(() => {
      setCurrentIndex(0);
      setPhase('intro');
    }, 200);
  };

  // Handle journey selection
  const handleSelect = (focus: JourneyFocus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setJourneyFocus(focus);
    setSelectedFocus(focus);

    // Hide choices
    Animated.timing(choicesOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      // Show badge
      Animated.parallel([
        Animated.timing(badgeOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(badgeScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]).start(() => {
        // Start welcome dialogue
        setTimeout(() => {
          setCurrentIndex(0);
          setPhase('welcome');
        }, 400);
      });
    });
  };

  // Handle skip - jump to choices
  const handleSkip = () => {
    if (typingRef.current) clearTimeout(typingRef.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setShowSkip(false);
    setDisplayedText('What is it you seek?');
    setPhase('choices');

    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.timing(choicesOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(choicesScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]).start();
    }, 50);
  };

  // Handle tap to speed up typing
  const handleTapToSpeed = () => {
    if (isTyping) {
      skipToEnd();
    }
  };

  const handleContinue = () => {
    router.push('/onboarding/world-intro');
  };

  // Get button label and action based on phase
  const getButtonConfig = () => {
    if (phase === 'name-entry') {
      return { label: 'Continue', onPress: handleNameSubmit, visible: showButton && isNameValid };
    }
    if (phase === 'reinforcement') {
      return { label: 'Who are you?', onPress: handleAskWhoAreYou, visible: showButton };
    }
    if (phase === 'complete') {
      return { label: 'Continue', onPress: handleContinue, visible: showButton };
    }
    return { label: '', onPress: () => {}, visible: false };
  };

  const buttonConfig = getButtonConfig();

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress currentStep="finding-soteria" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Soteria's presence */}
          <View style={styles.presenceContainer}>
            <SoteriaPresence
              size={phase === 'choices' || selectedFocus ? 'medium' : 'large'}
              intensity={phase === 'reinforcement' ? 'high' : 'medium'}
            />
          </View>

          {/* Journey Badge - appears after selection */}
          {selectedFocus && (
            <Animated.View
              style={[
                styles.badgeContainer,
                { opacity: badgeOpacity, transform: [{ scale: badgeScale }] },
              ]}
            >
              <JourneyBadge focus={selectedFocus} size="md" />
            </Animated.View>
          )}

          {/* Caption text - tap to speed up */}
          <TouchableOpacity
            style={styles.captionContainer}
            onPress={handleTapToSpeed}
            activeOpacity={1}
          >
            <Text style={[
              styles.captionText,
              phase === 'reinforcement' && styles.reinforcementText
            ]}>
              {displayedText}
              {isTyping && <Text style={styles.cursor}>|</Text>}
            </Text>
          </TouchableOpacity>

          {/* Name inputs - shown during name-entry phase */}
          {(phase === 'mystery' || phase === 'name-entry') && (
            <Animated.View style={[styles.inputsContainer, { opacity: inputsOpacity }]}>
              {showNameInputs && (
                <>
                  <TextInput
                    style={styles.input}
                    value={data.firstName}
                    onChangeText={setFirstName}
                    placeholder="First Name"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    autoCapitalize="words"
                    autoFocus={true}
                  />
                  <TextInput
                    style={styles.input}
                    value={data.lastName}
                    onChangeText={setLastName}
                    placeholder="Last Name"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    autoCapitalize="words"
                  />
                </>
              )}
            </Animated.View>
          )}

          {/* Journey choice cards */}
          {phase === 'choices' && (
            <Animated.View
              style={[
                styles.choicesContainer,
                { opacity: choicesOpacity, transform: [{ scale: choicesScale }] },
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
      </KeyboardAvoidingView>

      {/* Skip button - only during intro phase */}
      <OnboardingButton
        label="Skip"
        onPress={handleSkip}
        visible={showSkip}
        variant="secondary"
      />

      {/* Primary action button - always at bottom */}
      <OnboardingButton
        label={buttonConfig.label}
        onPress={buttonConfig.onPress}
        visible={buttonConfig.visible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  presenceContainer: {
    marginBottom: 32,
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
  reinforcementText: {
    fontSize: 22,
    fontStyle: 'italic',
    lineHeight: 32,
  },
  cursor: {
    color: AppColors.primary,
    fontWeight: '300',
  },
  inputsContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 12,
    marginTop: 24,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  choicesContainer: {
    width: '100%',
    gap: 16,
    marginTop: 24,
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
});
