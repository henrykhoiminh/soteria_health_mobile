import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AvatarLightState, RoutineCategory } from '@/types';
import { AppColors } from '@/constants/theme';
import { useIsTabVisible } from '@/lib/contexts/TabVisibilityContext';
import HapticPressable from '@/components/HapticPressable';
import { getCompanionImage } from '@/lib/utils/companion-images';

// Toggle to hide light state labels (e.g. "Glowing", "Dormant") for testing
const HIDE_LIGHT_STATE_LABELS = true;

interface AvatarProps {
  category: RoutineCategory;
  lightState: AvatarLightState;
  onPress?: () => void;
  level?: number;
  progress?: number; // 0-1 fraction for XP bar
  categoryColor?: string;
}

export default function Avatar({ category, lightState, onPress, level, progress, categoryColor }: AvatarProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const subtlePulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const isVisible = useIsTabVisible();

  // Get category-specific colors and icons
  const getCategoryConfig = () => {
    switch (category) {
      case 'Mind':
        return {
          color: '#3B82F6',
          lightColor: '#3B82F650',
          icon: 'bulb-outline' as const,
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
          icon: 'flame' as const,
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

  // Resolve companion image once on mount (random variant stays stable)
  const companionImage = useMemo(() => getCompanionImage(category, lightState), [category, lightState]);

  // Pulse animation for active states — only runs when tab is visible
  useEffect(() => {
    if (stateConfig.pulseEnabled && isVisible) {
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
  }, [lightState, stateConfig.pulseEnabled, isVisible]);

  // Subtle breathing animation for companion images
  useEffect(() => {
    if (companionImage && isVisible) {
      const breathe = Animated.loop(
        Animated.sequence([
          Animated.timing(subtlePulseAnim, {
            toValue: 1.03,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(subtlePulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      breathe.start();
      return () => breathe.stop();
    } else {
      subtlePulseAnim.setValue(1);
    }
  }, [companionImage, isVisible]);

  // Glow animation for active states — only runs when tab is visible
  useEffect(() => {
    if (stateConfig.glowIntensity > 0 && isVisible) {
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
  }, [lightState, stateConfig.glowIntensity, isVisible]);

  return (
    <HapticPressable style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        {companionImage ? (
          <Animated.View style={{ transform: [{ scale: subtlePulseAnim }] }}>
            <Image
              source={companionImage}
              style={styles.companionImage}
              resizeMode="cover"
            />
          </Animated.View>
        ) : (
          <>
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
          </>
        )}
      </View>

      {/* Compact Level Indicator */}
      {level != null && (
        <View style={styles.levelIndicator}>
          <Text style={[styles.levelText, { color: categoryColor || config.color }]}>
            Lv.{level}
          </Text>
          <View style={styles.xpBarBg}>
            <View
              style={[
                styles.xpBarFill,
                {
                  width: `${Math.round((progress ?? 0) * 100)}%`,
                  backgroundColor: categoryColor || config.color,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Light State Status */}
      {!HIDE_LIGHT_STATE_LABELS && (
        <Text style={[styles.statusText, { color: stateConfig.statusColor }]}>
          {stateConfig.statusText}
        </Text>
      )}
    </HapticPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
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
    overflow: 'hidden',
  },
  companionImage: {
    width: 115,
    height: 115,
  },
  levelIndicator: {
    alignItems: 'center',
    marginTop: 4,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  xpBarBg: {
    width: 70,
    height: 4,
    backgroundColor: AppColors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
