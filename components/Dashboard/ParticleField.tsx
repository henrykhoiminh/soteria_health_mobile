import { AppColors } from '@/constants/theme';
import { useIsTabVisible } from '@/lib/contexts/TabVisibilityContext';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const PARTICLE_COUNT = 12;

const PARTICLE_COLORS = [
  AppColors.primary,    // gold
  AppColors.primary,    // gold
  AppColors.primary,    // gold
  AppColors.primary,    // gold
  AppColors.primary,    // gold
  AppColors.primary,    // gold
  AppColors.primary,    // gold
  AppColors.mind,       // blue
  AppColors.mind,       // blue
  AppColors.body,       // red
  AppColors.body,       // red
  AppColors.soul,       // amber
];

interface Particle {
  anim: Animated.Value;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

export default function ParticleField() {
  const isVisible = useIsTabVisible();
  const particles = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      anim: new Animated.Value(0),
      x: Math.random() * 100,
      y: 40 + Math.random() * 200,
      size: 2 + Math.random() * 3,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      duration: 3000 + Math.random() * 2000,
      delay: i * 250 + Math.random() * 500,
    }))
  ).current;

  useEffect(() => {
    if (!isVisible) return;

    const animations = particles.map((particle) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(particle.delay),
          Animated.timing(particle.anim, {
            toValue: 1,
            duration: particle.duration,
            useNativeDriver: true,
          }),
          Animated.timing(particle.anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return loop;
    });

    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, [isVisible]);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle, index) => {
        const opacity = particle.anim.interpolate({
          inputRange: [0, 0.3, 0.7, 1],
          outputRange: [0, 0.7, 0.7, 0],
        });

        const translateY = particle.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -80],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: `${particle.x}%`,
                bottom: particle.y,
                width: particle.size,
                height: particle.size,
                borderRadius: particle.size / 2,
                backgroundColor: particle.color,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
  },
});
