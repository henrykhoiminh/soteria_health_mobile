import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Image, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';

// Conditionally import Rive - will use fallback if not available or no .riv file
let Rive: any = null;
let RiveRef: any = null;
try {
  const riveModule = require('rive-react-native');
  Rive = riveModule.default;
  RiveRef = riveModule.RiveRef;
} catch (e) {
  // Rive not available, will use fallback
}

// Light state levels for Rive state machine
const LIGHT_STATE_LEVELS: Record<LightState, number> = {
  Dormant: 0,
  Sleepy: 1,
  Awakening: 2,
  Glowing: 3,
  Radiant: 4,
};

// Category colors
const CATEGORY_COLORS = {
  Mind: '#3B82F6',
  Body: '#EF4444',
  Soul: '#F59E0B',
};

// Category icons for icon fallback
const CATEGORY_ICONS: Record<Category, keyof typeof Ionicons.glyphMap> = {
  Mind: 'bulb',
  Body: 'body',
  Soul: 'heart',
};

// Static image requires for each companion state
// React Native requires static paths at bundle time
// Images will be undefined until files are added to assets/companions/
const COMPANION_IMAGES: Record<Category, Record<LightState, ImageSourcePropType | null>> = {
  Mind: {
    Dormant: safeRequire(() => require('@/assets/companions/mind/dormant.png')),
    Sleepy: safeRequire(() => require('@/assets/companions/mind/sleepy.png')),
    Awakening: safeRequire(() => require('@/assets/companions/mind/awakening.png')),
    Glowing: safeRequire(() => require('@/assets/companions/mind/glowing.png')),
    Radiant: safeRequire(() => require('@/assets/companions/mind/radiant.png')),
  },
  Body: {
    Dormant: safeRequire(() => require('@/assets/companions/body/dormant.png')),
    Sleepy: safeRequire(() => require('@/assets/companions/body/sleepy.png')),
    Awakening: safeRequire(() => require('@/assets/companions/body/awakening.png')),
    Glowing: safeRequire(() => require('@/assets/companions/body/glowing.png')),
    Radiant: safeRequire(() => require('@/assets/companions/body/radiant.png')),
  },
  Soul: {
    Dormant: safeRequire(() => require('@/assets/companions/soul/dormant.png')),
    Sleepy: safeRequire(() => require('@/assets/companions/soul/sleepy.png')),
    Awakening: safeRequire(() => require('@/assets/companions/soul/awakening.png')),
    Glowing: safeRequire(() => require('@/assets/companions/soul/glowing.png')),
    Radiant: safeRequire(() => require('@/assets/companions/soul/radiant.png')),
  },
};

// Helper to safely require images that may not exist yet
function safeRequire(requireFn: () => ImageSourcePropType): ImageSourcePropType | null {
  try {
    return requireFn();
  } catch (e) {
    return null;
  }
}

export type Category = 'Mind' | 'Body' | 'Soul';
export type LightState = 'Dormant' | 'Sleepy' | 'Awakening' | 'Glowing' | 'Radiant';

interface CompanionAvatarProps {
  category: Category;
  lightState: LightState;
  size?: number;
  onPress?: () => void;
  disabled?: boolean;
  // Set to true to force using icon fallback even if images exist
  useIconFallback?: boolean;
  // Set to true to use Rive animations (when available)
  useRive?: boolean;
  // Custom name for the companion (optional)
  name?: string;
}

export default function CompanionAvatar({
  category,
  lightState,
  size = 80,
  onPress,
  disabled = false,
  useIconFallback = false,
  useRive = false,
  name,
}: CompanionAvatarProps) {
  const riveRef = useRef<typeof RiveRef>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [riveError, setRiveError] = useState(false);
  const [imageError, setImageError] = useState(false);

  const color = CATEGORY_COLORS[category];
  const lightLevel = LIGHT_STATE_LEVELS[lightState];

  // Get static image for current state
  const stateImage = COMPANION_IMAGES[category]?.[lightState];
  const hasStaticImage = stateImage !== null && !imageError;

  // Animate glow based on light state
  useEffect(() => {
    const glowOpacity = lightLevel * 0.2; // 0, 0.2, 0.4, 0.6, 0.8
    Animated.timing(glowAnim, {
      toValue: glowOpacity,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [lightLevel]);

  // Pulse animation for Glowing and Radiant states
  useEffect(() => {
    if (lightState === 'Glowing' || lightState === 'Radiant') {
      const duration = lightState === 'Radiant' ? 1000 : 1500;
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [lightState]);

  // Update Rive state machine when light state changes
  useEffect(() => {
    if (riveRef.current && useRive && !riveError) {
      try {
        riveRef.current.setInputState('CompanionState', 'lightLevel', lightLevel);
      } catch (e) {
        // State machine input not found, ignore
      }
    }
  }, [lightState, useRive, riveError]);

  const handlePress = () => {
    if (disabled) return;

    // Trigger tap animation in Rive
    if (riveRef.current && useRive && !riveError) {
      try {
        riveRef.current.fireState('CompanionState', 'userTapped');
      } catch (e) {
        // Trigger not found, ignore
      }
    }

    // Trigger press animation
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.15,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    onPress?.();
  };

  // Determine opacity based on light state (for icon fallback)
  const getOpacity = () => {
    switch (lightState) {
      case 'Dormant':
        return 0.3;
      case 'Sleepy':
        return 0.5;
      case 'Awakening':
        return 0.7;
      case 'Glowing':
        return 0.9;
      case 'Radiant':
        return 1;
      default:
        return 0.5;
    }
  };

  // Determine which rendering mode to use
  // Priority: Rive > Static Images > Icon Fallback
  const shouldUseRive = Rive && useRive && !riveError;
  const shouldUseStaticImage = !shouldUseRive && hasStaticImage && !useIconFallback;

  let content: React.ReactNode;

  if (shouldUseRive) {
    // Rive animation
    content = (
      <Rive
        ref={riveRef}
        resourceName={`companion_${category.toLowerCase()}`}
        stateMachineName="CompanionState"
        autoplay={true}
        style={{ width: size, height: size }}
        onError={() => setRiveError(true)}
      />
    );
  } else if (shouldUseStaticImage && stateImage) {
    // Static image for current state
    content = (
      <Animated.View
        style={[
          styles.imageContainer,
          {
            width: size,
            height: size,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {/* Glow effect behind image */}
        <Animated.View
          style={[
            styles.glowEffect,
            {
              width: size * 1.3,
              height: size * 1.3,
              borderRadius: (size * 1.3) / 2,
              backgroundColor: color,
              opacity: glowAnim,
            },
          ]}
        />
        <Image
          source={stateImage}
          style={{
            width: size,
            height: size,
          }}
          resizeMode="contain"
          onError={() => setImageError(true)}
        />
      </Animated.View>
    );
  } else {
    // Icon fallback
    content = (
      <Animated.View
        style={[
          styles.fallbackContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
            opacity: getOpacity(),
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {/* Glow effect */}
        <Animated.View
          style={[
            styles.glowEffect,
            {
              width: size * 1.3,
              height: size * 1.3,
              borderRadius: (size * 1.3) / 2,
              backgroundColor: color,
              opacity: glowAnim,
            },
          ]}
        />
        {/* Icon */}
        <Ionicons
          name={CATEGORY_ICONS[category]}
          size={size * 0.4}
          color={color}
        />
      </Animated.View>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <>{content}</>;
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderWidth: 2,
  },
  glowEffect: {
    position: 'absolute',
    zIndex: -1,
  },
});
