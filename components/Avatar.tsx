import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AvatarLightState, RoutineCategory } from '@/types';
import { AppColors } from '@/constants/theme';

interface AvatarProps {
  category: RoutineCategory;
  lightState: AvatarLightState;
}

export default function Avatar({ category, lightState }: AvatarProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Get category-specific colors and icons
  const getCategoryConfig = () => {
    switch (category) {
      case 'Mind':
        return {
          color: '#3B82F6',
          lightColor: '#3B82F650',
          icon: 'fitness' as const,
          label: 'Mind',
        };
      case 'Body':
        return {
          color: '#EF4444',
          lightColor: '#EF444450',
          icon: 'body' as const,
          label: 'Body',
        };
      case 'Soul':
        return {
          color: '#F59E0B',
          lightColor: '#F59E0B50',
          icon: 'heart' as const,
          label: 'Soul',
        };
    }
  };

  const config = getCategoryConfig();

  // Get visual properties based on light state
  const getLightStateConfig = () => {
    switch (lightState) {
      case 'Dormant':
        return {
          opacity: 0.3,
          glowIntensity: 0,
          pulseEnabled: false,
          statusText: 'Dormant',
          statusColor: AppColors.textTertiary,
        };
      case 'Sleepy':
        return {
          opacity: 0.5,
          glowIntensity: 0.15,
          pulseEnabled: true,
          statusText: 'Sleepy',
          statusColor: config.color,
        };
      case 'Awakening':
        return {
          opacity: 0.6,
          glowIntensity: 0.3,
          pulseEnabled: true,
          statusText: 'Awakening',
          statusColor: config.color,
        };
      case 'Glowing':
        return {
          opacity: 0.85,
          glowIntensity: 0.6,
          pulseEnabled: true,
          statusText: 'Glowing',
          statusColor: config.color,
        };
      case 'Radiant':
        return {
          opacity: 1,
          glowIntensity: 1,
          pulseEnabled: true,
          statusText: 'Radiant',
          statusColor: config.color,
        };
    }
  };

  const stateConfig = getLightStateConfig();

  // Pulse animation for active states
  useEffect(() => {
    if (stateConfig.pulseEnabled) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [lightState, stateConfig.pulseEnabled]);

  // Glow animation for active states
  useEffect(() => {
    if (stateConfig.glowIntensity > 0) {
      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: stateConfig.glowIntensity,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: stateConfig.glowIntensity * 0.5,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      );
      glowAnimation.start();

      return () => glowAnimation.stop();
    } else {
      glowAnim.setValue(0);
    }
  }, [lightState, stateConfig.glowIntensity]);

  return (
    <View style={styles.container}>
      {/* Avatar Circle with Glow */}
      <View style={styles.avatarWrapper}>
        {/* Outer Glow Effect */}
        {stateConfig.glowIntensity > 0 && (
          <Animated.View
            style={[
              styles.glowRing,
              {
                borderColor: config.color,
                opacity: glowAnim,
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.2],
                    }),
                  },
                ],
              },
            ]}
          />
        )}

        {/* Main Avatar Circle */}
        <Animated.View
          style={[
            styles.avatarCircle,
            {
              backgroundColor: config.lightColor,
              borderColor: config.color,
              opacity: stateConfig.opacity,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Ionicons
            name={config.icon}
            size={40}
            color={config.color}
            style={{ opacity: stateConfig.opacity }}
          />
        </Animated.View>
      </View>

      {/* Category Label */}
      <Text style={styles.label}>{config.label}</Text>

      {/* Light State Status */}
      <Text style={[styles.statusText, { color: stateConfig.statusColor }]}>
        {stateConfig.statusText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  glowRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    top: -10,
    left: -10,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
