import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { AppColors } from '@/constants/theme';

interface NarrativeTextProps {
  lines: string[];
  speed?: 'slow' | 'medium' | 'fast';
  onComplete?: () => void;
  autoAdvance?: boolean;
  style?: object;
}

export default function NarrativeText({
  lines,
  speed = 'medium',
  onComplete,
  autoAdvance = false,
  style,
}: NarrativeTextProps) {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [allRevealed, setAllRevealed] = useState(false);
  const fadeAnims = useRef<Animated.Value[]>(lines.map(() => new Animated.Value(0))).current;

  // Get delay between lines based on speed
  const getDelay = () => {
    switch (speed) {
      case 'slow':
        return 1500;
      case 'fast':
        return 600;
      case 'medium':
      default:
        return 1000;
    }
  };

  useEffect(() => {
    if (visibleLines < lines.length) {
      // Fade in the current line
      Animated.timing(fadeAnims[visibleLines], {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      if (autoAdvance) {
        // Auto-advance to next line
        const timer = setTimeout(() => {
          setVisibleLines(prev => prev + 1);
        }, getDelay());

        return () => clearTimeout(timer);
      }
    } else if (visibleLines === lines.length && !allRevealed) {
      setAllRevealed(true);
      onComplete?.();
    }
  }, [visibleLines, lines.length, autoAdvance]);

  // Reveal next line on tap (when not auto-advancing)
  const handleTap = () => {
    if (!autoAdvance && visibleLines < lines.length) {
      setVisibleLines(prev => prev + 1);
    }
  };

  // Reveal all lines at once
  const revealAll = () => {
    lines.forEach((_, index) => {
      Animated.timing(fadeAnims[index], {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
    setVisibleLines(lines.length);
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleTap}
      onLongPress={revealAll}
      style={[styles.container, style]}
    >
      {lines.map((line, index) => (
        <Animated.Text
          key={index}
          style={[
            styles.line,
            {
              opacity: index <= visibleLines ? fadeAnims[index] : 0,
            },
          ]}
        >
          {line}
        </Animated.Text>
      ))}

      {/* Tap hint */}
      {!autoAdvance && visibleLines < lines.length && (
        <Text style={styles.tapHint}>Tap to continue</Text>
      )}
    </TouchableOpacity>
  );
}

// Simple version that just displays text with consistent styling
export function NarrativeTextSimple({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <Text style={[styles.simpleText, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  line: {
    fontSize: 18,
    lineHeight: 28,
    color: AppColors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  tapHint: {
    fontSize: 12,
    color: AppColors.textTertiary,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  simpleText: {
    fontSize: 18,
    lineHeight: 28,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
});
