import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { AppColors } from '@/constants/theme';

interface SoteriaPresenceProps {
  size?: 'small' | 'medium' | 'large';
  intensity?: 'low' | 'medium' | 'high';
}

// Soteria's color - warm golden glow
const SOTERIA_COLOR = '#FFD700';
const SOTERIA_COLOR_LIGHT = 'rgba(255, 215, 0, 0.3)';

export default function SoteriaPresence({
  size = 'medium',
  intensity = 'medium',
}: SoteriaPresenceProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  // Get size dimensions
  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { outer: 80, inner: 50 };
      case 'large':
        return { outer: 200, inner: 120 };
      case 'medium':
      default:
        return { outer: 140, inner: 80 };
    }
  };

  // Get animation speed based on intensity
  const getAnimationDuration = () => {
    switch (intensity) {
      case 'low':
        return 3000;
      case 'high':
        return 1500;
      case 'medium':
      default:
        return 2000;
    }
  };

  useEffect(() => {
    // Pulsing animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: getAnimationDuration(),
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: getAnimationDuration(),
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Glow intensity animation
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: getAnimationDuration() * 1.5,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: getAnimationDuration() * 1.5,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    glow.start();

    return () => {
      pulse.stop();
      glow.stop();
    };
  }, [intensity]);

  const dimensions = getDimensions();

  return (
    <View style={styles.container}>
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.outerGlow,
          {
            width: dimensions.outer,
            height: dimensions.outer,
            borderRadius: dimensions.outer / 2,
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Middle glow */}
      <Animated.View
        style={[
          styles.middleGlow,
          {
            width: dimensions.outer * 0.75,
            height: dimensions.outer * 0.75,
            borderRadius: (dimensions.outer * 0.75) / 2,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Inner core */}
      <Animated.View
        style={[
          styles.innerCore,
          {
            width: dimensions.inner,
            height: dimensions.inner,
            borderRadius: dimensions.inner / 2,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerGlow: {
    position: 'absolute',
    backgroundColor: SOTERIA_COLOR_LIGHT,
  },
  middleGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 215, 0, 0.4)',
  },
  innerCore: {
    backgroundColor: SOTERIA_COLOR,
    shadowColor: SOTERIA_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
});
