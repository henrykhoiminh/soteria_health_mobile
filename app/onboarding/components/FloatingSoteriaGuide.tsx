import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Soteria's color - warm golden glow
const SOTERIA_COLOR = '#FFD700';
const SOTERIA_COLOR_LIGHT = 'rgba(255, 215, 0, 0.3)';

type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'left' | 'right' | 'bottom-center';
type PointingDirection = 'up' | 'down' | 'left' | 'right' | 'none';

interface FloatingSoteriaGuideProps {
  position: Position;
  pointingDirection?: PointingDirection;
  size?: 'small' | 'medium';
  visible: boolean;
}

// Calculate target position based on position prop
const getTargetPosition = (position: Position) => {
  const padding = 40;
  const orbSize = 70;

  switch (position) {
    case 'top-left':
      return { x: padding, y: 140 };
    case 'top-right':
      return { x: SCREEN_WIDTH - orbSize - padding, y: 140 };
    case 'bottom-left':
      return { x: padding, y: SCREEN_HEIGHT - 280 };
    case 'bottom-right':
      return { x: SCREEN_WIDTH - orbSize - padding, y: SCREEN_HEIGHT - 280 };
    case 'bottom-center':
      return { x: SCREEN_WIDTH / 2 - orbSize / 2, y: SCREEN_HEIGHT - 320 };
    case 'left':
      return { x: padding, y: SCREEN_HEIGHT / 2 - 150 };
    case 'right':
      return { x: SCREEN_WIDTH - orbSize - padding, y: SCREEN_HEIGHT / 2 - 150 };
    case 'center':
    default:
      return { x: SCREEN_WIDTH / 2 - orbSize / 2, y: SCREEN_HEIGHT / 2 - 200 };
  }
};

export default function FloatingSoteriaGuide({
  position,
  pointingDirection = 'none',
  size = 'small',
  visible,
}: FloatingSoteriaGuideProps) {
  // Position animation
  const positionX = useRef(new Animated.Value(getTargetPosition(position).x)).current;
  const positionY = useRef(new Animated.Value(getTargetPosition(position).y)).current;

  // Visibility animation
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(visible ? 1 : 0.8)).current;

  // Pulsing animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  // Pointing/bobbing animation
  const bobAnim = useRef(new Animated.Value(0)).current;

  // Get size dimensions
  const dimensions = size === 'small' ? { outer: 70, inner: 44 } : { outer: 90, inner: 54 };

  // Handle visibility changes
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: visible ? 1 : 0.8,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  // Handle position changes
  useEffect(() => {
    const target = getTargetPosition(position);
    Animated.parallel([
      Animated.spring(positionX, {
        toValue: target.x,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(positionY, {
        toValue: target.y,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [position]);

  // Pulsing and glow animations
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 3000,
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
  }, []);

  // Pointing/bobbing animation based on direction
  useEffect(() => {
    if (pointingDirection === 'none') {
      bobAnim.setValue(0);
      return;
    }

    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: 10,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    bob.start();

    return () => bob.stop();
  }, [pointingDirection]);

  // Calculate bob transform based on direction
  const getBobTransform = () => {
    switch (pointingDirection) {
      case 'up':
        return { translateY: Animated.multiply(bobAnim, -1) };
      case 'down':
        return { translateY: bobAnim };
      case 'left':
        return { translateX: Animated.multiply(bobAnim, -1) };
      case 'right':
        return { translateX: bobAnim };
      default:
        return {};
    }
  };

  const bobTransform = getBobTransform();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [
            { translateX: positionX },
            { translateY: positionY },
            { scale },
            ...(bobTransform.translateX ? [{ translateX: bobTransform.translateX }] : []),
            ...(bobTransform.translateY ? [{ translateY: bobTransform.translateY }] : []),
          ],
        },
      ]}
      pointerEvents="none"
    >
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 500, // Above overlay (which is z-index 10)
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
