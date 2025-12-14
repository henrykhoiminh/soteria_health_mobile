import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import SoteriaPresence from './components/SoteriaPresence';
import JourneyBadge from '@/components/JourneyBadge';
import { useOnboarding, USERNAME_MAX_LENGTH } from '@/lib/contexts/OnboardingContext';
import { checkUsernameAvailability } from '@/lib/utils/username';
import { AppColors } from '@/constants/theme';

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

// Screen 11: Traveler Name (Username)
export default function TravelerNameScreen() {
  const router = useRouter();
  const { data, setUsername } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const inputOpacity = useRef(new Animated.Value(0)).current;
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  // Caption data - dynamically includes user's name
  const captions = [
    { text: `Perfect. ${data.firstName} ${data.lastName}.`, pauseAfter: 1200 },
    { text: 'Now — one more thing.', pauseAfter: 1000 },
    { text: "You're not alone in this world.", pauseAfter: 1000 },
    { text: 'Other travelers walk these paths.', pauseAfter: 1000 },
    { text: 'They share routines. Form Circles.', pauseAfter: 1000 },
    { text: 'Some might become companions on your journey.', pauseAfter: 1200 },
    { text: 'What should they call you?', pauseAfter: 0 },
  ];

  const isValid = data.username.trim().length >= 3 && isAvailable === true;

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
        // All captions complete - show input
        const completeTimer = setTimeout(() => {
          setShowInput(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.timing(inputOpacity, {
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
  }, [currentIndex, startTyping, inputOpacity]);

  const handleUsernameChange = async (value: string) => {
    // Only allow alphanumeric and underscores
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(sanitized);
    setError(null);
    setIsAvailable(null);

    if (sanitized.length >= 3) {
      setChecking(true);
      try {
        const result = await checkUsernameAvailability(sanitized);
        setIsAvailable(result.isAvailable);
        if (!result.isAvailable) {
          setError(result.error || 'Username is already taken');
        }
      } catch (e) {
        setError('Unable to check username');
      } finally {
        setChecking(false);
      }
    }
  };

  const handleContinue = () => {
    if (isValid) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/onboarding/the-bond');
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
        <View style={styles.content}>
          {/* Soteria presence */}
          <View style={styles.presenceContainer}>
            <SoteriaPresence size="small" intensity="low" />
          </View>

          {/* Caption text - typewriter effect */}
          <View style={styles.captionContainer}>
            <Text style={styles.captionText}>
              {displayedText}
              {isTyping && <Text style={styles.cursor}>|</Text>}
            </Text>
          </View>

          {/* Username input - fades in after typing */}
          <Animated.View style={[styles.inputContainer, { opacity: inputOpacity }]}>
            {showInput && (
              <>
                <TextInput
                  style={[
                    styles.input,
                    error && styles.inputError,
                    isAvailable && styles.inputValid,
                  ]}
                  value={data.username}
                  onChangeText={handleUsernameChange}
                  placeholder="username"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={USERNAME_MAX_LENGTH}
                  autoFocus={true}
                />
                <Text style={styles.helperText}>
                  This is how other travelers will know you
                </Text>

                {/* Status indicators */}
                <View style={styles.statusContainer}>
                  {checking && (
                    <View style={styles.statusRow}>
                      <ActivityIndicator size="small" color={AppColors.primary} />
                      <Text style={styles.statusText}>Checking availability...</Text>
                    </View>
                  )}
                  {error && (
                    <Text style={styles.errorText}>{error}</Text>
                  )}
                  {isAvailable && !checking && (
                    <Text style={styles.successText}>Username is available!</Text>
                  )}
                </View>
              </>
            )}
          </Animated.View>
        </View>

        {/* Continue button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!isValid || checking}
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  presenceContainer: {
    marginBottom: 24,
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
  inputContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    minHeight: 140,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputValid: {
    borderColor: '#34C759',
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
    textAlign: 'center',
  },
  statusContainer: {
    marginTop: 12,
    minHeight: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
  },
  successText: {
    fontSize: 14,
    color: '#34C759',
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
