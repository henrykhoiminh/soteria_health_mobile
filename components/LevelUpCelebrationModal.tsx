import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import HapticPressable from '@/components/HapticPressable';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { LevelUpInfo, RoutineCategory } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';
import { getCompanionImage } from '@/lib/utils/companion-images';

interface LevelUpCelebrationModalProps {
  visible: boolean;
  levelUp: LevelUpInfo;
  onContinue: () => void;
}

const { width, height } = Dimensions.get('window');

const getCategoryColor = (category: 'soteria' | RoutineCategory): string => {
  switch (category) {
    case 'Mind': return AppColors.mind;
    case 'Body': return AppColors.body;
    case 'Soul': return AppColors.soul;
    case 'soteria': return AppColors.primary;
  }
};

const getCategoryLabel = (category: 'soteria' | RoutineCategory): string => {
  switch (category) {
    case 'soteria': return 'Soteria Level';
    default: return `${category} Level`;
  }
};

export default function LevelUpCelebrationModal({
  visible,
  levelUp,
  onContinue,
}: LevelUpCelebrationModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const levelScaleAnim = useRef(new Animated.Value(0.5)).current;
  const starAnimations = useRef(
    Array.from({ length: 16 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      levelScaleAnim.setValue(0.5);
      starAnimations.forEach((anim) => anim.setValue(0));

      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Bounce the level number
      Animated.spring(levelScaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 50,
        delay: 400,
        useNativeDriver: true,
      }).start();

      // Animate particles
      const loops = starAnimations.map((anim, index) => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.delay(index * 80),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000 + Math.random() * 1000,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
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
        loops.forEach(loop => loop.stop());
      };
    }
  }, [visible]);

  if (!visible) return null;

  const color = getCategoryColor(levelUp.category);

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: fadeAnim },
      ]}
    >
      {/* Animated particles */}
      {starAnimations.map((anim, index) => {
        const randomX = Math.random() * width;
        const randomY = Math.random() * height * 0.6;
        const randomSize = 10 + Math.random() * 18;

        return (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: randomX,
                top: randomY,
                width: randomSize,
                height: randomSize,
                opacity: anim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 1, 0],
                }),
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -120],
                    }),
                  },
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 1, 0.5],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="star" size={randomSize} color={color} />
          </Animated.View>
        );
      })}

      {/* Main card */}
      <Animated.View
        style={[
          styles.cardContainer,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <LinearGradient
          colors={[AppColors.surface, AppColors.surfaceSecondary]}
          style={styles.card}
        >
          {/* Category badge */}
          <View style={[styles.categoryBadge, { backgroundColor: color + '20', borderColor: color }]}>
            <Text style={[styles.categoryBadgeText, { color }]}>
              {getCategoryLabel(levelUp.category)}
            </Text>
          </View>

          {/* Companion image or fallback icon */}
          {levelUp.category !== 'soteria' ? (
            <View style={[styles.companionContainer, { shadowColor: color }]}>
              <Image
                source={getCompanionImage(levelUp.category as RoutineCategory, 'Radiant')!}
                style={styles.companionImage}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
              <Ionicons
                name="trophy"
                size={56}
                color={color}
              />
            </View>
          )}

          {/* Title */}
          <Text style={styles.title}>Level Up!</Text>

          {/* Level number with bounce */}
          <Animated.Text
            style={[
              styles.levelNumber,
              { color, transform: [{ scale: levelScaleAnim }] },
            ]}
          >
            Lv.{levelUp.newLevel}
          </Animated.Text>

          {/* New title */}
          <Text style={styles.newTitle}>{levelUp.newTitle}</Text>

          {/* XP progress hint */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { backgroundColor: color, width: '0%' }]} />
            </View>
            <Text style={styles.progressHint}>New journey begins</Text>
          </View>

          {/* Continue button */}
          <HapticPressable
            style={[styles.continueButton, { backgroundColor: color }]}
            onPress={onContinue}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.continueButtonText,
              { color: levelUp.category === 'soteria' ? AppColors.primaryText : '#FFFFFF' },
            ]}>
              Continue
            </Text>
          </HapticPressable>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
  },
  cardContainer: {
    width: width * 0.85,
    maxWidth: 400,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AppColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  categoryBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  companionContainer: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  companionImage: {
    width: 130,
    height: 130,
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  levelNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  newTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 28,
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: AppColors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressHint: {
    fontSize: 12,
    color: AppColors.textTertiary,
  },
  continueButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
