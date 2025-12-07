import { AppColors } from '@/constants/theme'
import { HarmonyStatus } from '@/types'
import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface HarmonyProgressCardProps {
  harmonyStatus: HarmonyStatus
}

export default function HarmonyProgressCard({ harmonyStatus }: HarmonyProgressCardProps) {
  const {
    isInHarmony,
    mind7d,
    body7d,
    soul7d,
    daysUntilHarmony,
    daysUntilCalibrationComplete,
  } = harmonyStatus

  const isCalibrating = daysUntilCalibrationComplete > 0

  return (
    <View style={[styles.container, isInHarmony && styles.containerHarmony]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isInHarmony && styles.titleHarmony]}>
          {isInHarmony ? 'In Harmony' : 'Path to Harmony'}
        </Text>
        {isInHarmony && (
          <View style={styles.unlockedBadge}>
            <Ionicons name="lock-open" size={14} color="#10B981" />
            <Text style={styles.unlockedText}>Advanced Unlocked</Text>
          </View>
        )}
      </View>

      {/* Calibration Notice */}
      {isCalibrating && !isInHarmony && (
        <View style={styles.calibrationNotice}>
          <Ionicons name="time-outline" size={16} color={AppColors.primary} />
          <Text style={styles.calibrationText}>
            Day {8 - daysUntilCalibrationComplete} of 7 calibration period
          </Text>
        </View>
      )}

      {/* Harmony Achieved Message */}
      {isInHarmony && (
        <View style={styles.harmonyAchievedSection}>
          <Ionicons name="sparkles" size={24} color={AppColors.primary} />
          <Text style={styles.harmonyAchievedText}>
            You're in Harmony! Continue to complete at least 1 routine in each category every day to keep your light awakened and living in harmony.
          </Text>
        </View>
      )}

      {/* Days Until Harmony - Simple display */}
      {!isInHarmony && (
        <View style={styles.daysNeededSection}>
          <Text style={styles.daysNeededLabel}>Consecutive Balanced Days Left</Text>
          <Text style={styles.daysNeededValue}>{daysUntilHarmony}</Text>
        </View>
      )}

      {/* Today's Balance Status */}
      <View style={styles.todaySection}>
        <Text style={styles.todayLabel}>Today's Balance</Text>
        <View style={styles.categoryRow}>
          <View style={styles.categoryItem}>
            <View style={[styles.categoryDot, { backgroundColor: AppColors.mind }]} />
            <Text style={styles.categoryLabel}>Mind</Text>
            <Text style={styles.categoryCount}>{mind7d}</Text>
          </View>
          <View style={styles.categoryItem}>
            <View style={[styles.categoryDot, { backgroundColor: AppColors.body }]} />
            <Text style={styles.categoryLabel}>Body</Text>
            <Text style={styles.categoryCount}>{body7d}</Text>
          </View>
          <View style={styles.categoryItem}>
            <View style={[styles.categoryDot, { backgroundColor: AppColors.soul }]} />
            <Text style={styles.categoryLabel}>Soul</Text>
            <Text style={styles.categoryCount}>{soul7d}</Text>
          </View>
        </View>
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
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unlockedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  calibrationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  calibrationText: {
    fontSize: 13,
    color: AppColors.primary,
    fontWeight: '500',
  },
  daysNeededSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
  },
  daysNeededLabel: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  daysNeededValue: {
    fontSize: 48,
    fontWeight: '700',
    color: AppColors.primary,
  },
  todaySection: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 12,
  },
  todayLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  categoryItem: {
    alignItems: 'center',
    gap: 4,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  categoryCount: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.textPrimary,
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
