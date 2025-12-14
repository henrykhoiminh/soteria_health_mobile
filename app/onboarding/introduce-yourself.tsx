import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AvatarOrb from './components/AvatarOrb';
import JourneyBadge from '@/components/JourneyBadge';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import { AppColors } from '@/constants/theme';

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

// Screen 10: Introduce Yourself
export default function IntroduceYourselfScreen() {
  const router = useRouter();
  const { data, setFirstName, setLastName } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showInputs, setShowInputs] = useState(false);
  const inputsOpacity = useRef(new Animated.Value(0)).current;
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  // Caption data - dynamically includes companion names
  const captions = [
    { text: `${data.mindName}, ${data.bodyName}, and ${data.soulName}.`, pauseAfter: 1000 },
    { text: "They're yours now.", pauseAfter: 1200 },
    { text: "But they don't know who you are yet.", pauseAfter: 1200 },
    { text: 'Introduce yourself.', pauseAfter: 0 },
  ];

  const isValid = data.firstName.trim().length > 0 && data.lastName.trim().length > 0;

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
        // All captions complete - show inputs
        const completeTimer = setTimeout(() => {
          setShowInputs(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.timing(inputsOpacity, {
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
  }, [currentIndex, startTyping, inputsOpacity]);

  const handleContinue = () => {
    if (isValid) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/onboarding/traveler-name');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Journey badge at top */}
      {data.journeyFocus && (
        <View style={styles.badgeContainer}>
          <JourneyBadge focus={data.journeyFocus} size="sm" />
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
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

            {/* Name inputs - fade in after typing */}
            <Animated.View style={[styles.inputsContainer, { opacity: inputsOpacity }]}>
              {showInputs && (
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
          </View>
        </ScrollView>

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
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
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
    alignItems: 'flex-start',
    gap: 20,
    marginBottom: 32,
  },
  captionContainer: {
    width: '100%',
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
  inputsContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 12,
    minHeight: 120,
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
