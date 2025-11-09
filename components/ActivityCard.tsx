import { AppColors } from '@/constants/theme';
import { ActivityFeedItem } from '@/types';
import { getDisplayName } from '@/lib/utils/username';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ActivityCardProps {
  activity: ActivityFeedItem;
  onRoutinePress?: (routineId: string) => void;
  onCirclePress?: (circleId: string) => void;
}

/**
 * Reusable activity card component for displaying user activities
 * Used in both global activity feed (Social tab) and circle activity feeds
 * Matches the format of Friend Activity cards on the dashboard
 */
export default function ActivityCard({
  activity,
  onRoutinePress,
  onCirclePress,
}: ActivityCardProps) {
  const getActivityIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'completed_routine':
        return 'checkmark-circle';
      case 'created_routine':
        return 'add-circle';
      case 'streak_milestone':
        return 'flame';
      case 'joined_circle':
        return 'people';
      case 'left_circle':
        return 'exit-outline';
      case 'shared_routine':
        return 'share-social';
      case 'invited_to_circle':
        return 'person-add';
      case 'removed_from_circle':
        return 'person-remove';
      case 'joined_soteria':
        return 'hand-right';
      default:
        return 'radio-button-on';
    }
  };

  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  };

  const handlePress = () => {
    // If activity has a routine, navigate to it
    if (activity.routineId && onRoutinePress) {
      onRoutinePress(activity.routineId);
    }
    // Otherwise, if it has a circle, navigate to it
    else if (activity.circleId && onCirclePress) {
      onCirclePress(activity.circleId);
    }
  };

  const isInteractive = (activity.routineId && onRoutinePress) || (activity.circleId && onCirclePress);

  const CardContainer = isInteractive ? TouchableOpacity : View;
  const containerProps = isInteractive ? { onPress: handlePress, activeOpacity: 0.7 } : {};

  return (
    <CardContainer style={styles.card} {...containerProps}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={getActivityIcon(activity.activityType)}
          size={20}
          color={AppColors.primary}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.text} numberOfLines={2}>
          <Text style={styles.userName}>{getDisplayName(activity.user)}</Text>{' '}
          {activity.message}
        </Text>
        <Text style={styles.time}>{getTimeAgo(activity.timestamp)}</Text>
      </View>
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    color: AppColors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  userName: {
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    color: AppColors.textTertiary,
  },
});
