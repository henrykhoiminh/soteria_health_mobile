import JourneyBadge from '@/components/JourneyBadge';
import SanctumBackground from '@/components/Dashboard/SanctumBackground';
import { AppColors } from '@/constants/theme';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import { getMindStateImage, getBodyStateImage, getSoulStateImage } from '@/lib/utils/companion-images';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import OnboardingProgress from './components/OnboardingProgress';
import SoteriaDialogueBox from './components/SoteriaDialogueBox';

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
  const mindImage = useMemo(() => getMindStateImage('Dormant'), []);
  const bodyImage = useMemo(() => getBodyStateImage('Dormant'), []);
  const soulImage = useMemo(() => getSoulStateImage('Dormant'), []);
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  // Caption data - avatars acknowledge the user by name
  const captions = useMemo(() => [
    { text: `${data.mindName}, ${data.bodyName}, and ${data.soulName}.`, pauseAfter: 700 },
    { text: `Meet your guardian, ${data.firstName}.`, pauseAfter: 0 },
  ], [data.mindName, data.bodyName, data.soulName, data.firstName]);

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
  }, [currentIndex, captions, startTyping, buttonOpacity, buttonScale]);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/traveler-name');
  };

  return (
    <SanctumBackground>
    <SafeAreaView style={styles.container}>
      <OnboardingProgress currentStep="introduce-yourself" />

      {/* Journey badge at top */}
      {data.journeyFocus && (
        <View style={styles.badgeContainer}>
          <JourneyBadge focus={data.journeyFocus} size="sm" />
        </View>
      )}

      <View style={styles.content}>
        {/* Three companions - Mind/Body as PNGs, Soul as AvatarOrb */}
        <View style={styles.orbsContainer}>
          <View style={styles.orbWrapper}>
            <Image source={mindImage} style={styles.companionImage} resizeMode="contain" />
            <Text style={[styles.orbLabel, { color: '#3B82F6' }]}>{data.mindName}</Text>
          </View>

          <View style={styles.orbWrapper}>
            <Image source={bodyImage} style={styles.companionImage} resizeMode="contain" />
            <Text style={[styles.orbLabel, { color: '#EF4444' }]}>{data.bodyName}</Text>
          </View>

          <View style={styles.orbWrapper}>
            <Image source={soulImage} style={styles.companionImage} resizeMode="contain" />
            <Text style={[styles.orbLabel, { color: '#F59E0B' }]}>{data.soulName}</Text>
          </View>
        </View>

        {/* Caption text - typewriter effect */}
        <View style={styles.dialogueBoxContainer}>
          <SoteriaDialogueBox
            text={displayedText}
            glowPosition="top"
            isTyping={isTyping}
          />
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
  buttonText: {
    color: AppColors.primaryText,
    fontSize: 18,
    fontWeight: '600',
  },
});
