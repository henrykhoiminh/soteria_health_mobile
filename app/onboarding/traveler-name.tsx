import JourneyBadge from '@/components/JourneyBadge';
import SanctumBackground from '@/components/Dashboard/SanctumBackground';
import { AppColors } from '@/constants/theme';
import { useOnboarding, USERNAME_MAX_LENGTH } from '@/lib/contexts/OnboardingContext';
import { checkUsernameAvailability } from '@/lib/utils/username';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Keyboard, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import OnboardingProgress from './components/OnboardingProgress';
import SoteriaDialogueBox from './components/SoteriaDialogueBox';
import SoteriaPresence from './components/SoteriaPresence';

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

// Screen 11: Traveler Name (Username & Profile Picture)
export default function TravelerNameScreen() {
  const router = useRouter();
  const { data, setUsername, setProfilePictureUri } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputOpacity = useRef(new Animated.Value(0)).current;
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  // Keyboard visibility listener
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardShowListener = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  // Handle image picker
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to add a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePictureUri(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Caption data - ask for username (streamlined for pacing)
  const captions = [
    { text: 'One last thing.', pauseAfter: 600 },
    { text: 'You can find and connect with others also building pain-free lives.', pauseAfter: 600 },
    { text: 'Make it easy for them to find you with a portrait and title.', pauseAfter: 0 },
  ];

  // Username must be valid; profile picture is optional
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
      router.push('/onboarding/the-pact');
    }
  };

  return (
    <SanctumBackground>
    <SafeAreaView style={styles.container}>
      <OnboardingProgress currentStep="traveler-name" />

      {/* Journey badge at top */}
      {data.journeyFocus && (
        <View style={styles.badgeContainer}>
          <JourneyBadge focus={data.journeyFocus} size="sm" />
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            // Center content when keyboard is hidden, align to end when keyboard is visible
            keyboardVisible ? styles.scrollContentKeyboard : styles.scrollContentCentered,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Soteria presence - hide when keyboard is visible */}
          {!keyboardVisible && (
            <View style={styles.presenceContainer}>
              <SoteriaPresence size="small" intensity="low" />
            </View>
          )}

          {/* Caption text - typewriter effect */}
          <View style={styles.dialogueBoxContainer}>
            <SoteriaDialogueBox
              text={displayedText}
              glowPosition="top"
              isTyping={isTyping}
            />
          </View>

          {/* Profile Picture & Username - fades in after typing */}
          <Animated.View style={[styles.inputContainer, { opacity: inputOpacity }]}>
            {showInput && (
              <>
                {/* Profile Picture */}
                <TouchableOpacity
                  style={styles.avatarContainer}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  {data.profilePictureUri ? (
                    <Image
                      source={{ uri: data.profilePictureUri }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={40} color="rgba(255, 255, 255, 0.4)" />
                    </View>
                  )}
                  <View style={styles.cameraIconContainer}>
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.avatarHelperText}>
                  Tap to add a photo (optional)
                </Text>

                {/* Username Input */}
                <View style={styles.usernameSection}>
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
                    This helps friends find you
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
                </View>
              </>
            )}
          </Animated.View>
        </ScrollView>

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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scrollContentCentered: {
    justifyContent: 'center',
    paddingVertical: 24,
  },
  scrollContentKeyboard: {
    justifyContent: 'flex-end',
    paddingTop: 16,
    paddingBottom: 8,
  },
  presenceContainer: {
    marginBottom: 32,
  },
  dialogueBoxContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  // Profile Picture Styles
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: AppColors.primary,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AppColors.background,
  },
  avatarHelperText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 24,
    textAlign: 'center',
  },
  // Username Section
  usernameSection: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
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
    marginTop: 8,
    minHeight: 20,
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
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
