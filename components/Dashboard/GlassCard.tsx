import { AppColors } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

interface GlassCardProps {
  children: React.ReactNode;
  title?: string;
}

export default function GlassCard({ children }: GlassCardProps) {
  const edgeGlow = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(edgeGlow, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(edgeGlow, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    glow.start();

    return () => glow.stop();
  }, []);

  const supportsBlur = Platform.OS === 'ios';

  return (
    <View style={styles.container}>
      {/* Luminous gold top edge */}
      <Animated.View style={[styles.topEdge, { opacity: edgeGlow }]} />

      {supportsBlur ? (
        <BlurView intensity={15} tint="dark" style={styles.blurContainer}>
          <View style={styles.contentOverlay}>
            {children}
          </View>
        </BlurView>
      ) : (
        <View style={styles.fallbackContainer}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppColors.glassEdge,
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: AppColors.primary,
    zIndex: 10,
  },
  blurContainer: {
    overflow: 'hidden',
  },
  contentOverlay: {
    backgroundColor: AppColors.sanctumOverlay,
    padding: 20,
  },
  fallbackContainer: {
    backgroundColor: AppColors.glassBackground,
    padding: 20,
  },
});
