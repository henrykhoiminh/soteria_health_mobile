import JourneyBadge from '@/components/JourneyBadge';
import SanctumBackground from '@/components/Dashboard/SanctumBackground';
import { AppColors } from '@/constants/theme';
import { SOUL_NAME_OPTIONS, useOnboarding } from '@/lib/contexts/OnboardingContext';
import { getSoulStateImage } from '@/lib/utils/companion-images';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import NameSelector from './components/NameSelector';
import OnboardingProgress from './components/OnboardingProgress';
import SoteriaDialogueBox from './components/SoteriaDialogueBox';
import CharacterSummoningAnimation from './components/CharacterSummoningAnimation';

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

// Caption data for new users (streamlined for pacing)
const newUserCaptions = [
  { text: 'Your Soul.\nPeace and connection.', pauseAfter: 700 },
  { text: 'What shall you call them?', pauseAfter: 0 },
];

// Caption data for reset users
const resetUserCaptions = [
  { text: 'Your Soul. Patient as ever.', pauseAfter: 700 },
  { text: 'What will you call them now?', pauseAfter: 0 },
];

// Comments for each name
const nameComments: Record<string, string> = {
  'Bodhi': 'Bodhi... Awakened. Aware. Ready.',
  'Lotus': 'Ah, Lotus. Beauty rising from the depths.',
  'Tofu': 'Tofu... delicious.',
};

// Name descriptions
const nameDescriptions: Record<string, string> = {
  'Bodhi': 'The enlightened and free',
  'Lotus': 'The flower with heart',
  'Tofu': 'Yummy yum',
};

type Phase = 'intro' | 'naming' | 'comment' | 'complete';

// Screen 9: Soul Extraction
export default function SoulExtractionScreen() {
  const router = useRouter();
  const { data, setSoulName, isResetFlow } = useOnboarding();
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [showSummoning, setShowSummoning] = useState(true);
  const [summoningComplete, setSummoningComplete] = useState(false);
  const selectorOpacity = useRef(new Animated.Value(0)).current;
  const nameButtonOpacity = useRef(new Animated.Value(0)).current;
  const nameButtonScale = useRef(new Animated.Value(0.8)).current;
  const continueButtonOpacity = useRef(new Animated.Value(0)).current;
  const continueButtonScale = useRef(new Animated.Value(0.8)).current;
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  const soulImage = useMemo(() => getSoulStateImage('Dormant'), []);

  // Breathing animation
  const breathAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 1.03, duration: 2000, useNativeDriver: true }),
        Animated.timing(breathAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathAnim]);

  const captions = isResetFlow ? resetUserCaptions : newUserCaptions;
  const isValid = data.soulName.trim().length > 0;

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

  // Handle summoning animation complete
  const handleSummoningComplete = () => {
    setSummoningComplete(true);
    setShowSummoning(false);
  };

  // Intro phase - show intro captions then selector
  useEffect(() => {
    if (phase !== 'intro' || !summoningComplete) return;

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
  }, [phase, currentIndex, startTyping, selectorOpacity, captions, summoningComplete]);

  // Comment phase - show Soteria's comment on the name
  useEffect(() => {
    if (phase !== 'comment') return;

    const comment = nameComments[data.soulName] || `${data.soulName}... A fine choice.`;

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
  }, [phase, data.soulName, startTyping]);

  const handleNameSelect = (name: string) => {
    setSoulName(name);
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
      // For reset flow, skip to the pact screen
      // For new users, go to introduce yourself
      if (isResetFlow) {
        router.push('/onboarding/the-pact');
      } else {
        router.push('/onboarding/introduce-yourself');
      }
    }
  };

  return (
    <SanctumBackground focusCategory="Soul">
    <SafeAreaView style={styles.container}>
      {/* Summoning animation for Soul */}
      {showSummoning && (
        <CharacterSummoningAnimation
          characterColor={AppColors.soul}
          onAnimationComplete={handleSummoningComplete}
        >
          <Image source={soulImage} style={styles.companionImage} resizeMode="contain" />
        </CharacterSummoningAnimation>
      )}

      <OnboardingProgress currentStep="soul-extraction" />

      {/* Journey badge at top */}
      {data.journeyFocus && (
        <View style={styles.badgeContainer}>
          <JourneyBadge focus={data.journeyFocus} size="sm" />
        </View>
      )}

      <View style={styles.content}>
        {/* Soul orb - only show after summoning completes */}
        {summoningComplete && (
          <View style={styles.orbContainer}>
            {data.soulName.length > 0 && (
              <Text style={styles.companionName}>{data.soulName}</Text>
            )}
            <Animated.View style={{ transform: [{ scale: breathAnim }] }}>
              <Image source={soulImage} style={styles.companionImage} resizeMode="contain" />
            </Animated.View>
            {data.soulName && nameDescriptions[data.soulName] && (
              <Text style={styles.nameDescription}>
                {nameDescriptions[data.soulName]}
              </Text>
            )}
          </View>
        )}

        {/* Caption text - only show after summoning */}
        {summoningComplete && (
          <View style={styles.dialogueBoxContainer}>
            <SoteriaDialogueBox
              text={displayedText}
              glowPosition="top"
              isTyping={isTyping}
            />
          </View>
        )}

        {/* Name selector - fades in after typing */}
        <Animated.View style={[styles.selectorContainer, { opacity: selectorOpacity }]}>
          {showSelector && (
            <NameSelector
              options={[...SOUL_NAME_OPTIONS]}
              selected={data.soulName || null}
              onSelect={handleNameSelect}
              category="Soul"
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
    </SanctumBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    minHeight: 200,
  },
  companionImage: {
    width: 140,
    height: 140,
  },
  companionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 1,
  },
  nameDescription: {
    marginTop: 8,
    fontSize: 14,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  dialogueBoxContainer: {
    width: '100%',
    marginBottom: 32,
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
