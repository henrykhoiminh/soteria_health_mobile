import HapticPressable from '@/components/HapticPressable';
import { AppColors } from '@/constants/theme';
import { getDisplayName } from '@/lib/utils/username';
import { ActivityFeedItem } from '@/types';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface FriendActivitySectionProps {
  friendActivity: ActivityFeedItem[];
  onSeeAll: () => void;
  onActivityPress: (routineId: string | undefined) => void;
}

function getTimeAgo(timestamp: string): string {
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
}

export default function FriendActivitySection({
  friendActivity,
  onSeeAll,
  onActivityPress,
}: FriendActivitySectionProps) {
  if (friendActivity.length === 0) return null;

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Friend Activity</Text>
        <HapticPressable onPress={onSeeAll}>
          <Text style={styles.seeAllText}>See All</Text>
        </HapticPressable>
      </View>
      {friendActivity.slice(0, 3).map((activity) => (
        <HapticPressable
          key={activity.id}
          style={styles.activityCard}
          onPress={() => onActivityPress(activity.routineId)}
        >
          <View style={styles.activityAvatar}>
            {activity.user.profile_picture_url ? (
              <Image
                source={{ uri: activity.user.profile_picture_url }}
                style={styles.activityAvatarImage}
              />
            ) : (
              <Text style={styles.activityAvatarText}>
                {activity.user.first_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityText} numberOfLines={2}>
              <Text style={styles.activityUserName}>{getDisplayName(activity.user)}</Text>{' '}
              {activity.message}
            </Text>
            <Text style={styles.activityTime}>{getTimeAgo(activity.timestamp)}</Text>
          </View>
        </HapticPressable>
      ))}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: '600',
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  activityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  activityAvatarImage: {
    width: '100%',
    height: '100%',
  },
  activityAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: AppColors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  activityUserName: {
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 12,
    color: AppColors.textTertiary,
  },
});
