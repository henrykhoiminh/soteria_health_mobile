import HapticPressable from '@/components/HapticPressable';
import { AppColors } from '@/constants/theme';
import { getUserLevelSummary } from '@/lib/utils/leveling';
import { HarmonyStatus, UserStats } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface HeaderBackground {
  type: 'solid' | 'gradient';
  color?: string;
  colors?: [string, string, ...string[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

interface DashboardHeaderProps {
  profile: any;
  stats: UserStats | null;
  harmonyStatus: HarmonyStatus | null;
  headerBackground: HeaderBackground;
  activeTooltip: 'streak' | 'harmony' | 'routines' | 'level' | null;
  onSetActiveTooltip: (tooltip: 'streak' | 'harmony' | 'routines' | 'level' | null) => void;
  onJourneyFocusPress: () => void;
  hideStats?: boolean;
}

export default function DashboardHeader({
  profile,
  stats,
  harmonyStatus,
  headerBackground,
  activeTooltip,
  onSetActiveTooltip,
  onJourneyFocusPress,
  hideStats,
}: DashboardHeaderProps) {
  const headerContent = (
    <View style={styles.headerRow}>
      {/* Avatar with Journey Focus Badge */}
      <HapticPressable
        style={styles.avatarContainer}
        onPress={() => profile?.journey_focus && onJourneyFocusPress()}
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
              {profile?.first_name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          )}
        </View>
        {/* Journey Focus Badge (top-right) */}
        {profile?.journey_focus && (
          <View style={[
            styles.journeyBadge,
            { backgroundColor: profile.journey_focus === 'Recovery' ? AppColors.body : AppColors.mind }
          ]}>
            <Ionicons
              name={profile.journey_focus === 'Recovery' ? 'heart' : 'shield-checkmark'}
              size={14}
              color="#FFFFFF"
            />
          </View>
        )}
        {/* Health Team Shield Badge (bottom-right) */}
        {(profile?.role === 'health_team' || profile?.role === 'admin') && (
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
          </View>
        )}
      </HapticPressable>

      {/* Greeting Text */}
      <View style={styles.headerTextContainer}>
        <Text style={styles.greeting}>
          {profile?.role === 'health_team' || profile?.role === 'admin' ? 'Welcome back, ' : 'Hello, '}
          {profile?.first_name || 'there'}
        </Text>

        {/* Stats Row */}
        {!hideStats && (
          <View style={styles.statsRow}>
            {/* Current Streak */}
            <HapticPressable
              hapticStyle="selection"
              style={styles.statItem}
              onPress={() => onSetActiveTooltip(activeTooltip === 'streak' ? null : 'streak')}
              activeOpacity={0.7}
            >
              <Ionicons name="flame" size={16} color={AppColors.primary} />
              <Text style={styles.statValue}>{stats?.current_streak || 0}</Text>
            </HapticPressable>

            <View style={styles.statDivider} />

            {/* Harmony Streak */}
            <HapticPressable
              hapticStyle="selection"
              style={styles.statItem}
              onPress={() => onSetActiveTooltip(activeTooltip === 'harmony' ? null : 'harmony')}
              activeOpacity={0.7}
            >
              <Ionicons name="sparkles" size={16} color={AppColors.primary} />
              <Text style={styles.statValue}>
                {harmonyStatus?.consecutiveBalancedDays || 0}
              </Text>
            </HapticPressable>

            <View style={styles.statDivider} />

            {/* Soteria Level */}
            <HapticPressable
              hapticStyle="selection"
              style={styles.statItem}
              onPress={() => onSetActiveTooltip(activeTooltip === 'level' ? null : 'level')}
              activeOpacity={0.7}
            >
              <Ionicons name="trophy" size={16} color={AppColors.primary} />
              <Text style={styles.statValue}>Lv.{getUserLevelSummary(stats).soteria.level}</Text>
            </HapticPressable>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <>
      {/* Dynamic Header Background - Solid or Gradient based on completion */}
      {headerBackground.type === 'gradient' && headerBackground.colors ? (
        <LinearGradient
          colors={headerBackground.colors}
          start={headerBackground.start}
          end={headerBackground.end}
          style={styles.header}
        >
          {headerContent}
        </LinearGradient>
      ) : (
        <View style={[styles.header, { backgroundColor: headerBackground.color }]}>
          {headerContent}
        </View>
      )}

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
              const levelSummary = getUserLevelSummary(stats);
              const s = levelSummary.soteria;
              return (
                <>
                  <Text style={styles.tooltipTitle}>Soteria Level {s.level}</Text>
                  <Text style={styles.tooltipClass}>{s.title}</Text>
                  <View style={styles.tooltipXpBar}>
                    <View style={[styles.tooltipXpFill, { width: `${Math.round(s.progress * 100)}%` }]} />
                  </View>
                  <Text style={styles.tooltipXpText}>{s.currentXp} / {s.xpForNextLevel} XP to next level</Text>
                </>
              );
            })() : (
              <Text style={styles.tooltipText}>
                {activeTooltip === 'streak' &&
                  `Current streak: ${stats?.current_streak || 0} consecutive days with completed routines`}
                {activeTooltip === 'harmony' &&
                  `Balanced days: ${harmonyStatus?.consecutiveBalancedDays || 0}/7 consecutive days with Mind, Body, and Soul routines`}
                {activeTooltip === 'routines' &&
                  `Total routines completed: ${stats?.total_routines || 0}. Tap to view history.`}
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
  header: {
    padding: 24,
    paddingTop: 100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarHealthTeam: {
    borderWidth: 3,
    borderColor: '#10B981',
  },
  journeyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AppColors.surface,
  },
  shieldBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AppColors.surface,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: AppColors.border,
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
  tooltipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  tooltipClass: {
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
