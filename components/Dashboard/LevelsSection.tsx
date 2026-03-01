import HapticPressable from '@/components/HapticPressable';
import { AppColors } from '@/constants/theme';
import { getCompanionImage } from '@/lib/utils/companion-images';
import { getUserLevelSummary } from '@/lib/utils/leveling';
import { CategoryLevelInfo, RoutineCategory, UserStats } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface LevelsSectionProps {
  stats: UserStats;
  onLevelBadgeTap: (category: RoutineCategory, info: CategoryLevelInfo) => void;
}

export default function LevelsSection({ stats, onLevelBadgeTap }: LevelsSectionProps) {
  const levelSummary = getUserLevelSummary(stats);

  return (
    <View>
      <Text style={styles.sectionTitle}>Companion Stats</Text>
      <View style={styles.levelRows}>
        {([
          { cat: 'Mind' as const, info: levelSummary.mind, color: AppColors.mind, icon: 'bulb-outline' as const },
          { cat: 'Body' as const, info: levelSummary.body, color: AppColors.body, icon: 'body' as const },
          { cat: 'Soul' as const, info: levelSummary.soul, color: AppColors.soul, icon: 'flame-outline' as const },
        ]).map(({ cat, info, color, icon }) => {
          const badgeImage = getCompanionImage(cat);
          return (
          <View key={cat} style={styles.levelRow}>
            {/* Left: Tappable icon badge */}
            <HapticPressable
              hapticStyle="selection"
              style={[styles.levelBadge, { borderColor: color + '40' }]}
              onPress={() => onLevelBadgeTap(cat, info)}
              activeOpacity={0.7}
            >
              {badgeImage ? (
                <Image source={badgeImage} style={styles.levelBadgeImage} resizeMode="cover" />
              ) : (
                <Ionicons name={icon} size={18} color={color} />
              )}
            </HapticPressable>

            {/* Right: Lv + Title + Progress bar */}
            <View style={styles.levelBarSection}>
              <View style={styles.levelBarHeader}>
                <Text style={[styles.levelRowTitle, { color }]}>
                  Lv.{info.level}
                </Text>
                <Text style={styles.levelXpText}>
                  {info.currentXp}/{info.xpForNextLevel}
                </Text>
              </View>
              <View style={styles.levelBarBg}>
                <View style={[styles.levelBarFill, { width: `${Math.round(info.progress * 100)}%`, backgroundColor: color }]} />
              </View>
            </View>
          </View>
          );
        })}
      </View>
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
  levelRows: {
    gap: 10,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: AppColors.surfaceSecondary,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  levelBadgeImage: {
    width: 37,
    height: 37,
    borderRadius: 8,
  },
  levelBarSection: {
    flex: 1,
    gap: 4,
  },
  levelBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  levelRowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  levelXpText: {
    fontSize: 11,
    color: AppColors.textTertiary,
    fontWeight: '500',
  },
  levelBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: AppColors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
