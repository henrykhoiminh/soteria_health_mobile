import SanctumBackground from '@/components/Dashboard/SanctumBackground';
import { AppColors } from '@/constants/theme';
import { getCompanionImage } from '@/lib/utils/companion-images';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import OnboardingButton from './components/OnboardingButton';
import OnboardingProgress from './components/OnboardingProgress';
import SoteriaDialogueBox from './components/SoteriaDialogueBox';
import SoteriaPresence from './components/SoteriaPresence';

// Phase 1: Introduction
const introCaptions = [
  { text: 'Let me show you something....', pauseAfter: 800 },
  { text: 'Within every person exists three lights.', pauseAfter: 0 },
];

// Phase 2: Reveal the lights
const revealCaptions = [
  { text: 'Mind.', pauseAfter: 600 },
  { text: 'Body.', pauseAfter: 600 },
  { text: 'Soul.', pauseAfter: 0 },
];

// Phase 3: Explain harmony
const harmonyCaptions = [
  { text: 'Human health is the harmony among all three.', pauseAfter: 800 },
  { text: 'And human pain is the neglect of any of the three.', pauseAfter: 800 },
  { text: 'Nurture each one and you will achieve a pain-free life.', pauseAfter: 700 },
];

// Phase 4: Transition
const transitionCaptions = [
  { text: 'To begin, I will first need to extract each of yours and give them form.', pauseAfter: 700 },
  { text: 'Are you in?', pauseAfter: 0 }
];

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
const HAPTIC_FREQUENCY = 2;

type Phase = 'intro' | 'reveal' | 'harmony' | 'transition' | 'complete';

