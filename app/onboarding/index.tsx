import { AppColors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';

// Screen 1: Value Prop
export default function ValuePropScreen() {
  const router = useRouter();
  const { resetOnboarding } = useOnboarding();
  const [showButton, setShowButton] = useState(false);
  const [skipped, setSkipped] = useState(false);

  // Reset onboarding context when entering this screen
  // This ensures a clean slate for new users and users who reset their journey
  useEffect(() => {
    resetOnboarding();
  }, []);

  // Animation values
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineTranslateY = useRef(new Animated.Value(20)).current;
  const subheadlineOpacity = useRef(new Animated.Value(0)).current;
  const subheadlineTranslateY = useRef(new Animated.Value(20)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;

  const skipToEnd = () => {
    if (showButton) return; // Already complete
    setSkipped(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Immediately show everything
    headlineOpacity.setValue(1);
    headlineTranslateY.setValue(0);
    subheadlineOpacity.setValue(1);
    subheadlineTranslateY.setValue(0);
    buttonOpacity.setValue(1);
    buttonScale.setValue(1);
    setShowButton(true);
  };

  useEffect(() => {
    if (skipped) return;

    // Sequence: headline fades in, then subheadline, then button pops
    const animationSequence = async () => {
      // Brief pause before starting
      await new Promise(resolve => setTimeout(resolve, 300));

      // Fade in headline (1 second)
      Animated.parallel([
        Animated.timing(headlineOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(headlineTranslateY, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();

      // Wait 0.8 seconds, then fade in subheadline
      await new Promise(resolve => setTimeout(resolve, 800));
      if (skipped) return;

      Animated.parallel([
        Animated.timing(subheadlineOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(subheadlineTranslateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();

      // Wait 1.2 seconds after subheadline, then pop in button with haptic
      await new Promise(resolve => setTimeout(resolve, 1200));
      if (skipped) return;

      setShowButton(true);

      // Trigger haptic feedback when button appears
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    };

    animationSequence();
  }, [skipped]);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/finding-soteria');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.content} onPress={skipToEnd}>
        {/* Unified width container for visual alignment */}
        <View style={styles.textContainer}>
          <Animated.Text
            style={[
              styles.headline,
              {
                opacity: headlineOpacity,
                transform: [{ translateY: headlineTranslateY }],
              },
            ]}
          >
            A pain-free life.
          </Animated.Text>
          <Animated.Text
            style={[
              styles.subheadline,
              {
                opacity: subheadlineOpacity,
                transform: [{ translateY: subheadlineTranslateY }],
              },
            ]}
          >
            Built through mind, body, and soul.
          </Animated.Text>

          {/* Button in the middle, below the text */}
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: buttonOpacity,
                transform: [{ scale: buttonScale }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.button}
              onPress={handleStart}
              disabled={!showButton}
            >
              <Text style={styles.buttonText}>Start Your Journey</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Pressable>
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
    padding: 32,
  },
  textContainer: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  headline: {
    width: '100%',
    fontSize: 43,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subheadline: {
    width: '100%',
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 28,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 48,
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
