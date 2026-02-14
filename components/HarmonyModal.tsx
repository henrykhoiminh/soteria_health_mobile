import { AppColors } from '@/constants/theme'
import { DailyBalanceRecord, HarmonyStatus } from '@/types'
import { setHarmonyStatusManually } from '@/lib/utils/harmony'
import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import HapticPressable from '@/components/HapticPressable'
import HarmonyProgressCard from './HarmonyProgressCard'

// Helper to format date for display
function formatDateForDisplay(dateString: string, isToday: boolean): string {
  if (isToday) return 'Today'
  const date = new Date(dateString + 'T12:00:00')
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }
  return date.toLocaleDateString('en-US', options)
}

interface HarmonyModalProps {
  visible: boolean
  harmonyStatus: HarmonyStatus
  onClose: () => void
  isHealthTeam?: boolean
  userId?: string
  onHarmonyStatusChanged?: () => void
}

export default function HarmonyModal({
  visible,
  harmonyStatus,
  onClose,
  isHealthTeam = false,
  userId,
  onHarmonyStatusChanged,
}: HarmonyModalProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleToggleHarmony = async (newValue: boolean) => {
    if (!userId) return

    setIsUpdating(true)
    try {
      await setHarmonyStatusManually(userId, newValue)
      Alert.alert(
        'Harmony Status Updated',
        newValue
          ? 'You are now in Harmony. Advanced routines are unlocked.'
          : 'Harmony status has been removed.',
        [{ text: 'OK' }]
      )
      onHarmonyStatusChanged?.()
    } catch (error) {
      console.error('Error updating harmony status:', error)
      Alert.alert('Error', 'Failed to update harmony status. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Harmony</Text>
            <HapticPressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={AppColors.textPrimary} />
            </HapticPressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Main Harmony Card */}
            <HarmonyProgressCard harmonyStatus={harmonyStatus} />

            {/* What is Harmony Section */}
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>What is Harmony?</Text>
              <Text style={styles.infoText}>
                Harmony represents a state of balanced wellness across your Mind, Body, and Soul. Achieving Harmony unlocks advanced routines and special features.
              </Text>
            </View>

            {/* How to Achieve Section */}
            <View style={styles.howToSection}>
              <Text style={styles.howToTitle}>How to Achieve Harmony</Text>

              <View style={styles.howToStep}>
                <View style={styles.howToStepNumber}>
                  <Text style={styles.howToStepNumberText}>1</Text>
                </View>
                <View style={styles.howToStepContent}>
                  <Text style={styles.howToStepLabel}>Balance Each Day</Text>
                  <Text style={styles.howToStepDescription}>
                    Complete at least 1 routine in each category (Mind, Body, Soul) every day. A "balanced day" requires all three.
                  </Text>
                  <View style={[
                    styles.howToStepStatus,
                    harmonyStatus.isTodayBalanced && styles.howToStepStatusComplete
                  ]}>
                    <Ionicons
                      name={harmonyStatus.isTodayBalanced ? 'checkmark-circle' : 'ellipsis-horizontal'}
                      size={14}
                      color={harmonyStatus.isTodayBalanced ? '#10B981' : AppColors.textSecondary}
                    />
                    <Text style={[
                      styles.howToStepStatusText,
                      harmonyStatus.isTodayBalanced && styles.howToStepStatusTextComplete
                    ]}>
                      {harmonyStatus.isTodayBalanced
                        ? 'Today is balanced!'
                        : `Today: Mind ${harmonyStatus.mindToday}, Body ${harmonyStatus.bodyToday}, Soul ${harmonyStatus.soulToday}`}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.howToStep}>
                <View style={styles.howToStepNumber}>
                  <Text style={styles.howToStepNumberText}>2</Text>
                </View>
                <View style={styles.howToStepContent}>
                  <Text style={styles.howToStepLabel}>Build Your 7-Day Streak</Text>
                  <Text style={styles.howToStepDescription}>
                    Maintain your balance for 7 consecutive days. Missing a day or category resets your streak.
                  </Text>
                  <View style={[
                    styles.howToStepStatus,
                    harmonyStatus.consecutiveBalancedDays >= 7 && styles.howToStepStatusComplete
                  ]}>
                    <Ionicons
                      name={harmonyStatus.consecutiveBalancedDays >= 7 ? 'checkmark-circle' : 'flame'}
                      size={14}
                      color={harmonyStatus.consecutiveBalancedDays >= 7 ? '#10B981' : '#F59E0B'}
                    />
                    <Text style={[
                      styles.howToStepStatusText,
                      harmonyStatus.consecutiveBalancedDays >= 7 && styles.howToStepStatusTextComplete
                    ]}>
                      {harmonyStatus.consecutiveBalancedDays >= 7
                        ? '7-day streak achieved!'
                        : `${harmonyStatus.consecutiveBalancedDays}/7 consecutive balanced days`}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Daily History Section */}
            {harmonyStatus.dailyHistory.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.historyTitle}>Recent Activity</Text>
                {harmonyStatus.dailyHistory.map((day) => (
                  <View key={day.date} style={styles.historyRow}>
                    <View style={styles.historyDateColumn}>
                      <Text style={[styles.historyDate, day.isToday && styles.historyDateToday]}>
                        {formatDateForDisplay(day.date, day.isToday)}
                      </Text>
                    </View>
                    <View style={styles.historyCounts}>
                      <View style={[styles.historyCountBadge, { backgroundColor: day.mind >= 1 ? AppColors.mind : AppColors.border }]}>
                        <Text style={styles.historyCountText}>{day.mind}</Text>
                      </View>
                      <View style={[styles.historyCountBadge, { backgroundColor: day.body >= 1 ? AppColors.body : AppColors.border }]}>
                        <Text style={styles.historyCountText}>{day.body}</Text>
                      </View>
                      <View style={[styles.historyCountBadge, { backgroundColor: day.soul >= 1 ? AppColors.soul : AppColors.border }]}>
                        <Text style={styles.historyCountText}>{day.soul}</Text>
                      </View>
                    </View>
                    <View style={styles.historyStatus}>
                      {day.isBalanced ? (
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      ) : day.isToday ? (
                        <Ionicons name="ellipsis-horizontal-circle" size={20} color={AppColors.textTertiary} />
                      ) : (
                        <Ionicons name="close-circle" size={20} color={AppColors.textTertiary} />
                      )}
                    </View>
                  </View>
                ))}
                <View style={styles.historyLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: AppColors.mind }]} />
                    <Text style={styles.legendText}>Mind</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: AppColors.body }]} />
                    <Text style={styles.legendText}>Body</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: AppColors.soul }]} />
                    <Text style={styles.legendText}>Soul</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Benefits Section */}
            <View style={styles.benefitsSection}>
              <Text style={styles.benefitsTitle}>Harmony Benefits</Text>

              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Ionicons name="lock-open-outline" size={20} color="#F59E0B" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitLabel}>Advanced Routines</Text>
                  <Text style={styles.benefitDescription}>
                    Unlock premium routines designed for experienced practitioners
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Ionicons name="sparkles-outline" size={20} color="#F59E0B" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitLabel}>Radiant Avatar State</Text>
                  <Text style={styles.benefitDescription}>
                    Your avatars will glow with a special radiant aura
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Ionicons name="trophy-outline" size={20} color="#F59E0B" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitLabel}>Exclusive Milestones</Text>
                  <Text style={styles.benefitDescription}>
                    Earn special harmony-related achievements
                  </Text>
                </View>
              </View>
            </View>

            {/* Tip Section */}
            <View style={styles.tipSection}>
              <Ionicons name="bulb-outline" size={20} color={AppColors.primary} />
              <Text style={styles.tipText}>
                Tip: Start each day with one routine from each category to maintain your balance streak!
              </Text>
            </View>

            {/* Health Team Controls */}
            {isHealthTeam && userId && (
              <View style={styles.healthTeamSection}>
                <View style={styles.healthTeamHeader}>
                  <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                  <Text style={styles.healthTeamTitle}>Health Team Controls</Text>
                </View>
                <View style={styles.healthTeamToggle}>
                  <View style={styles.healthTeamToggleContent}>
                    <Text style={styles.healthTeamToggleLabel}>Harmony Status</Text>
                    <Text style={styles.healthTeamToggleDescription}>
                      Manually override harmony state for testing
                    </Text>
                  </View>
                  {isUpdating ? (
                    <ActivityIndicator size="small" color={AppColors.primary} />
                  ) : (
                    <Switch
                      value={harmonyStatus.isInHarmony}
                      onValueChange={handleToggleHarmony}
                      trackColor={{ false: AppColors.border, true: AppColors.primary }}
                      thumbColor={harmonyStatus.isInHarmony ? '#FFFFFF' : '#F4F3F4'}
                    />
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  infoSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  requirementsSection: {
    marginTop: 20,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  requirementIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requirementIconComplete: {
    backgroundColor: '#10B981',
  },
  requirementContent: {
    flex: 1,
  },
  requirementLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  requirementValue: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  benefitsSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  tipSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 20,
    marginBottom: 40,
    padding: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
  },
  healthTeamSection: {
    marginTop: 20,
    marginBottom: 40,
    padding: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  healthTeamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  healthTeamTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  healthTeamToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
  },
  healthTeamToggleContent: {
    flex: 1,
    marginRight: 16,
  },
  healthTeamToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  healthTeamToggleDescription: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  // How To Achieve Section styles
  howToSection: {
    marginTop: 20,
  },
  howToTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 16,
  },
  howToStep: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  howToStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  howToStepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  howToStepContent: {
    flex: 1,
  },
  howToStepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  howToStepDescription: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  howToStepStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppColors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  howToStepStatusComplete: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  howToStepStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
  howToStepStatusTextComplete: {
    color: '#10B981',
  },
  // History Section styles
  historySection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  historyDateColumn: {
    flex: 1,
  },
  historyDate: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  historyDateToday: {
    color: AppColors.primary,
    fontWeight: '600',
  },
  historyCounts: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 12,
  },
  historyCountBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  historyStatus: {
    width: 24,
    alignItems: 'center',
  },
  historyLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: AppColors.textTertiary,
  },
})
