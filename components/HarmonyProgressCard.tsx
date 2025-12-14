import { AppColors } from '@/constants/theme'
import { DailyBalanceRecord, HarmonyStatus } from '@/types'
import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface HarmonyProgressCardProps {
  harmonyStatus: HarmonyStatus
}

// Helper to get day abbreviation from date string
function getDayAbbreviation(dateString: string, isToday: boolean): string {
  if (isToday) return 'Today'
  const date = new Date(dateString + 'T12:00:00') // Add time to avoid timezone issues
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[date.getDay()]
}

export default function HarmonyProgressCard({ harmonyStatus }: HarmonyProgressCardProps) {
  const {
    isInHarmony,
    mindToday,
    bodyToday,
    soulToday,
    isTodayBalanced,
    consecutiveBalancedDays,
    daysUntilHarmony,
    dailyHistory,
  } = harmonyStatus

  // Reverse daily history to show oldest first (left to right)
  const orderedHistory = [...dailyHistory].reverse()

  return (
    <View style={[styles.container, isInHarmony && styles.containerHarmony]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isInHarmony && styles.titleHarmony]}>
          {isInHarmony ? 'In Harmony' : 'Path to Harmony'}
        </Text>
        {!isInHarmony && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={14} color="#F59E0B" />
            <Text style={styles.streakText}>{consecutiveBalancedDays}/7</Text>
          </View>
        )}
      </View>

      {/* Harmony Achieved Message */}
      {isInHarmony && (
        <View style={styles.harmonyAchievedSection}>
          <Ionicons name="sparkles" size={24} color={AppColors.primary} />
          <Text style={styles.harmonyAchievedText}>
            You're in Harmony! Complete at least 1 routine in each category daily to maintain your balance.
          </Text>
        </View>
      )}

      {/* 7-Day Progress Tracker */}
      {!isInHarmony && (
        <View style={styles.progressTrackerSection}>
          <Text style={styles.progressTrackerLabel}>7-Day Balance Streak</Text>
          <View style={styles.progressTracker}>
            {orderedHistory.map((day, index) => (
              <View key={day.date} style={styles.dayColumn}>
                <View style={[
                  styles.dayCircle,
                  day.isBalanced && styles.dayCircleBalanced,
                  day.isToday && !day.isBalanced && styles.dayCircleToday,
                ]}>
                  {day.isBalanced ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : day.isToday ? (
                    <Text style={styles.dayCircleText}>?</Text>
                  ) : (
                    <Ionicons name="close" size={14} color={AppColors.textTertiary} />
                  )}
                </View>
                <Text style={[
                  styles.dayLabel,
                  day.isToday && styles.dayLabelToday
                ]}>
                  {getDayAbbreviation(day.date, day.isToday)}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.progressHint}>
            {daysUntilHarmony > 0
              ? `${daysUntilHarmony} more balanced day${daysUntilHarmony === 1 ? '' : 's'} to reach Harmony`
              : 'Complete today to achieve Harmony!'}
          </Text>
        </View>
      )}

      {/* Today's Balance Status */}
      <View style={styles.todaySection}>
        <View style={styles.todayHeader}>
          <Text style={styles.todayLabel}>Today's Progress</Text>
          {isTodayBalanced ? (
            <View style={styles.balancedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.balancedBadgeText}>Balanced</Text>
            </View>
          ) : (
            <View style={styles.incompleteBadge}>
              <Ionicons name="ellipsis-horizontal" size={14} color={AppColors.textSecondary} />
              <Text style={styles.incompleteBadgeText}>In Progress</Text>
            </View>
          )}
        </View>
        <View style={styles.categoryRow}>
          <View style={styles.categoryItem}>
            <View style={[
              styles.categoryCircle,
              { borderColor: AppColors.mind },
              mindToday >= 1 && { backgroundColor: AppColors.mind }
            ]}>
              {mindToday >= 1 ? (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              ) : (
                <Text style={[styles.categoryCircleText, { color: AppColors.mind }]}>
                  {mindToday}
                </Text>
              )}
            </View>
            <Text style={styles.categoryLabel}>Mind</Text>
          </View>
          <View style={styles.categoryItem}>
            <View style={[
              styles.categoryCircle,
              { borderColor: AppColors.body },
              bodyToday >= 1 && { backgroundColor: AppColors.body }
            ]}>
              {bodyToday >= 1 ? (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              ) : (
                <Text style={[styles.categoryCircleText, { color: AppColors.body }]}>
                  {bodyToday}
                </Text>
              )}
            </View>
            <Text style={styles.categoryLabel}>Body</Text>
          </View>
          <View style={styles.categoryItem}>
            <View style={[
              styles.categoryCircle,
              { borderColor: AppColors.soul },
              soulToday >= 1 && { backgroundColor: AppColors.soul }
            ]}>
              {soulToday >= 1 ? (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              ) : (
                <Text style={[styles.categoryCircleText, { color: AppColors.soul }]}>
                  {soulToday}
                </Text>
              )}
            </View>
            <Text style={styles.categoryLabel}>Soul</Text>
          </View>
        </View>
        {!isTodayBalanced && (
          <Text style={styles.todayHint}>
            Complete 1+ routine in each category to balance today
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  containerHarmony: {
    borderColor: AppColors.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  titleHarmony: {
    color: AppColors.primary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  progressTrackerSection: {
    marginBottom: 16,
  },
  progressTrackerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 12,
  },
  progressTracker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayCircleBalanced: {
    backgroundColor: '#10B981',
  },
  dayCircleToday: {
    backgroundColor: AppColors.surface,
    borderWidth: 2,
    borderColor: AppColors.primary,
  },
  dayCircleText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primary,
  },
  dayLabel: {
    fontSize: 10,
    color: AppColors.textTertiary,
  },
  dayLabelToday: {
    color: AppColors.primary,
    fontWeight: '600',
  },
  progressHint: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  todaySection: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 12,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  balancedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  balancedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  incompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AppColors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  incompleteBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  categoryItem: {
    alignItems: 'center',
    gap: 6,
  },
  categoryCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  categoryCircleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  categoryLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  todayHint: {
    fontSize: 11,
    color: AppColors.textTertiary,
    textAlign: 'center',
    marginTop: 10,
  },
  harmonyAchievedSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  harmonyAchievedText: {
    flex: 1,
    fontSize: 14,
    color: AppColors.textPrimary,
    lineHeight: 20,
  },
})
