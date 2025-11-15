import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { MilestoneSummary } from '@/types';
import {
  getRarityColor,
  getRarityLabel,
  getMilestoneProgressText,
} from '@/lib/utils/milestones';
import { LinearGradient } from 'expo-linear-gradient';

interface MilestoneCardProps {
  milestone: MilestoneSummary;
  onPress?: () => void;
}

export default function MilestoneCard({ milestone, onPress }: MilestoneCardProps) {
  const rarityColor = getRarityColor(milestone.rarity);
  const rarityLabel = getRarityLabel(milestone.rarity);
  const progressText = getMilestoneProgressText(milestone);
  const isAchieved = milestone.is_achieved;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View
        style={[
          styles.card,
          isAchieved && styles.cardAchieved,
          { borderLeftColor: isAchieved ? rarityColor : AppColors.border },
        ]}
      >
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isAchieved
                ? milestone.icon_color + '20'
                : AppColors.surfaceSecondary,
            },
          ]}
        >
          <Ionicons
            name={milestone.icon_name as any}
            size={32}
            color={isAchieved ? milestone.icon_color : AppColors.textTertiary}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Name and Rarity */}
          <View style={styles.header}>
            <Text
              style={[
                styles.name,
                !isAchieved && styles.nameUnachieved,
              ]}
              numberOfLines={1}
            >
              {milestone.name}
            </Text>
            <View
              style={[
                styles.rarityBadge,
                {
                  backgroundColor: isAchieved ? rarityColor + '15' : AppColors.surfaceSecondary,
                  borderColor: isAchieved ? rarityColor : AppColors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.rarityText,
                  { color: isAchieved ? rarityColor : AppColors.textTertiary },
                ]}
              >
                {rarityLabel}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text
            style={[styles.description, !isAchieved && styles.descriptionUnachieved]}
            numberOfLines={2}
          >
            {milestone.description}
          </Text>

          {/* Progress */}
          {!isAchieved && (
            <View style={styles.progressContainer}>
              {/* Progress bar */}
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${milestone.percentage_complete}%`,
                      backgroundColor: milestone.icon_color,
                    },
                  ]}
                />
              </View>

              {/* Progress text */}
              <Text style={styles.progressText}>{progressText}</Text>
            </View>
          )}

          {/* Achieved date */}
          {isAchieved && milestone.achieved_at && (
            <View style={styles.achievedContainer}>
              <Ionicons name="checkmark-circle" size={16} color={rarityColor} />
              <Text style={[styles.achievedText, { color: rarityColor }]}>
                Achieved {formatDate(milestone.achieved_at)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardAchieved: {
    backgroundColor: AppColors.surfaceSecondary,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  nameUnachieved: {
    color: AppColors.textSecondary,
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  descriptionUnachieved: {
    color: AppColors.textTertiary,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  achievedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  achievedText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
