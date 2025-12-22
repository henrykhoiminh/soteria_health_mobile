import { AppColors } from '@/constants/theme';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

// Define the onboarding segments and their steps
export const ONBOARDING_SEGMENTS = [
  {
    name: 'Welcome',
    steps: ['index', 'finding-soteria'],
  },
  {
    name: 'Discovery',
    steps: ['journey-focus', 'three-lights'],
  },
  {
    name: 'Extraction',
    steps: ['mind-extraction', 'body-extraction', 'soul-extraction'],
  },
  {
    name: 'Identity',
    steps: ['introduce-yourself', 'traveler-name'],
  },
  {
    name: 'Bond',
    steps: ['the-pact'],
  },
] as const;

// Flatten steps for backwards compatibility
export const ONBOARDING_STEPS = ONBOARDING_SEGMENTS.flatMap(s => s.steps);

export type OnboardingStep = typeof ONBOARDING_STEPS[number];

// Get step index from screen name
export function getStepIndex(screenName: string): number {
  const index = ONBOARDING_STEPS.indexOf(screenName as OnboardingStep);
  return index === -1 ? 0 : index;
}

// Get which segment a step belongs to
export function getSegmentIndex(screenName: string): number {
  for (let i = 0; i < ONBOARDING_SEGMENTS.length; i++) {
    if (ONBOARDING_SEGMENTS[i].steps.includes(screenName as any)) {
      return i;
    }
  }
  return 0;
}

// Get progress within current segment (0-1)
export function getSegmentProgress(screenName: string): number {
  const segmentIndex = getSegmentIndex(screenName);
  const segment = ONBOARDING_SEGMENTS[segmentIndex];
  const stepInSegment = segment.steps.indexOf(screenName as any);
  if (stepInSegment === -1 || segment.steps.length <= 1) return 1;
  return (stepInSegment + 1) / segment.steps.length;
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
  const currentSegmentIndex = getSegmentIndex(currentStep);
  const segmentProgress = getSegmentProgress(currentStep);
  const opacity = useRef(new Animated.Value(0)).current;
  const segmentAnimations = useRef(
    ONBOARDING_SEGMENTS.map(() => new Animated.Value(0))
  ).current;

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
    // Animate each segment
    ONBOARDING_SEGMENTS.forEach((_, index) => {
      let targetValue = 0;

      if (index < currentSegmentIndex) {
        // Completed segments are fully filled
        targetValue = 1;
      } else if (index === currentSegmentIndex) {
        // Current segment shows progress within it
        targetValue = segmentProgress;
      }
      // Future segments stay at 0

      Animated.timing(segmentAnimations[index], {
        toValue: targetValue,
        duration: 400,
        useNativeDriver: false,
      }).start();
    });
  }, [currentStep, currentSegmentIndex, segmentProgress]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.segmentsContainer}>
        {ONBOARDING_SEGMENTS.map((segment, index) => (
          <View key={segment.name} style={styles.segmentWrapper}>
            <View style={styles.segmentTrack}>
              <Animated.View
                style={[
                  styles.segmentFill,
                  {
                    width: segmentAnimations[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        ))}
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
  segmentsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentWrapper: {
    flex: 1,
  },
  segmentTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    backgroundColor: AppColors.primary,
    borderRadius: 2,
  },
});
