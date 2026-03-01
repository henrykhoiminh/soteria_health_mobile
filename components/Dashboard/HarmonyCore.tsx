import HapticPressable from '@/components/HapticPressable';
import { AppColors } from '@/constants/theme';
import { useIsTabVisible } from '@/lib/contexts/TabVisibilityContext';
import { AvatarState } from '@/types';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface HarmonyCoreProps {
  isInHarmony: boolean;
  avatarStates: AvatarState[];
  onPress: () => void;
}

const CORE_SIZE = 70;
const OUTER_GLOW_SIZE = 120;
const MIDDLE_GLOW_SIZE = 95;

export default function HarmonyCore({ isInHarmony, avatarStates, onPress }: HarmonyCoreProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const glowMultiplier = useRef(new Animated.Value(1.5)).current;
  const isVisible = useIsTabVisible();

  // Count how many companions are Glowing/Radiant
  const activeCount = avatarStates.filter(
    s => s.lightState === 'Glowing' || s.lightState === 'Radiant'
  ).length;

  const coreIntensity = activeCount / 3; // 0, 0.33, 0.67, 1

  useEffect(() => {
    if (!isVisible) return;

    const pulseDuration = isInHarmony ? 1500 : 3000;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: pulseDuration,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: pulseDuration,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.4 + coreIntensity * 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.2 + coreIntensity * 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    glow.start();

    return () => {
      pulse.stop();
      glow.stop();
    };
  }, [isInHarmony, coreIntensity, isVisible]);

  const outerScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const middleScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <HapticPressable
      hapticStyle="selection"
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Outer Glow */}
      <Animated.View
        style={[
          styles.outerGlow,
          {
            opacity: glowAnim,
            transform: [{ scale: outerScale }],
          },
        ]}
      />

      {/* Middle Glow */}
      <Animated.View
        style={[
          styles.middleGlow,
          {
            opacity: Animated.multiply(glowAnim, glowMultiplier),
            transform: [{ scale: middleScale }],
          },
        ]}
      />

      {/* Inner Core */}
      <View style={[
        styles.innerCore,
        isInHarmony && styles.innerCoreHarmony,
      ]} />

      {/* Connection Lines to companions (rendered as thin decorative lines) */}
      {avatarStates.map((state, index) => {
        const angle = (index * 120 - 90) * (Math.PI / 180);
        const lineLength = 55;
        const endX = Math.cos(angle) * lineLength;
        const endY = Math.sin(angle) * lineLength;
        const lineOpacity = getStateOpacity(state.lightState);
        const color = getCategoryColor(state.category);

        return (
          <View
            key={state.category}
            style={[
              styles.connectionLine,
              {
                width: lineLength,
                height: 1,
                backgroundColor: color,
                opacity: lineOpacity,
                transform: [
                  { translateX: endX / 2 },
                  { translateY: endY / 2 },
                  { rotate: `${Math.atan2(endY, endX)}rad` },
                ],
              },
            ]}
          />
        );
      })}
    </HapticPressable>
  );
}

function getStateOpacity(lightState: string): number {
  switch (lightState) {
    case 'Dormant': return 0.1;
    case 'Sleepy': return 0.2;
    case 'Awakening': return 0.3;
    case 'Glowing': return 0.5;
    case 'Radiant': return 0.7;
    default: return 0.1;
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'Mind': return AppColors.mind;
    case 'Body': return AppColors.body;
    case 'Soul': return AppColors.soul;
    default: return AppColors.primary;
  }
}

const styles = StyleSheet.create({
  container: {
    width: OUTER_GLOW_SIZE,
    height: OUTER_GLOW_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerGlow: {
    position: 'absolute',
    width: OUTER_GLOW_SIZE,
    height: OUTER_GLOW_SIZE,
    borderRadius: OUTER_GLOW_SIZE / 2,
    backgroundColor: AppColors.primary + '15',
  },
  middleGlow: {
    position: 'absolute',
    width: MIDDLE_GLOW_SIZE,
    height: MIDDLE_GLOW_SIZE,
    borderRadius: MIDDLE_GLOW_SIZE / 2,
    backgroundColor: AppColors.primary + '25',
  },
  innerCore: {
    width: CORE_SIZE,
    height: CORE_SIZE,
    borderRadius: CORE_SIZE / 2,
    backgroundColor: AppColors.primary + '40',
    borderWidth: 2,
    borderColor: AppColors.primary + '60',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  innerCoreHarmony: {
    backgroundColor: AppColors.primary + '70',
    borderColor: AppColors.primary,
  },
  connectionLine: {
    position: 'absolute',
  },
});