export default function ThreeLightsScreen() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [visibleOrbs, setVisibleOrbs] = useState<number>(0); // 0, 1, 2, or 3

  // Animation refs
  const orbsContainerOpacity = useRef(new Animated.Value(0)).current;
  const mindOrbOpacity = useRef(new Animated.Value(0)).current;
  const bodyOrbOpacity = useRef(new Animated.Value(0)).current;
  const soulOrbOpacity = useRef(new Animated.Value(0)).current;

  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  // Get current captions based on phase
  const getCurrentCaptions = useCallback(() => {
    switch (phase) {
      case 'intro': return introCaptions;
      case 'reveal': return revealCaptions;
      case 'harmony': return harmonyCaptions;
      case 'transition': return transitionCaptions;
      default: return [];
    }
  }, [phase]);

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
    if (captions[currentIndex]) {
      setDisplayedText(captions[currentIndex].text);
      setIsTyping(false);
    }
  }, [getCurrentCaptions, currentIndex]);

  // Clear typing on unmount
  useEffect(() => {
    return () => {
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
    };
  }, []);

  // Reveal orb animation
  const revealOrb = useCallback((orbIndex: number) => {
    const orbAnim = orbIndex === 0 ? mindOrbOpacity : orbIndex === 1 ? bodyOrbOpacity : soulOrbOpacity;

    Animated.timing(orbAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    setVisibleOrbs(orbIndex + 1);
  }, [mindOrbOpacity, bodyOrbOpacity, soulOrbOpacity]);

  // Intro phase
  useEffect(() => {
    if (phase !== 'intro') return;

    const captions = introCaptions;
    const currentCaption = captions[currentIndex];
    if (!currentCaption) return;

    // Show skip button after first caption starts
    if (currentIndex === 0) {
      setTimeout(() => setShowSkip(true), 1500);
    }

    const startDelay = currentIndex === 0 ? 800 : 0;

    const timer = setTimeout(() => {
      startTyping(currentCaption.text, () => {
        if (currentIndex < captions.length - 1) {
          const nextTimer = setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
          }, currentCaption.pauseAfter);
          typingRef.current = nextTimer;
        } else {
          // Show orbs container and transition to reveal phase
          setTimeout(() => {
            Animated.timing(orbsContainerOpacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }).start(() => {
              setCurrentIndex(0);
              setPhase('reveal');
            });
          }, 800);
        }
      });
    }, startDelay);

    return () => {
      clearTimeout(timer);
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [phase, currentIndex, startTyping, orbsContainerOpacity]);

  // Reveal phase - show each orb with its caption
  useEffect(() => {
    if (phase !== 'reveal') return;

    const captions = revealCaptions;
    const currentCaption = captions[currentIndex];
    if (!currentCaption) return;

    startTyping(currentCaption.text, () => {
      // Reveal the corresponding orb
      revealOrb(currentIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (currentIndex < captions.length - 1) {
        const nextTimer = setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, currentCaption.pauseAfter);
        typingRef.current = nextTimer;
      } else {
        // All orbs revealed, move to harmony explanation
        setTimeout(() => {
          setCurrentIndex(0);
          setPhase('harmony');
        }, 1000);
      }
    });

    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [phase, currentIndex, startTyping, revealOrb]);

  // Harmony phase
  useEffect(() => {
    if (phase !== 'harmony') return;

    const captions = harmonyCaptions;
    const currentCaption = captions[currentIndex];
    if (!currentCaption) return;

    startTyping(currentCaption.text, () => {
      if (currentIndex < captions.length - 1) {
        const nextTimer = setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, currentCaption.pauseAfter);
        typingRef.current = nextTimer;
      } else {
        // Move to transition phase
        setTimeout(() => {
          setCurrentIndex(0);
          setPhase('transition');
        }, 800);
      }
    });

    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [phase, currentIndex, startTyping]);

  // Transition phase
  useEffect(() => {
    if (phase !== 'transition') return;

    const captions = transitionCaptions;
    const currentCaption = captions[currentIndex];
    if (!currentCaption) return;

    startTyping(currentCaption.text, () => {
      if (currentIndex < captions.length - 1) {
        const nextTimer = setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, currentCaption.pauseAfter);
        typingRef.current = nextTimer;
      } else {
        // Show continue button, hide skip
        setTimeout(() => {
          setPhase('complete');
          setShowSkip(false);
          setShowButton(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 800);
      }
    });

    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [phase, currentIndex, startTyping]);

  // Handle tap to speed up typing
  const handleTapToSpeed = () => {
    if (isTyping) {
      skipToEnd();
    }
  };

  // Handle skip - go directly to mind extraction
  const handleSkip = () => {
    if (typingRef.current) clearTimeout(typingRef.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowSkip(false);
    router.push('/onboarding/mind-extraction');
  };

  const handleContinue = () => {
    router.push('/onboarding/mind-extraction');
  };

  return (
    <SanctumBackground>
    <SafeAreaView style={styles.container}>
      <OnboardingProgress currentStep="three-lights" />

      <View style={styles.content}>
        {/* Three orbs container - now at top */}
        <Animated.View
          style={[
            styles.orbsContainer,
            { opacity: orbsContainerOpacity },
          ]}
        >
          <Animated.View style={[styles.orbWrapper, { opacity: mindOrbOpacity }]}>
            <Image source={getCompanionImage('Mind', 'Dormant')!} style={styles.companionImage} resizeMode="contain" />
            <Text style={[styles.orbLabel, { color: AppColors.mind }]}>Mind</Text>
          </Animated.View>

          <Animated.View style={[styles.orbWrapper, { opacity: bodyOrbOpacity }]}>
            <Image source={getCompanionImage('Body', 'Dormant')!} style={styles.companionImage} resizeMode="contain" />
            <Text style={[styles.orbLabel, { color: AppColors.body }]}>Body</Text>
          </Animated.View>

          <Animated.View style={[styles.orbWrapper, { opacity: soulOrbOpacity }]}>
            <Image source={getCompanionImage('Soul', 'Dormant')!} style={styles.companionImage} resizeMode="contain" />
            <Text style={[styles.orbLabel, { color: AppColors.soul }]}>Soul</Text>
          </Animated.View>
        </Animated.View>

        {/* Soteria's presence - below orbs */}
        <View style={styles.presenceContainer}>
          <SoteriaPresence
            size={visibleOrbs > 0 ? 'small' : 'medium'}
            intensity="medium"
          />
        </View>

        {/* Caption text - below Soteria */}
        <TouchableOpacity
          style={styles.dialogueBoxContainer}
          onPress={handleTapToSpeed}
          activeOpacity={1}
        >
          <SoteriaDialogueBox
            text={displayedText}
            glowPosition="top"
            isTyping={isTyping}
          />
        </TouchableOpacity>
      </View>

      {/* Skip button */}
      <OnboardingButton
        label="Skip"
        onPress={handleSkip}
        visible={showSkip}
        variant="secondary"
      />

      {/* Continue button */}
      <OnboardingButton
        label="Begin"
        onPress={handleContinue}
        visible={showButton}
      />
    </SafeAreaView>
    </SanctumBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
  orbsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 48,
    paddingHorizontal: 16,
  },
  orbWrapper: {
    alignItems: 'center',
  },
  companionImage: {
    width: 90,
    height: 90,
  },
  orbLabel: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dialogueBoxContainer: {
    width: '100%',
  },
});
