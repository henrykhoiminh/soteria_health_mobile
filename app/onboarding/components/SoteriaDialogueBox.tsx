import { AppColors } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

interface SoteriaDialogueBoxProps {
  text: string;
  glowPosition?: 'top' | 'bottom';
  isTyping?: boolean;
}

/**
 * Glass Panel with Luminous Edge - Dialogue Box for Soteria's Words
 *
 * Features:
 * - Frosted glass effect using expo-blur (BlurView)
 * - Semi-transparent dark background
 * - Luminous golden edge indicator on the side facing Soteria
 * - All text is italicized for Soteria's mystical voice
 * - Animated glow on the luminous edge
 */
export default function SoteriaDialogueBox({
  text,
  glowPosition = 'top',
  isTyping = false,
}: SoteriaDialogueBoxProps) {
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Animate the luminous edge glow
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [glowAnim]);

  // Interpolate glow intensity
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const glowShadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 16],
  });

  // Build the luminous edge style based on position
  const luminousEdgeStyle = [
    styles.luminousEdge,
    glowPosition === 'top' ? styles.luminousEdgeTop : styles.luminousEdgeBottom,
    {
      opacity: glowOpacity,
      shadowRadius: glowShadowRadius,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Luminous golden edge */}
      <Animated.View style={luminousEdgeStyle} />

      {/* Glass panel with blur effect */}
      {Platform.OS === 'ios' || Platform.OS === 'android' ? (
        <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
          <View style={styles.contentOverlay}>
            <Text style={styles.dialogueText}>
              {text}
              {isTyping && <Text style={styles.cursor}>|</Text>}
            </Text>
          </View>
        </BlurView>
      ) : (
        // Fallback for web - semi-transparent dark background
        <View style={[styles.blurContainer, styles.fallbackBackground]}>
          <View style={styles.contentOverlay}>
            <Text style={styles.dialogueText}>
              {text}
              {isTyping && <Text style={styles.cursor}>|</Text>}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  blurContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    minHeight: 80,
  },
  fallbackBackground: {
    backgroundColor: 'rgba(20, 20, 25, 0.9)',
  },
  contentOverlay: {
    backgroundColor: 'rgba(20, 20, 25, 0.4)', // Additional dark tint
    padding: 20,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogueText: {
    fontSize: 18,
    lineHeight: 30,
    color: '#FFFFFF',
    textAlign: 'center',
    fontStyle: 'italic', // IMPORTANT: All Soteria's dialogue is italicized
    letterSpacing: 0.5,
  },
  cursor: {
    color: AppColors.primary,
    fontWeight: '300',
    fontStyle: 'normal', // Cursor is not italicized
  },
  luminousEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: AppColors.primary,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    elevation: 8,
    zIndex: 10,
  },
  luminousEdgeTop: {
    top: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  luminousEdgeBottom: {
    bottom: 0,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
});
