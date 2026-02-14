import { AppColors } from '@/constants/theme';
import { Routine } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import HapticPressable from '@/components/HapticPressable';
import RoutineAuthorBadge from '@/components/RoutineAuthorBadge';

interface RoutineCardProps {
  routine: Routine;
  onPress: () => void;
  onSaveToggle?: () => void;
  isOwner?: boolean;
  onTogglePublic?: () => void;
  compact?: boolean;
  isInHarmony?: boolean;
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'Mind':
      return AppColors.mind;
    case 'Body':
      return AppColors.body;
    case 'Soul':
      return AppColors.soul;
    default:
      return AppColors.primary;
  }
}

export default function RoutineCard({
  routine,
  onPress,
  onSaveToggle,
  isOwner,
  onTogglePublic,
  compact,
  isInHarmony = false,
}: RoutineCardProps) {
  const router = useRouter();
  const isLocked = routine.is_advanced && !isInHarmony;

  const handlePress = () => {
    if (isLocked) {
      Alert.alert(
        'Harmony Required',
        'This is an Advanced routine that requires Harmony to access. Achieve Harmony by completing balanced routines (Mind, Body, and Soul) for 7 consecutive days.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    onPress();
  };

  return (
    <HapticPressable
      style={[
        styles.routineCard,
        compact && styles.routineCardCompact,
        isLocked && styles.routineCardLocked,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Locked Overlay for Advanced Routines */}
      {isLocked && (
        <View style={styles.lockedOverlay}>
          <View style={styles.lockedIconContainer}>
            <Ionicons name="lock-closed" size={32} color="#FFFFFF" />
          </View>
        </View>
      )}

      {/* Header with badges */}
      <View style={styles.routineHeader}>
        <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(routine.category) }]} />
        <Text style={[styles.routineName, isLocked && styles.routineNameLocked]} numberOfLines={1}>
          {routine.name}
        </Text>

        {/* Other Badges */}
        {routine.badge_popular && (
          <View style={styles.badgePopular}>
            <Ionicons name="flame" size={14} color="#FF6B35" />
            <Text style={styles.badgePopularText}>Popular</Text>
          </View>
        )}
        {routine.badge_trending && (
          <View style={styles.badgeTrending}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={styles.badgeTrendingText}>Trending</Text>
          </View>
        )}
        {routine.badge_new && (
          <View style={styles.badgeNew}>
            <Ionicons name="sparkles" size={14} color="#4A90E2" />
            <Text style={styles.badgeNewText}>New</Text>
          </View>
        )}
      </View>

      {/* Source Attribution - Clone & Customize feature */}
      {!compact && routine.source_routine_name && routine.source_routine_id && (
        <HapticPressable
          style={styles.sourceLink}
          onPress={(e) => {
            e.stopPropagation();
            router.push(`/routines/${routine.source_routine_id}`);
          }}
        >
          <Text style={styles.sourceLinkText}>
            Based on {routine.source_routine_name}
          </Text>
        </HapticPressable>
      )}

      {/* Description */}
      {!compact && (
        <Text style={styles.routineDescription} numberOfLines={2}>
          {routine.description}
        </Text>
      )}

      {/* Author Badge */}
      {!compact && (
        <View style={styles.authorBadgeContainer}>
          <RoutineAuthorBadge
            authorType={routine.author_type}
            officialAuthor={routine.official_author}
            creatorUsername={routine.creator_username}
            creatorAvatar={routine.creator_avatar}
            creatorName={routine.creator_name}
            size="small"
            showAvatar={true}
          />
        </View>
      )}

      {/* Footer */}
      <View style={styles.routineFooter}>
        <View style={styles.routineDetails}>
          <Text style={styles.routineDetailText}>
            {routine.duration_minutes} min • {routine.difficulty}
          </Text>
        </View>

        <View style={styles.routineMetrics}>
          {/* Completion Count */}
          <View style={styles.metric}>
            <Ionicons name="checkmark-circle-outline" size={16} color={AppColors.textTertiary} />
            <Text style={styles.metricText}>{routine.completion_count}</Text>
          </View>

          {/* Save Count */}
          <View style={styles.metric}>
            <Ionicons name="bookmark-outline" size={16} color={AppColors.textTertiary} />
            <Text style={styles.metricText}>{routine.save_count || 0}</Text>
          </View>
        </View>

        {/* Save/Public Toggle */}
        {isOwner && onTogglePublic ? (
          <HapticPressable
            style={styles.saveButton}
            hapticStyle="selection"
            onPress={(e) => {
              e.stopPropagation();
              onTogglePublic();
            }}
          >
            <Ionicons
              name={routine.is_public ? 'globe' : 'lock-closed'}
              size={20}
              color={routine.is_public ? AppColors.primary : AppColors.textSecondary}
            />
          </HapticPressable>
        ) : onSaveToggle ? (
          <HapticPressable
            style={styles.saveButton}
            hapticStyle="selection"
            onPress={(e) => {
              e.stopPropagation();
              onSaveToggle();
            }}
          >
            <Ionicons
              name={routine.is_saved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={routine.is_saved ? AppColors.primary : AppColors.textSecondary}
            />
          </HapticPressable>
        ) : null}
      </View>
    </HapticPressable>
  );
}

const styles = StyleSheet.create({
  routineCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  routineCardCompact: {
    padding: 10,
    marginBottom: 8,
  },
  routineCardLocked: {
    opacity: 0.85,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
  },
  lockedIconContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.85)',
    borderRadius: 50,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routineName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  routineNameLocked: {
    color: AppColors.textSecondary,
  },
  badgePopular: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgePopularText: {
    color: '#FF6B35',
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTrending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeTrendingText: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '600',
  },
  badgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeNewText: {
    color: '#4A90E2',
    fontSize: 11,
    fontWeight: '600',
  },
  sourceLink: {
    marginBottom: 6,
  },
  sourceLinkText: {
    fontSize: 12,
    color: AppColors.textTertiary,
    fontStyle: 'italic',
  },
  routineDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  authorBadgeContainer: {
    marginBottom: 10,
  },
  routineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routineDetails: {
    flex: 1,
  },
  routineDetailText: {
    fontSize: 13,
    color: AppColors.textTertiary,
  },
  routineMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
  saveButton: {
    padding: 4,
  },
});
