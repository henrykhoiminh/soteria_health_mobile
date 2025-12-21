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
  { text: 'Your Body. Strength and movement.', pauseAfter: 700 },
  { text: 'What shall you call it?', pauseAfter: 0 },
];

// Caption data for reset users
const resetUserCaptions = [
  { text: 'Your Body. Ready to begin again.', pauseAfter: 700 },
  { text: "What shall you call it this time?", pauseAfter: 0 },
];

// Comments for each name
const nameComments: Record<string, string> = {
  'Atlas': 'Atlas... Built to carry the weight of worlds.',
  'Paz': 'Ah, Paz. Strength through stillness.',
  'Miguel': 'Miguel... A warrior\'s heart beats within.',
};

// Name descriptions
const nameDescriptions: Record<string, string> = {
  'Atlas': 'Bearer of strength',
  'Paz': 'Calm and grounded',
  'Miguel': 'Warrior spirit',
};

type Phase = 'intro' | 'naming' | 'comment' | 'complete';

// Screen 8: Body Extraction
export default function BodyExtractionScreen() {
  const router = useRouter();
  const { data, setBodyName, isResetFlow } = useOnboarding();
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const selectorOpacity = useRef(new Animated.Value(0)).current;
  const nameButtonOpacity = useRef(new Animated.Value(0)).current;
  const nameButtonScale = useRef(new Animated.Value(0.8)).current;
  const continueButtonOpacity = useRef(new Animated.Value(0)).current;
  const continueButtonScale = useRef(new Animated.Value(0.8)).current;
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  const captions = isResetFlow
    ? resetUserCaptions
    : bodyCaptions;
  const isValid = data.bodyName.trim().length > 0;

  // Animate Name Companion button when name is selected
  useEffect(() => {
    if (phase === 'naming' && isValid) {
      nameButtonScale.setValue(0.8);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.timing(nameButtonOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(nameButtonScale, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      nameButtonOpacity.setValue(0);
      nameButtonScale.setValue(0.8);
    }
  }, [phase, isValid]);

  // Animate Continue button when it should show
  useEffect(() => {
    if (showContinue) {
      continueButtonScale.setValue(0.8);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.timing(continueButtonOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(continueButtonScale, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showContinue]);

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

  // Intro phase - show intro captions then selector
  useEffect(() => {
    if (phase !== 'intro') return;

    const currentCaption = captions[currentIndex];

    startTyping(currentCaption.text, () => {
      if (currentIndex < captions.length - 1) {
        const nextTimer = setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, currentCaption.pauseAfter);
        typingRef.current = nextTimer;
      } else {
        // All captions complete - show selector
        const completeTimer = setTimeout(() => {
          setPhase('naming');
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
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [phase, currentIndex, startTyping, selectorOpacity, captions]);

  // Comment phase - show Soteria's comment on the name
  useEffect(() => {
    if (phase !== 'comment') return;

    const comment = nameComments[data.bodyName] || `${data.bodyName}... A fine choice.`;

    startTyping(comment, () => {
      // After comment, show continue button
      setTimeout(() => {
        setPhase('complete');
        setShowContinue(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 600);
    });

    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [phase, data.bodyName, startTyping]);

  const handleNameSelect = (name: string) => {
    setBodyName(name);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleConfirmName = () => {
    if (!isValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Fade out selector, then show comment
    Animated.timing(selectorOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowSelector(false);
      setTimeout(() => {
        setPhase('comment');
      }, 200);
    });
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
          {data.bodyName && nameDescriptions[data.bodyName] && (
            <Text style={styles.nameDescription}>
              {nameDescriptions[data.bodyName]}
            </Text>
          )}
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

      {/* Name Companion button - when name selected but not confirmed */}
      {phase === 'naming' && isValid && (
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: nameButtonOpacity,
              transform: [{ scale: nameButtonScale }],
            }
          ]}
        >
          <TouchableOpacity
            style={styles.button}
            onPress={handleConfirmName}
          >
            <Text style={styles.buttonText}>Name Companion</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Continue button - only after comment */}
      {showContinue && (
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: continueButtonOpacity,
              transform: [{ scale: continueButtonScale }],
            }
          ]}
        >
          <TouchableOpacity
            style={styles.button}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  orbContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  nameDescription: {
    marginTop: 8,
    fontSize: 14,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  captionContainer: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 16,
    padding: 20,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
