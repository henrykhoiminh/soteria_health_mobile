import { supabase } from '../supabase/client';
import {
  MilestoneSummary,
  UncelebratedMilestone,
  MilestoneCategory,
  MilestoneRarity,
} from '@/types';

/**
 * Get all milestones for a user with progress tracking
 */
export async function getUserMilestones(
  userId: string
): Promise<MilestoneSummary[]> {
  const { data, error } = await supabase.rpc('get_user_milestones_summary', {
    target_user_id: userId,
  });

  if (error) {
    console.error('Error fetching user milestones:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get milestones that haven't been celebrated yet
 */
export async function getUncelebratedMilestones(
  userId: string
): Promise<UncelebratedMilestone[]> {
  const { data, error } = await supabase.rpc('get_uncelebrated_milestones', {
    target_user_id: userId,
  });

  if (error) {
    console.error('Error fetching uncelebrated milestones:', error);
    throw error;
  }

  return data || [];
}

/**
 * Mark a milestone as celebrated (user has seen the modal)
 */
export async function markMilestoneCelebrated(
  userId: string,
  milestoneId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('mark_milestone_celebrated', {
    target_user_id: userId,
    target_milestone_id: milestoneId,
  });

  if (error) {
    console.error('Error marking milestone as celebrated:', error);
    throw error;
  }

  return data || false;
}

/**
 * Manually trigger milestone check (useful after major events)
 */
export async function checkMilestones(userId: string): Promise<void> {
  const { error } = await supabase.rpc('check_and_award_milestones', {
    target_user_id: userId,
  });

  if (error) {
    console.error('Error checking milestones:', error);
    throw error;
  }
}

/**
 * Get milestones filtered by category
 */
export function getMilestonesByCategory(
  milestones: MilestoneSummary[],
  category: MilestoneCategory
): MilestoneSummary[] {
  return milestones.filter((m) => m.category === category);
}

/**
 * Get only achieved milestones
 */
export function getAchievedMilestones(
  milestones: MilestoneSummary[]
): MilestoneSummary[] {
  return milestones.filter((m) => m.is_achieved);
}

/**
 * Get milestones in progress (not achieved but has some progress)
 */
export function getInProgressMilestones(
  milestones: MilestoneSummary[]
): MilestoneSummary[] {
  return milestones.filter((m) => !m.is_achieved && m.current_progress > 0);
}

/**
 * Get upcoming milestones (no progress yet)
 */
export function getUpcomingMilestones(
  milestones: MilestoneSummary[]
): MilestoneSummary[] {
  return milestones.filter((m) => !m.is_achieved && m.current_progress === 0);
}

/**
 * Get milestone completion statistics
 */
export function getMilestoneStats(milestones: MilestoneSummary[]) {
  const total = milestones.length;
  const achieved = getAchievedMilestones(milestones).length;
  const inProgress = getInProgressMilestones(milestones).length;
  const upcoming = getUpcomingMilestones(milestones).length;

  return {
    total,
    achieved,
    inProgress,
    upcoming,
    completionPercentage: total > 0 ? Math.round((achieved / total) * 100) : 0,
  };
}

/**
 * Get rarity color for UI styling
 */
export function getRarityColor(rarity: MilestoneRarity): string {
  switch (rarity) {
    case 'common':
      return '#9CA3AF'; // Gray
    case 'rare':
      return '#3B82F6'; // Blue
    case 'epic':
      return '#8B5CF6'; // Purple
    case 'legendary':
      return '#F59E0B'; // Gold
    default:
      return '#9CA3AF';
  }
}

/**
 * Get rarity display name
 */
export function getRarityLabel(rarity: MilestoneRarity): string {
  switch (rarity) {
    case 'common':
      return 'Common';
    case 'rare':
      return 'Rare';
    case 'epic':
      return 'Epic';
    case 'legendary':
      return 'Legendary';
    default:
      return 'Common';
  }
}

/**
 * Get category display name
 */
export function getCategoryLabel(category: MilestoneCategory): string {
  switch (category) {
    case 'streak':
      return 'Streaks';
    case 'completion':
      return 'Completions';
    case 'balance':
      return 'Balance';
    case 'specialization':
      return 'Specialization';
    case 'pain':
      return 'Pain Tracking';
    case 'journey':
      return 'Journey';
    case 'social':
      return 'Social';
    case 'consistency':
      return 'Consistency';
    default:
      return 'Milestones';
  }
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: MilestoneCategory): string {
  switch (category) {
    case 'streak':
      return 'flame';
    case 'completion':
      return 'checkmark-done-circle';
    case 'balance':
      return 'infinite';
    case 'specialization':
      return 'star';
    case 'pain':
      return 'medical';
    case 'journey':
      return 'map';
    case 'social':
      return 'people';
    case 'consistency':
      return 'calendar';
    default:
      return 'trophy';
  }
}

/**
 * Get milestone progress text (e.g., "7/30 days")
 */
export function getMilestoneProgressText(milestone: MilestoneSummary): string {
  const { current_progress, threshold, threshold_type } = milestone;

  switch (threshold_type) {
    case 'count':
      return `${current_progress}/${threshold}`;
    case 'days':
      return `${current_progress}/${threshold} days`;
    case 'percentage':
      return `${current_progress}/${threshold}%`;
    case 'boolean':
      return current_progress >= threshold ? 'Complete' : 'Incomplete';
    default:
      return `${current_progress}/${threshold}`;
  }
}

/**
 * Sort milestones for display (achieved first, then by progress, then by rarity)
 */
export function sortMilestonesForDisplay(
  milestones: MilestoneSummary[]
): MilestoneSummary[] {
  const rarityWeight = {
    legendary: 4,
    epic: 3,
    rare: 2,
    common: 1,
  };

  return [...milestones].sort((a, b) => {
    // Achieved first
    if (a.is_achieved !== b.is_achieved) {
      return a.is_achieved ? -1 : 1;
    }

    // Then by progress percentage
    if (a.percentage_complete !== b.percentage_complete) {
      return b.percentage_complete - a.percentage_complete;
    }

    // Then by rarity
    return rarityWeight[b.rarity] - rarityWeight[a.rarity];
  });
}

/**
 * Group milestones by category for organized display
 */
export function groupMilestonesByCategory(
  milestones: MilestoneSummary[]
): Record<MilestoneCategory, MilestoneSummary[]> {
  const groups: Record<string, MilestoneSummary[]> = {};

  milestones.forEach((milestone) => {
    if (!groups[milestone.category]) {
      groups[milestone.category] = [];
    }
    groups[milestone.category].push(milestone);
  });

  return groups as Record<MilestoneCategory, MilestoneSummary[]>;
}

/**
 * Get next milestone to achieve (closest to completion)
 */
export function getNextMilestone(
  milestones: MilestoneSummary[]
): MilestoneSummary | null {
  const unachieved = milestones.filter((m) => !m.is_achieved);

  if (unachieved.length === 0) return null;

  // Find the one closest to completion
  return unachieved.reduce((closest, current) => {
    return current.percentage_complete > closest.percentage_complete
      ? current
      : closest;
  });
}

/**
 * Share milestone to activity feed
 */
export async function shareMilestoneToActivity(
  userId: string,
  milestoneId: string,
  milestoneName: string
): Promise<void> {
  try {
    // Create activity feed entry
    const { error: activityError } = await supabase
      .from('friend_activity')
      .insert({
        user_id: userId,
        activity_type: 'streak_milestone', // Using existing type for now
        activity_data: {
          milestone_id: milestoneId,
          milestone_name: milestoneName,
        },
      });

    if (activityError) throw activityError;

    // Mark milestone as shared
    const { error: updateError } = await supabase
      .from('user_milestones')
      .update({ shared_to_activity: true })
      .eq('user_id', userId)
      .eq('milestone_id', milestoneId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error sharing milestone:', error);
    throw error;
  }
}
