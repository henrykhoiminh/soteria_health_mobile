import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { playExtractionSound } from '@/lib/utils/audio';

interface CharacterSummoningAnimationProps {
  characterColor: string; // gold, blue, red, or amber hex
  onAnimationComplete: () => void;
  children: React.ReactNode; // The character component to reveal
  dramatic?: boolean; // Extended dramatic sequence for Soteria (7s haptic buildup)
}

/**
 * Mystical summoning animation for character introductions
 *
 * Standard timing (1.8s total):
 * 0ms     → Screen dims
 * 300ms   → Glow appears
 * 500ms   → Sound plays
 * 600ms   → Haptic pulses (4 pulses)
 * 1000ms  → Character appears
 * 1500ms  → Screen brightens
 * 1800ms  → Complete
 *
 * Dramatic timing (9s total - for Soteria):
 * 0ms     → Screen dims to complete black
 * 1000ms  → Slow haptic pulses begin (building tension)
 * 3000ms  → Haptics intensify
 * 5000ms  → Haptics become aggressive
 * 6500ms  → Glow appears, sound plays
 * 7500ms  → Character erupts, haptics stop
 * 8500ms  → Screen brightens
 * 9000ms  → Complete
 */
export default function CharacterSummoningAnimation({
  characterColor,
  onAnimationComplete,
  children,
  dramatic = false,
}: CharacterSummoningAnimationProps) {
  const [showCharacter, setShowCharacter] = useState(false);

  // Animation values
  const screenDim = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0)).current;
  const characterOpacity = useRef(new Animated.Value(0)).current;
  const characterScale = useRef(new Animated.Value(0.5)).current;

  // Haptics tracking
  const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hapticPhaseRef = useRef(0);

  useEffect(() => {
    if (dramatic) {
      startDramaticSequence();
    } else {
      startStandardSequence();
    }

    return () => {
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
      }
    };
  }, []);

  const startDramaticSequence = () => {
    // 0ms: Screen dims to complete black
    Animated.timing(screenDim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // 1000ms: Phase 1 - Slow, ominous heavy pulses (something ancient is stirring)
    setTimeout(() => {
      hapticPhaseRef.current = 1;
      hapticIntervalRef.current = setInterval(() => {
        if (hapticPhaseRef.current === 1) {
          // Deep, heavy pulses with warning notifications
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setTimeout(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }, 100);
        }
      }, 500); // Slow but powerful
    }, 1000);

    // 3000ms: Phase 2 - Intensifying double-tap pattern
    setTimeout(() => {
      hapticPhaseRef.current = 2;
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
      }
      hapticIntervalRef.current = setInterval(() => {
        // Rapid double-tap pattern
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 50);
      }, 300); // Faster interval
    }, 3000);

    // 5000ms: Phase 3 - Aggressive rapid-fire shaking
    setTimeout(() => {
      hapticPhaseRef.current = 3;
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
      }
      // Extremely aggressive - like the device is shaking violently
      hapticIntervalRef.current = setInterval(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 80); // Very fast, aggressive
    }, 5000);

    // 6000ms: Phase 4 - Maximum intensity chaos before eruption
    setTimeout(() => {
      hapticPhaseRef.current = 4;
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
      }
      // Absolute chaos - alternating patterns
      let toggle = true;
      hapticIntervalRef.current = setInterval(() => {
        if (toggle) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        toggle = !toggle;
      }, 60); // Maximum speed
    }, 6000);

    // 6500ms: Glow appears, sound plays - the climax approaches
    setTimeout(() => {
      playExtractionSound();

      Animated.parallel([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 2,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, 6500);

    // 7500ms: Character ERUPTS - haptics stop with explosive finale
    setTimeout(() => {
      // Stop the chaos
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = null;
      }

      // EXPLOSIVE FINALE - rapid burst of heavy impacts
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 30);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 60);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 100);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 200);

      setShowCharacter(true);
      Animated.parallel([
        Animated.timing(characterOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(characterScale, {
            toValue: 1.15,
            duration: 250,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(characterScale, {
            toValue: 1,
            duration: 150,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Fade out glow
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, 7500);

    // 8500ms: Screen brightens
    setTimeout(() => {
      Animated.timing(screenDim, {
        toValue: 0,
        duration: 500,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, 8500);

    // 9000ms: Complete
    setTimeout(() => {
      onAnimationComplete();
    }, 9000);
  };

  const startStandardSequence = () => {
    // 0ms: Screen dims
    Animated.timing(screenDim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // 300ms: Glow appears
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    // 500ms: Sound plays
    setTimeout(() => {
      playExtractionSound();
    }, 500);

    // 600ms: Haptic pulses and glow intensifies
    setTimeout(() => {
      let hapticCount = 0;
      hapticIntervalRef.current = setInterval(() => {
        if (hapticCount < 4) {
          const intensity = hapticCount < 2
            ? Haptics.ImpactFeedbackStyle.Light
            : Haptics.ImpactFeedbackStyle.Medium;
          Haptics.impactAsync(intensity);
          hapticCount++;
        } else if (hapticIntervalRef.current) {
          clearInterval(hapticIntervalRef.current);
        }
      }, 250);

      Animated.parallel([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1.8,
          duration: 400,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, 600);

    // 1000ms: Character appears
    setTimeout(() => {
      setShowCharacter(true);
      Animated.parallel([
        Animated.timing(characterOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(characterScale, {
            toValue: 1.05,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(characterScale, {
            toValue: 1,
            duration: 100,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, 1000);

    // 1500ms: Screen brightens
    setTimeout(() => {
      Animated.timing(screenDim, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, 1500);

    // 1800ms: Complete
    setTimeout(() => {
      onAnimationComplete();
    }, 1800);
  };

  const dimOverlayOpacity = screenDim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dramatic ? 0.95 : 0.7], // More dramatic = darker
  });

  return (
    <View style={styles.container}>
      {showCharacter && (
        <Animated.View
          style={[
            styles.characterContainer,
            {
              opacity: characterOpacity,
              transform: [{ scale: characterScale }],
            },
          ]}
        >
          {children}
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.glowContainer,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
        pointerEvents="none"
      >
        <View
          style={[
            styles.glowOuter,
            { backgroundColor: `${characterColor}33` },
          ]}
        />
        <View
          style={[
            styles.glowMiddle,
            { backgroundColor: `${characterColor}66` },
          ]}
        />
        <View
          style={[
            styles.glowInner,
            {
              backgroundColor: characterColor,
              shadowColor: characterColor,
            },
          ]}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.dimOverlay,
          { opacity: dimOverlayOpacity },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  characterContainer: {
    zIndex: 103,
  },
  glowContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 102,
  },
  glowOuter: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  glowMiddle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  glowInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 15,
  },
  dimOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 101,
  },
});
