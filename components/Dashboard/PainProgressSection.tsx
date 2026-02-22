import HapticPressable from '@/components/HapticPressable';
import PainProgressChart from '@/components/PainProgressChart';
import { AppColors } from '@/constants/theme';
import { getPainLevelInfo, getPainTrendInfo } from '@/lib/utils/pain-checkin';
import { PainCheckIn, PainStatistics } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface PainProgressSectionProps {
  painStats: PainStatistics;
  painHistory: PainCheckIn[];
  painStatsUpdating: boolean;
  painUpdatePulse: Animated.Value;
  onCheckInPress: () => void;
}

export default function PainProgressSection({
  painStats,
  painHistory,
  painStatsUpdating,
  painUpdatePulse,
  onCheckInPress,
}: PainProgressSectionProps) {
  return (
    <View>
      <View style={styles.painProgressHeader}>
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Pain Progress</Text>
        {painStatsUpdating && (
          <View style={styles.updatingBadge}>
            <ActivityIndicator size="small" color={AppColors.primary} />
            <Text style={styles.updatingText}>Updating...</Text>
          </View>
        )}
      </View>
      <Animated.View style={[styles.painProgressCard, { opacity: painStatsUpdating ? painUpdatePulse : 1 }]}>
        {/* Current Pain Level */}
        <View style={styles.painLevelSection}>
          <View style={styles.painLevelLeft}>
            <Text style={styles.painLevelLabel}>Current Pain</Text>
            <View style={styles.painLevelDisplay}>
              <Text
                style={[
                  styles.painLevelNumber,
                  { color: getPainLevelInfo(painStats.current_pain).color },
                ]}
              >
                {painStats.current_pain}
              </Text>
              <Text
                style={[
                  styles.painLevelText,
                  { color: getPainLevelInfo(painStats.current_pain).color },
                ]}
              >
                {getPainLevelInfo(painStats.current_pain).label}
              </Text>
            </View>
          </View>

          {/* Trend Indicator - Tap to check in */}
          <HapticPressable
            style={styles.trendIndicator}
            onPress={onCheckInPress}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.trendIcon,
                { color: getPainTrendInfo(painStats.trend).color },
              ]}
            >
              {getPainTrendInfo(painStats.trend).icon}
            </Text>
            <Text style={styles.trendText}>
              {getPainTrendInfo(painStats.trend).description}
            </Text>
            <Ionicons
              name="add-circle-outline"
              size={16}
              color={AppColors.textTertiary}
              style={styles.checkInIcon}
            />
          </HapticPressable>
        </View>

        {/* Pain Progress Chart */}
        <PainProgressChart painHistory={painHistory} maxDays={100} />

        {/* Stats Row */}
        <View style={styles.painStatsRow}>
          <View style={styles.painStatItem}>
            <Text style={styles.painStatValue}>
              {painStats.avg_7_days.toFixed(1)}
            </Text>
            <Text style={styles.painStatLabel}>7-Day Avg</Text>
          </View>
          <View style={styles.painStatDivider} />
          <View style={styles.painStatItem}>
            <Text style={styles.painStatValue}>
              {painStats.avg_30_days.toFixed(1)}
            </Text>
            <Text style={styles.painStatLabel}>30-Day Avg</Text>
          </View>
          <View style={styles.painStatDivider} />
          <View style={styles.painStatItem}>
            <Text style={styles.painStatValue}>{painStats.pain_free_days}</Text>
            <Text style={styles.painStatLabel}>Pain-Free Days</Text>
          </View>
        </View>
      </Animated.View>
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
  painProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  updatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppColors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  updatingText: {
    fontSize: 12,
    fontWeight: '500',
    color: AppColors.primary,
  },
  painProgressCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  painLevelSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  painLevelLeft: {
    flex: 1,
  },
  painLevelLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  painLevelDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  painLevelNumber: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  painLevelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendIndicator: {
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  trendIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  trendText: {
    fontSize: 11,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  checkInIcon: {
    marginTop: 6,
  },
  painStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  painStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  painStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  painStatLabel: {
    fontSize: 11,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  painStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: AppColors.border,
  },
});
