import { AppColors } from '@/constants/theme';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

// Define the onboarding steps for new users
export const ONBOARDING_STEPS = [
  'index',           // 0: Value prop
  'finding-soteria', // 1: Meet Soteria + Journey selection
  'world-intro',     // 2: World introduction
  'three-lights',    // 3: Mind/Body/Soul introduction
  'the-offer',       // 4: Avatar mechanic explanation
  'mind-extraction', // 5: Name Mind
  'body-extraction', // 6: Name Body
  'soul-extraction', // 7: Name Soul
  'introduce-yourself', // 8: Enter name
  'traveler-name',   // 9: Choose username
  'the-bond',        // 10: Avatar bond explanation
  'the-pact',        // 11: Commitment
  'the-beginning',   // 12: Finale
] as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[number];

// Get step index from screen name
export function getStepIndex(screenName: string): number {
  const index = ONBOARDING_STEPS.indexOf(screenName as OnboardingStep);
  return index === -1 ? 0 : index;
}

// Get progress percentage (0-1)
export function getProgress(screenName: string): number {
  const index = getStepIndex(screenName);
  return index / (ONBOARDING_STEPS.length - 1);
}

interface OnboardingProgressProps {
  currentStep: string;
  showFromStep?: number; // Don't show progress bar until this step (default: 1)
}

export default function OnboardingProgress({
  currentStep,
  showFromStep = 1
}: OnboardingProgressProps) {
  const stepIndex = getStepIndex(currentStep);
  const progress = getProgress(currentStep);
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Don't render if before showFromStep
  if (stepIndex < showFromStep) {
    return null;
  }

  useEffect(() => {
    // Fade in on first appearance
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, []);

  useEffect(() => {
    // Animate progress bar width
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  track: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: AppColors.primary,
    borderRadius: 2,
  },
});
