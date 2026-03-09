import HapticPressable from '@/components/HapticPressable';
import { AppColors } from '@/constants/theme';
import { DailyProgress, RoutineCategory } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface DailyRecommendationsSectionProps {
  todayProgress: DailyProgress;
  onRecommendationPress: (category: RoutineCategory) => void;
  companionNames?: Record<RoutineCategory, string | null | undefined>;
}

const CATEGORIES: { key: RoutineCategory; field: keyof DailyProgress; color: string }[] = [
  { key: 'Mind', field: 'mind_complete', color: AppColors.mind },
  { key: 'Body', field: 'body_complete', color: AppColors.body },
  { key: 'Soul', field: 'soul_complete', color: AppColors.soul },
];

export default function DailyRecommendationsSection({
  todayProgress,
  onRecommendationPress,
  companionNames,
}: DailyRecommendationsSectionProps): React.ReactElement {
  const incomplete = CATEGORIES.filter(c => !todayProgress[c.field]);
  const allComplete = incomplete.length === 0;

  return (
    <View>
      <Text style={styles.sectionTitle}>Today's Focus</Text>

      {allComplete ? (
        <View style={styles.completeContainer}>
          <Ionicons name="checkmark-circle" size={32} color="#10B981" />
          <Text style={styles.completeText}>All companions awakened!</Text>
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
  completeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  completeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
});
