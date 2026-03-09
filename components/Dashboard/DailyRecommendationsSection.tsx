import HapticPressable from '@/components/HapticPressable';
import { AppColors } from '@/constants/theme';
import { getCompanionImage } from '@/lib/utils/companion-images';
import { DailyProgress, RoutineCategory } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

interface DailyRecommendationsSectionProps {
  todayProgress: DailyProgress;
  onRecommendationPress: (category: RoutineCategory) => void;
  onBonusRoutinePress?: () => void;
  companionNames?: Record<RoutineCategory, string | null | undefined>;
}

const CATEGORIES: { key: RoutineCategory; field: keyof DailyProgress; color: string }[] = [
  { key: 'Mind', field: 'mind_complete', color: AppColors.mind },
  { key: 'Body', field: 'body_complete', color: AppColors.body },
  { key: 'Soul', field: 'soul_complete', color: AppColors.soul },
];

function AllCompanionsAwakened({ companionNames }: { companionNames?: Record<RoutineCategory, string | null | undefined> }) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const categories: RoutineCategory[] = ['Mind', 'Body', 'Soul'];
  const names = categories.map(c => companionNames?.[c] || c).join(', ');

  return (
    <Animated.View style={[styles.celebrationContainer, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.companionRow}>
        {categories.map((category, i) => {
          const img = getCompanionImage(category, 'Glowing');
          return img ? (
            <React.Fragment key={i}>
              <Image source={img} style={styles.celebrationCompanion} resizeMode="contain" />
            </React.Fragment>
          ) : null;
        })}
      </View>
      <Text style={styles.celebrationTitle}>All Companions Awakened!</Text>
      <Text style={styles.celebrationSubtitle}>{names}</Text>
    </Animated.View>
  );
}

export default function DailyRecommendationsSection({
  todayProgress,
  onRecommendationPress,
  onBonusRoutinePress,
  companionNames,
}: DailyRecommendationsSectionProps): React.ReactElement {
  const incomplete = CATEGORIES.filter(c => !todayProgress[c.field]);
  const allComplete = incomplete.length === 0;

  return (
    <View>
      <Text style={styles.sectionTitle}>Today's Focus</Text>

      {allComplete ? (
        <View>
          <AllCompanionsAwakened companionNames={companionNames} />
          {onBonusRoutinePress && (
            <HapticPressable style={styles.bonusRow} onPress={onBonusRoutinePress} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={20} color={AppColors.primary} />
              <Text style={styles.bonusText}>Do another routine</Text>
              <Ionicons name="chevron-forward" size={16} color={AppColors.primary} />
            </HapticPressable>
          )}
        </View>
      ) : (
        <View style={styles.rows}>
          {incomplete.map(({ key, color }) => (
            <HapticPressable
              key={key}
              style={styles.row}
              onPress={() => onRecommendationPress(key)}
              activeOpacity={0.7}
            >
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={styles.categoryName}>{key}</Text>
              <View style={styles.ctaContainer}>
                <Text style={[styles.ctaText, { color }]}>Awaken {companionNames?.[key] || key}</Text>
                <Ionicons name="chevron-forward" size={16} color={color} />
              </View>
            </HapticPressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 16,
  },
  rows: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    flex: 1,
  },
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  celebrationContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  companionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  celebrationCompanion: {
    width: 56,
    height: 56,
  },
  celebrationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F59E0B',
    textAlign: 'center',
  },
  celebrationSubtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  bonusText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: AppColors.primary,
  },
});
