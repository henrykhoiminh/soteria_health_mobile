import { AppColors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface OnboardingButtonProps {
  label: string;
  onPress: () => void;
  visible?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary'; // secondary is for skip button
}

export default function OnboardingButton({
  label,
  onPress,
  visible = true,
  disabled = false,
  variant = 'primary',
}: OnboardingButtonProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // Reset scale for pop effect
      scale.setValue(0.8);

      // Haptic feedback when button pops in
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handlePress = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  if (variant === 'secondary') {
    return (
      <Animated.View style={[styles.skipContainer, { opacity }]}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handlePress}
          disabled={disabled}
        >
          <Text style={styles.skipText}>{label}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.button, disabled && styles.buttonDisabled]}
          onPress={handlePress}
          disabled={disabled || !visible}
        >
          <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
            {label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  buttonWrapper: {
    width: '100%',
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
  buttonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  skipContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
