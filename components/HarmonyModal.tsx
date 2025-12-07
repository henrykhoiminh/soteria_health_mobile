import { AppColors } from '@/constants/theme'
import { HarmonyStatus } from '@/types'
import { setHarmonyStatusManually } from '@/lib/utils/harmony'
import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import HarmonyProgressCard from './HarmonyProgressCard'

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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={AppColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Main Harmony Card */}
            <HarmonyProgressCard harmonyStatus={harmonyStatus} />

            {/* What is Harmony Section */}
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>What is Harmony?</Text>
              <Text style={styles.infoText}>
                Harmony is achieved when you maintain balance across Mind, Body, and Soul for 7 consecutive days.
                Each day, complete at least 1 routine in each category while keeping all categories within ±1 of each other.
              </Text>
            </View>

            {/* Requirements Section */}
            <View style={styles.requirementsSection}>
              <Text style={styles.requirementsTitle}>Requirements</Text>

              <View style={styles.requirementItem}>
                <View style={[
                  styles.requirementIcon,
                  harmonyStatus.consecutiveBalancedDays >= 7 && styles.requirementIconComplete
                ]}>
                  <Ionicons
                    name={harmonyStatus.consecutiveBalancedDays >= 7 ? 'checkmark' : 'calendar-outline'}
                    size={18}
                    color={harmonyStatus.consecutiveBalancedDays >= 7 ? '#FFFFFF' : AppColors.textSecondary}
                  />
                </View>
                <View style={styles.requirementContent}>
                  <Text style={styles.requirementLabel}>7 Consecutive Balanced Days</Text>
                  <Text style={styles.requirementValue}>
                    {harmonyStatus.consecutiveBalancedDays}/7 days completed
                  </Text>
                </View>
              </View>

              <View style={styles.requirementItem}>
                <View style={[
                  styles.requirementIcon,
                  harmonyStatus.isBalanced && styles.requirementIconComplete
                ]}>
                  <Ionicons
                    name={harmonyStatus.isBalanced ? 'checkmark' : 'scale-outline'}
                    size={18}
                    color={harmonyStatus.isBalanced ? '#FFFFFF' : AppColors.textSecondary}
                  />
                </View>
                <View style={styles.requirementContent}>
                  <Text style={styles.requirementLabel}>Daily Balance</Text>
                  <Text style={styles.requirementValue}>
                    Complete 1+ routine in each category (Mind, Body, Soul) daily
                  </Text>
                </View>
              </View>

              <View style={styles.requirementItem}>
                <View style={[
                  styles.requirementIcon,
                  harmonyStatus.daysUntilCalibrationComplete === 0 && styles.requirementIconComplete
                ]}>
                  <Ionicons
                    name={harmonyStatus.daysUntilCalibrationComplete === 0 ? 'checkmark' : 'time-outline'}
                    size={18}
                    color={harmonyStatus.daysUntilCalibrationComplete === 0 ? '#FFFFFF' : AppColors.textSecondary}
                  />
                </View>
                <View style={styles.requirementContent}>
                  <Text style={styles.requirementLabel}>Calibration Period</Text>
                  <Text style={styles.requirementValue}>
                    {harmonyStatus.daysUntilCalibrationComplete === 0
                      ? 'Completed'
                      : `${harmonyStatus.daysUntilCalibrationComplete} days remaining`}
                  </Text>
                </View>
              </View>
            </View>

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
})
