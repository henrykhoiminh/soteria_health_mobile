import Avatar from '@/components/Avatar';
import { AvatarLightState, RoutineCategory } from '@/types';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface OrbitingCompanionProps {
  category: RoutineCategory;
  lightState: AvatarLightState;
  positionIndex: number; // 0=Mind(top), 1=Body(bottom-left), 2=Soul(bottom-right)
  orbitRadius: number;
  centerX: number;
  centerY: number;
  onPress: () => void;
}

// Position angles: Mind at top (270deg), Body at bottom-left (150deg), Soul at bottom-right (30deg)
const POSITION_ANGLES = [270, 150, 30];
const COMPANION_WIDTH = 100;
const COMPANION_HEIGHT = 120; // Avatar circle (80) + label + status

export default function OrbitingCompanion({
  category,
  lightState,
  positionIndex,
  orbitRadius,
  centerX,
  centerY,
  onPress,
}: OrbitingCompanionProps) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000 + positionIndex * 300,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000 + positionIndex * 300,
          useNativeDriver: true,
        }),
      ])
    );
    float.start();

    return () => float.stop();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  // Calculate position from center of orbital system
  const angle = POSITION_ANGLES[positionIndex] * (Math.PI / 180);
  const left = centerX + Math.cos(angle) * orbitRadius - COMPANION_WIDTH / 2;
  const top = centerY + Math.sin(angle) * orbitRadius - COMPANION_HEIGHT / 2;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left,
          top,
          transform: [{ translateY }],
        },
      ]}
    >
      <Avatar
        category={category}
        lightState={lightState}
        onPress={onPress}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    width: COMPANION_WIDTH,
  },
});
