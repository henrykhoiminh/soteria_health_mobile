import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { RoutineCategory } from '@/types';

// Category colors
const CATEGORY_COLORS = {
  Mind: '#3B82F6', // Blue
  Body: '#EF4444', // Red/Coral
  Soul: '#F59E0B', // Amber
};

const CATEGORY_COLORS_LIGHT = {
  Mind: 'rgba(59, 130, 246, 0.2)',
  Body: 'rgba(239, 68, 68, 0.2)',
  Soul: 'rgba(245, 158, 11, 0.2)',
};

interface AvatarOrbProps {
  type: RoutineCategory;
  name?: string;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
  animate?: boolean;
  state?: 'dormant' | 'sleepy' | 'awakening' | 'glowing' | 'radiant';
}

export default function AvatarOrb({
  type,
  name,
  size = 'medium',
  showName = false,
  animate = true,
  state = 'glowing',
}: AvatarOrbProps) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const color = CATEGORY_COLORS[type];
  const colorLight = CATEGORY_COLORS_LIGHT[type];

  // Get size dimensions
  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { orb: 60, icon: 28, glow: 80 };
      case 'large':
        return { orb: 120, icon: 56, glow: 160 };
      case 'medium':
      default:
        return { orb: 90, icon: 42, glow: 120 };
    }
  };

  // Get icon for category (matches dashboard Avatar component)
  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'Mind':
        return 'bulb-outline';
      case 'Body':
        return 'body';
      case 'Soul':
        return 'flame';
      default:
        return 'ellipse';
    }
  };

  // Get opacity based on state
  const getStateOpacity = () => {
    switch (state) {
      case 'dormant':
        return 0.3;
      case 'sleepy':
        return 0.5;
      case 'awakening':
        return 0.7;
      case 'glowing':
        return 0.9;
      case 'radiant':
        return 1;
      default:
        return 0.9;
    }
  };

  useEffect(() => {
    if (!animate) return;

    // Floating animation
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    float.start();
    pulse.start();

    return () => {
      float.stop();
      pulse.stop();
    };
  }, [animate]);

  // Animate opacity when state changes
  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: getStateOpacity(),
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [state]);

  const dimensions = getDimensions();

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.orbContainer,
          {
            transform: [
              { translateY: animate ? floatAnim : 0 },
              { scale: animate ? pulseAnim : 1 },
            ],
            opacity: opacityAnim,
          },
        ]}
      >
        {/* Outer glow */}
        <View
          style={[
            styles.glow,
            {
              width: dimensions.glow,
              height: dimensions.glow,
              borderRadius: dimensions.glow / 2,
              backgroundColor: colorLight,
            },
          ]}
        />

        {/* Main orb */}
        <View
          style={[
            styles.orb,
            {
              width: dimensions.orb,
              height: dimensions.orb,
              borderRadius: dimensions.orb / 2,
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
        >
          <Ionicons name={getIcon()} size={dimensions.icon} color="#FFFFFF" />
        </View>
      </Animated.View>

      {/* Name label */}
      {showName && name && (
        <Text style={[styles.name, { color }]}>{name}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  orbContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
  },
  orb: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  name: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
  },
});
