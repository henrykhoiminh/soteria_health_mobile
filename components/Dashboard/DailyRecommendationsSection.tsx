import HapticPressable from '@/components/HapticPressable';
import { AppColors } from '@/constants/theme';
import { DailyProgress, RoutineCategory } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface DailyRecommendationsSectionProps {
  todayProgress: DailyProgress;
  onRecommendationPress: (category: RoutineCategory) => void;
  onBonusRoutinePress?: (category: RoutineCategory) => void;
  onHarmonyPress?: () => void;
  bonusCategory?: RoutineCategory;
  bonusMessage?: string;
  bonusSubtitle?: string;
  companionNames?: Record<RoutineCategory, string | null | undefined>;
}

const CATEGORIES: { key: RoutineCategory; field: keyof DailyProgress; color: string }[] = [
  { key: 'Mind', field: 'mind_complete', color: AppColors.mind },
  { key: 'Body', field: 'body_complete', color: AppColors.body },
  { key: 'Soul', field: 'soul_complete', color: AppColors.soul },
];

function AllCompanionsAwakened({ onHarmonyPress }: { onHarmonyPress?: () => void }) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.rows, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.celebrationTitle}>All Companions Awakened!</Text>
      {onHarmonyPress && (
        <HapticPressable style={styles.row} onPress={onHarmonyPress} activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={14} color="#F59E0B" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.rowPrimaryText}>Check your Harmony status</Text>
            <Text style={styles.rowSubtext}>See how your Mind, Body & Soul align</Text>
          </View>
          <View style={styles.ctaContainer}>
            <Text style={[styles.ctaText, { color: '#F59E0B' }]}>Go</Text>
            <Ionicons name="chevron-forward" size={16} color="#F59E0B" />
          </View>
        </HapticPressable>
      )}
    </Animated.View>
  );
}

export default function DailyRecommendationsSection({
  todayProgress,
  onRecommendationPress,
  onBonusRoutinePress,
  onHarmonyPress,
  bonusCategory,
  bonusMessage,
  bonusSubtitle,
  companionNames,
}: DailyRecommendationsSectionProps): React.ReactElement {
  const incomplete = CATEGORIES.filter(c => !todayProgress[c.field]);
  const allComplete = incomplete.length === 0;
  const bonusCategoryColor = bonusCategory ? CATEGORIES.find(c => c.key === bonusCategory)?.color ?? AppColors.primary : AppColors.primary;

  return (
    <View>
      <Text style={styles.sectionTitle}>Today's Focus</Text>

      {allComplete ? (
        <View>
          <AllCompanionsAwakened onHarmonyPress={onHarmonyPress} />
          {onBonusRoutinePress && bonusCategory && (
            <HapticPressable
              style={styles.row}
              onPress={() => onBonusRoutinePress(bonusCategory)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <View style={[styles.dot, { backgroundColor: bonusCategoryColor }]} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.rowPrimaryText}>{bonusMessage || `Continue with ${bonusCategory}`}</Text>
                {bonusSubtitle ? <Text style={styles.rowSubtext}>{bonusSubtitle}</Text> : null}
              </View>
              <View style={styles.ctaContainer}>
                <Text style={[styles.ctaText, { color: bonusCategoryColor }]}>Go</Text>
                <Ionicons name="chevron-forward" size={16} color={bonusCategoryColor} />
              </View>
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
              <View style={styles.iconContainer}>
                <View style={[styles.dot, { backgroundColor: color }]} />
              </View>
              <Text style={[styles.rowPrimaryText, { flex: 1 }]}>{key}</Text>
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
  iconContainer: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textContainer: {
    flex: 1,
  },
  rowPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  rowSubtext: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginTop: 2,
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
  celebrationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 4,
  },
});
