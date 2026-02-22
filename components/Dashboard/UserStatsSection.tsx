import HapticPressable from '@/components/HapticPressable';
import { AppColors } from '@/constants/theme';
import { getUserLevelSummary } from '@/lib/utils/leveling';
import { HarmonyStatus, UserStats } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Modal, StyleSheet, Text, View } from 'react-native';

interface UserStatsSectionProps {
  profile: any;
  stats: UserStats | null;
  harmonyStatus: HarmonyStatus | null;
  activeTooltip: 'streak' | 'harmony' | 'routines' | 'level' | null;
  onSetActiveTooltip: (tooltip: 'streak' | 'harmony' | 'routines' | 'level' | null) => void;
  onJourneyFocusPress: () => void;
}

export default function UserStatsSection({
  profile,
  stats,
  harmonyStatus,
  activeTooltip,
  onSetActiveTooltip,
  onJourneyFocusPress,
}: UserStatsSectionProps) {
  const levelSummary = getUserLevelSummary(stats);
  const firstName = profile?.first_name || 'Traveler';
  const soteriaLevel = levelSummary.soteria;

  return (
    <>
      {/* Header Row: Title + Streak/Harmony icons */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{firstName}'s Journey</Text>
        <View style={styles.headerIcons}>
          <HapticPressable
            hapticStyle="selection"
            style={styles.headerStat}
            onPress={() => onSetActiveTooltip(activeTooltip === 'streak' ? null : 'streak')}
            activeOpacity={0.7}
          >
            <Ionicons name="flame" size={16} color={AppColors.primary} />
            <Text style={styles.headerStatValue}>{stats?.current_streak || 0}</Text>
          </HapticPressable>

          <HapticPressable
            hapticStyle="selection"
            style={styles.headerStat}
            onPress={() => onSetActiveTooltip(activeTooltip === 'harmony' ? null : 'harmony')}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles" size={16} color={AppColors.primary} />
            <Text style={styles.headerStatValue}>
              {harmonyStatus?.consecutiveBalancedDays || 0}
            </Text>
          </HapticPressable>
        </View>
      </View>

      {/* Profile Row: Avatar + Soteria Level Progress */}
      <View style={styles.profileRow}>
        {/* Profile Picture */}
        <HapticPressable
          style={styles.avatarContainer}
          onPress={onJourneyFocusPress}
          activeOpacity={0.7}
        >
          <View style={[
            styles.avatar,
            (profile?.role === 'health_team' || profile?.role === 'admin') && styles.avatarHealthTeam
          ]}>
            {profile?.profile_picture_url ? (
              <Image
                source={{ uri: profile.profile_picture_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {firstName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          {/* Journey Focus Badge */}
          {profile?.journey_focus && (
            <View style={[
              styles.journeyBadge,
              { backgroundColor: profile.journey_focus === 'Recovery' ? AppColors.body : AppColors.mind }
            ]}>
              <Ionicons
                name={profile.journey_focus === 'Recovery' ? 'heart' : 'shield-checkmark'}
                size={12}
                color="#FFFFFF"
              />
            </View>
          )}
        </HapticPressable>

        {/* Soteria Level Progress */}
        <HapticPressable
          hapticStyle="selection"
          style={styles.levelSection}
          onPress={() => onSetActiveTooltip(activeTooltip === 'level' ? null : 'level')}
          activeOpacity={0.7}
        >
          <View style={styles.levelHeader}>
            <View style={styles.levelTitleRow}>
              <Ionicons name="trophy" size={16} color={AppColors.primary} />
              <Text style={styles.levelTitle}>Lv.{soteriaLevel.level}</Text>
              <Text style={styles.levelClass}>{soteriaLevel.title}</Text>
            </View>
            <Text style={styles.levelXpText}>
              {soteriaLevel.currentXp}/{soteriaLevel.xpForNextLevel}
            </Text>
          </View>
          <View style={styles.levelBarBg}>
            <View style={[styles.levelBarFill, { width: `${Math.round(soteriaLevel.progress * 100)}%` }]} />
          </View>
        </HapticPressable>
      </View>

      {/* Stat Tooltip Modal */}
      <Modal
        visible={activeTooltip !== null}
        animationType="fade"
        transparent
        onRequestClose={() => onSetActiveTooltip(null)}
      >
        <HapticPressable
          hapticStyle="none"
          style={styles.tooltipOverlay}
          activeOpacity={1}
          onPress={() => onSetActiveTooltip(null)}
        >
          <View style={styles.tooltip}>
            {activeTooltip === 'level' ? (() => {
              return (
                <>
                  <Text style={styles.tooltipLabel}>Soteria Level {soteriaLevel.level}</Text>
                  <Text style={styles.tooltipHighlight}>{soteriaLevel.title}</Text>
                  <View style={styles.tooltipXpBar}>
                    <View style={[styles.tooltipXpFill, { width: `${Math.round(soteriaLevel.progress * 100)}%` }]} />
                  </View>
                  <Text style={styles.tooltipXpText}>{soteriaLevel.currentXp} / {soteriaLevel.xpForNextLevel} XP to next level</Text>
                </>
              );
            })() : (
              <Text style={styles.tooltipText}>
                {activeTooltip === 'streak' &&
                  `Current streak: ${stats?.current_streak || 0} consecutive days with completed routines`}
                {activeTooltip === 'harmony' &&
                  `Balanced days: ${harmonyStatus?.consecutiveBalancedDays || 0}/7 consecutive days with Mind, Body, and Soul routines`}
              </Text>
            )}
            <Text style={styles.tooltipDismiss}>Tap anywhere to dismiss</Text>
          </View>
        </HapticPressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerStatValue: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarHealthTeam: {
    borderWidth: 3,
    borderColor: '#10B981',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.primaryText,
  },
  journeyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AppColors.surface,
  },
  levelSection: {
    flex: 1,
    gap: 6,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  levelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.primary,
  },
  levelClass: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.textSecondary,
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
    backgroundColor: AppColors.primary,
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltip: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: AppColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  tooltipHighlight: {
    fontSize: 24,
    fontWeight: '800',
    color: AppColors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  tooltipXpBar: {
    width: '100%',
    height: 8,
    backgroundColor: AppColors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  tooltipXpFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: AppColors.primary,
  },
  tooltipXpText: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.textTertiary,
    textAlign: 'center',
  },
  tooltipText: {
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  tooltipDismiss: {
    fontSize: 12,
    color: AppColors.textTertiary,
    textAlign: 'center',
    marginTop: 12,
  },
});
